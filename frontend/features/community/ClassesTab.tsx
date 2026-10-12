'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ChatPane } from './ChatPane';
import { listChatClasses, type ChatClass } from './chatApi';

type Bilingual = { vi: string; en: string };
export type ClassListState =
  | { status: 'loading' }
  | { status: 'error'; message: Bilingual }
  | { status: 'ready'; classes: ChatClass[] };

export function ClassListView({ state, onOpen }: { state: ClassListState; onOpen: (classId: string) => void }) {
  const { t } = useLanguage();
  if (state.status === 'loading') return <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  if (state.status === 'error') return <Alert tone="danger">{t(state.message)}</Alert>;
  if (state.classes.length === 0) {
    return (
      <EmptyState
        title={t({ en: 'No classes yet', vi: 'Chưa có lớp nào' })}
        description={t({ en: 'Join a class with the code from your teacher and its chat appears here.', vi: 'Vào lớp bằng mã thầy cô cho, cuộc trò chuyện của lớp sẽ hiện ở đây.' })}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {state.classes.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onOpen(c.id)}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 text-left hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink"><Users className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{c.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The chats of the classes you teach or belong to; `classId` is the one open (kept in the URL by the page). */
export function ClassesTab({ classId, onOpen }: { classId: string | null; onOpen: (classId: string | null) => void }) {
  const { t } = useLanguage();
  const [state, setState] = useState<ClassListState>({ status: 'loading' });

  useEffect(() => {
    let live = true;
    void listChatClasses().then((result) => {
      if (live) setState(result.ok ? { status: 'ready', classes: result.data.classes } : { status: 'error', message: result.error });
    });
    return () => { live = false; };
  }, []);

  if (classId) {
    const open = state.status === 'ready' ? state.classes.find((c) => c.id === classId) : undefined;
    return (
      <ChatPane
        key={classId}
        target={{ class_id: classId }}
        title={open?.name ?? t({ en: 'Class', vi: 'Lớp học' })}
        subtitle={t({ en: 'Teacher and classmates', vi: 'Thầy cô và các bạn trong lớp' })}
        onBack={() => onOpen(null)}
      />
    );
  }
  return <ClassListView state={state} onOpen={onOpen} />;
}
