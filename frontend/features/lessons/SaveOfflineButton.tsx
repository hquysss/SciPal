'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CloudDownload } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { useOnline } from '@/components/pwa/OfflineBanner';
import { savePagesOffline } from '@/lib/pwa/saveOffline';
import { downloadPacks } from '@/lib/pwa/practicePacks';
import { createBrowserClient } from '@/lib/supabase';
import { fetchPracticePack } from './practiceApi';

export type SaveState = { kind: 'idle' } | { kind: 'saving'; done: number; total: number } | { kind: 'done'; saved: number; failed: number };

export function SaveOfflineView({ state, count, online, onSave }: { state: SaveState; count: number; online: boolean; onSave: () => void }) {
  const { t } = useLanguage();
  if (state.kind === 'done') {
    return (
      <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-action" />
        {state.failed === 0
          ? t({ vi: `Đã lưu ${state.saved} bài để học offline.`, en: `${state.saved} lessons saved for offline.` })
          : t({ vi: `Đã lưu ${state.saved} bài; ${state.failed} bài chưa lưu được, thử lại khi mạng ổn.`, en: `${state.saved} lessons saved; ${state.failed} could not be saved, try again on a steady connection.` })}
      </p>
    );
  }
  const saving = state.kind === 'saving';
  return (
    <button type="button" onClick={onSave} disabled={saving || !online} aria-busy={saving} className={buttonVariants({ variant: 'outline', className: 'self-start' })}>
      <CloudDownload aria-hidden="true" />
      {saving
        ? t({ vi: `Đang lưu ${state.done}/${state.total}…`, en: `Saving ${state.done}/${state.total}…` })
        : t({ vi: `Tải ${count} bài để học offline`, en: `Save ${count} lessons for offline` })}
    </button>
  );
}

export type OfflineLesson = { url: string; id: string };

/**
 * Keeps each lesson's page, then the practice packs of all of them. A lesson counts as saved only
 * when both its page and its pack were kept.
 */
export async function saveLessonsOffline(
  lessons: OfflineLesson[],
  onProgress: (done: number, total: number) => void,
  deps: { savePage: (url: string) => Promise<boolean>; savePacks: (ids: string[]) => Promise<{ saved: string[]; failed: string[] }> },
): Promise<{ saved: number; failed: number }> {
  const pagesKept = new Set<string>();
  for (const [index, lesson] of lessons.entries()) {
    if (await deps.savePage(lesson.url)) pagesKept.add(lesson.id);
    onProgress(index + 1, lessons.length);
  }
  const packs = await deps.savePacks(lessons.map((lesson) => lesson.id));
  const packsKept = new Set(packs.saved);
  const saved = lessons.filter((lesson) => pagesKept.has(lesson.id) && packsKept.has(lesson.id)).length;
  return { saved, failed: lessons.length - saved };
}

/** The signed-in learner's practice packs; none (all failed) without a session. */
async function savePacksForSession(ids: string[]): Promise<{ saved: string[]; failed: string[] }> {
  const { data } = await createBrowserClient().auth.getSession().catch(() => ({ data: { session: null } }));
  const session = data.session;
  if (!session) return { saved: [], failed: ids };
  return downloadPacks(ids, session.access_token, session.user.id, fetchPracticePack);
}

/** On a subject page: keeps every lesson of the subject, with its practice, on this device. Hidden where it cannot work. */
export function SaveOfflineButton({ lessons }: { lessons: OfflineLesson[] }) {
  const online = useOnline();
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });

  useEffect(() => {
    setSupported('caches' in window && 'serviceWorker' in navigator);
  }, []);
  if (!supported || lessons.length === 0) return null;

  const save = async () => {
    setState({ kind: 'saving', done: 0, total: lessons.length });
    const result = await saveLessonsOffline(lessons, (done, total) => setState({ kind: 'saving', done, total }), {
      savePage: async (url) => (await savePagesOffline([url])).saved === 1,
      savePacks: savePacksForSession,
    });
    setState({ kind: 'done', ...result });
  };
  return <SaveOfflineView state={state} count={lessons.length} online={online} onSave={() => void save()} />;
}
