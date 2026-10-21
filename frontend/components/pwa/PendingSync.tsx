'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { postPracticeSync } from '@/features/lessons/practiceApi';
import { postExamSubmit } from '@/features/exam/offlineExam';
import { clearPacks } from '../../lib/pwa/practicePacks';
import { clearExamPages } from '../../lib/pwa/examPacks';
import { EXAM_SYNCED, flushExams, flushPractice, PENDING_CHANGED, pendingExamsFor, pendingFor, PRACTICE_SYNCED, type ExamSyncResult, type SyncResult } from '../../lib/pwa/pendingPractice';
import { createBrowserClient } from '../../lib/supabase';

/** Sends practice answers and exams made offline when the connection returns, and says how many wait and what the server granted. */
export function PendingSync() {
  const { t } = useLanguage();
  const [waiting, setWaiting] = useState({ answers: 0, exams: 0 });
  const [done, setDone] = useState<{ synced: number; xp: number } | null>(null);
  const [examsDone, setExamsDone] = useState<{ synced: number; gone: number; notCounted: number } | null>(null);

  // One sync at a time: answers queued meanwhile go out with the next run.
  const running = useRef(false);
  const sync = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      const waitingNow = () => ({ answers: pendingFor(userId).length, exams: pendingExamsFor(userId).length });
      setWaiting(waitingNow());
      if (!navigator.onLine || waitingNow().answers + waitingNow().exams === 0) return;
      const result = await flushPractice(userId, (attempts) => postPracticeSync(attempts, session.access_token));
      const exams = await flushExams(userId, (row) => postExamSubmit(row, session.access_token));
      setWaiting(waitingNow());
      if (exams.results.length > 0) {
        window.dispatchEvent(new CustomEvent<ExamSyncResult[]>(EXAM_SYNCED, { detail: exams.results }));
        const notCounted = exams.results.filter((r) => r.not_counted).length;
        setExamsDone({ synced: exams.synced, gone: exams.results.filter((r) => r.gone).length, notCounted });
      }
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
        if (event === 'SIGNED_OUT') {
          clearPacks();
          void clearExamPages();
        }
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
    if (!done && !examsDone) return;
    const timer = setTimeout(() => {
      setDone(null);
      setExamsDone(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [done, examsDone]);

  const text = examsDone?.notCounted
    ? t({ vi: 'Một bài thi làm offline chưa được tính vì bạn đã hết lượt thi chấm điểm.', en: 'An exam taken offline was not counted because you had no graded attempts left.' })
    : examsDone?.gone
    ? t({ vi: 'Một đề đã bị gỡ nên bài làm offline không được chấm.', en: 'An exam was removed, so the answers made offline could not be graded.' })
    : examsDone?.synced
      ? t({ vi: `Đã đồng bộ ${examsDone.synced} bài thi (điểm theo máy chủ).`, en: `Synced ${examsDone.synced} ${examsDone.synced === 1 ? 'exam' : 'exams'} (scored by the server).` })
      : done
    ? t({
        vi: `Đã đồng bộ ${done.synced} câu, +${done.xp} XP (theo máy chủ).`,
        en: `Synced ${done.synced} ${done.synced === 1 ? 'answer' : 'answers'}, +${done.xp} XP (from the server).`,
      })
    : waiting.answers + waiting.exams > 0
      ? t({
          vi: `${[waiting.answers ? `${waiting.answers} câu` : '', waiting.exams ? `${waiting.exams} bài thi` : ''].filter(Boolean).join(', ')} đang chờ đồng bộ.`,
          en: `${[waiting.answers ? `${waiting.answers} ${waiting.answers === 1 ? 'answer' : 'answers'}` : '', waiting.exams ? `${waiting.exams} ${waiting.exams === 1 ? 'exam' : 'exams'}` : ''].filter(Boolean).join(', ')} waiting to sync.`,
        })
      : null;
  if (!text) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 border-b border-line bg-surface px-4 py-2 text-center text-sm font-semibold text-ink">
      <CloudUpload aria-hidden="true" className="h-4 w-4 shrink-0" />
      {text}
    </div>
  );
}
