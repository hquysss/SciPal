'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { postPracticeSync } from '@/features/lessons/practiceApi';
import { clearPacks } from '../../lib/pwa/practicePacks';
import { flushPractice, PENDING_CHANGED, pendingFor, PRACTICE_SYNCED, type SyncResult } from '../../lib/pwa/pendingPractice';
import { createBrowserClient } from '../../lib/supabase';

/** Sends practice answers made offline when the connection returns, and says how many wait and what the server granted. */
export function PendingSync() {
  const { t } = useLanguage();
  const [waiting, setWaiting] = useState(0);
  const [done, setDone] = useState<{ synced: number; xp: number } | null>(null);

  // One sync at a time: answers queued meanwhile go out with the next run.
  const running = useRef(false);
  const sync = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      setWaiting(pendingFor(userId).length);
      if (!navigator.onLine || pendingFor(userId).length === 0) return;
      const result = await flushPractice(userId, (attempts) => postPracticeSync(attempts, session.access_token));
      setWaiting(pendingFor(userId).length);
      if (result.synced > 0) {
        window.dispatchEvent(new CustomEvent<SyncResult[]>(PRACTICE_SYNCED, { detail: result.results }));
        setDone(result);
      }
    } catch {
      // Not signed in or storage blocked: nothing to send, nothing to tell.
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    void sync();
    window.addEventListener('online', sync);
    window.addEventListener(PENDING_CHANGED, sync);
    let unsubscribe = () => {};
    try {
      // Offline packs hold answers: they leave the device with the account.
      const { data } = createBrowserClient().auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') clearPacks();
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // No auth client (tests, missing config): nothing to watch.
    }
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener(PENDING_CHANGED, sync);
      unsubscribe();
    };
  }, [sync]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(null), 8000);
    return () => clearTimeout(timer);
  }, [done]);

  const text = done
    ? t({
        vi: `Đã đồng bộ ${done.synced} câu, +${done.xp} XP (theo máy chủ).`,
        en: `Synced ${done.synced} ${done.synced === 1 ? 'answer' : 'answers'}, +${done.xp} XP (from the server).`,
      })
    : waiting > 0
      ? t({ vi: `${waiting} câu đang chờ đồng bộ.`, en: `${waiting} ${waiting === 1 ? 'answer' : 'answers'} waiting to sync.` })
      : null;
  if (!text) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 border-b border-line bg-surface px-4 py-2 text-center text-sm font-semibold text-ink">
      <CloudUpload aria-hidden="true" className="h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}
