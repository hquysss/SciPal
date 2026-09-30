'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ClipboardCheck } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { JoinClassModal } from './JoinClassModal';
import { listMyClasses, shortDate, type MyClass } from './assignmentsApi';

type Bilingual = { vi: string; en: string };
export type MyClassesState = { status: 'loading' } | { status: 'error'; message: Bilingual } | { status: 'ready'; classes: MyClass[] };

export function MyClassesView({ state, onJoin, now = new Date() }: { state: MyClassesState; onJoin: () => void; now?: Date }) {
  const { t } = useLanguage();
  const joinButton = (
    <Button type="button" onClick={onJoin}>
      {t({ en: 'Join with a code', vi: 'Vào lớp bằng mã' })}
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">{state.status === 'ready' && state.classes.length > 0 && joinButton}</div>

      {state.status === 'loading' && <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading your classes…', vi: 'Đang tải lớp của bạn…' })}</p>}
      {state.status === 'error' && <Alert tone="danger">{t(state.message)}</Alert>}
      {state.status === 'ready' && state.classes.length === 0 && (
        <EmptyState
          title={t({ en: 'You are not in a class yet', vi: 'Bạn chưa vào lớp nào' })}
          description={t({ en: 'Ask your teacher for the class code, then join here to see the work they give.', vi: 'Xin thầy cô mã lớp rồi vào lớp ở đây để thấy bài được giao.' })}
          action={joinButton}
        />
      )}

      {state.status === 'ready' && state.classes.map((cls) => (
        <section key={cls.id} aria-labelledby={`class-${cls.id}`} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-0.5">
            <h2 id={`class-${cls.id}`} className="text-lg font-bold text-ink">{cls.name}</h2>
            <p className="text-sm text-ink-muted">
              {[cls.subject ? t(cls.subject) : null, cls.teacherName].filter(Boolean).join(' · ')}
            </p>
          </div>

          {cls.assignments.length === 0 ? (
            <p className="text-sm text-ink-muted">{t({ en: 'No work assigned yet.', vi: 'Chưa có bài được giao.' })}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {cls.assignments.map((a) => {
                const Icon = a.kind === 'lesson' ? BookOpen : ClipboardCheck;
                const overdue = !a.done && a.dueAt !== null && new Date(a.dueAt) < now;
                return (
                  <li key={a.id}>
                    <Link href={a.href} className="flex min-h-11 items-center gap-3 py-3 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                      <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-muted" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="break-words font-semibold text-ink">{t(a.title)}</span>
                        <span className="text-sm text-ink-muted">
                          {a.kind === 'lesson' ? t({ en: 'Lesson', vi: 'Bài học' }) : t({ en: 'Exam', vi: 'Đề thi' })}
                          {a.dueAt && ` · ${t({ en: `Due ${shortDate(a.dueAt)}`, vi: `Hạn ${shortDate(a.dueAt)}` })}`}
                        </span>
                      </span>
                      {a.done ? (
                        <Badge variant="success">{t({ en: 'Done', vi: 'Đã làm' })}</Badge>
                      ) : overdue ? (
                        <Badge variant="destructive">{t({ en: 'Overdue', vi: 'Quá hạn' })}</Badge>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export function MyClasses() {
  const [state, setState] = useState<MyClassesState>({ status: 'loading' });
  const [joinOpen, setJoinOpen] = useState(false);
  const [token, setToken] = useState<string | undefined>();

  const load = useCallback(async () => {
    const result = await listMyClasses();
    setState(result.ok ? { status: 'ready', classes: result.data.classes } : { status: 'error', message: result.error });
  }, []);

  useEffect(() => {
    void load();
    createBrowserClient().auth.getSession().then(({ data: { session } }) => setToken(session?.access_token)).catch(() => undefined);
  }, [load]);

  return (
    <>
      <MyClassesView state={state} onJoin={() => setJoinOpen(true)} />
      <JoinClassModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={() => void load()} token={token} />
    </>
  );
}
