'use client';

import { useCallback, useEffect, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { postScoreLesson } from '../../lib/api';
import { flushCompletions, pendingFor } from '../../lib/pwa/pendingCompletions';
import { createBrowserClient } from '../../lib/supabase';

export const PENDING_CHANGED = 'scipal:pending-changed';

/** Sends lessons finished offline when the connection returns, and says how many wait and what the server granted. */
export function PendingSync() {
  const { t } = useLanguage();
  const [waiting, setWaiting] = useState(0);
  const [done, setDone] = useState<{ synced: number; xp: number } | null>(null);

  const sync = useCallback(async () => {
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      setWaiting(pendingFor(userId).length);
      if (!navigator.onLine || pendingFor(userId).length === 0) return;
      const result = await flushCompletions(userId, (lessonId) => postScoreLesson({ lesson_id: lessonId, answers: [] }, session.access_token));
      setWaiting(pendingFor(userId).length);
      if (result.synced > 0) setDone(result);
    } catch {
      // Not signed in or storage blocked: nothing to send, nothing to tell.
    }
  }, []);

  useEffect(() => {
    void sync();
    window.addEventListener('online', sync);
    window.addEventListener(PENDING_CHANGED, sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener(PENDING_CHANGED, sync);
    };
  }, [sync]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(null), 8000);
    return () => clearTimeout(timer);
  }, [done]);

  const text = done
    ? t({
        vi: `Đã đồng bộ ${done.synced} bài, +${done.xp} XP (theo máy chủ).`,
        en: `Synced ${done.synced} lesson(s), +${done.xp} XP (from the server).`,
      })
    : waiting > 0
      ? t({ vi: `${waiting} bài đang chờ đồng bộ.`, en: `${waiting} lesson(s) waiting to sync.` })
      : null;
  if (!text) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 border-b border-line bg-surface px-4 py-2 text-center text-sm font-semibold text-ink">
      <CloudUpload aria-hidden="true" className="h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}
