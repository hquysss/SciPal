'use client';

import Link from 'next/link';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ClipboardCheck } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { AssignDialog } from './AssignDialog';
import { listAssignments, removeAssignment, shortDate, type TeacherAssignment } from './assignmentsApi';

type Bilingual = { vi: string; en: string };
export type AssignmentsState = { status: 'loading' } | { status: 'error'; message: Bilingual } | { status: 'ready'; items: TeacherAssignment[] };

export function ClassAssignmentsView({
  state,
  onAssign,
  onRemove,
  removing = null,
  notice = null,
}: {
  state: AssignmentsState;
  onAssign: () => void;
  onRemove: (item: TeacherAssignment) => void;
  removing?: string | null;
  notice?: Bilingual | null;
}) {
  const { t } = useLanguage();
  return (
    <section className="flex flex-col gap-3" aria-labelledby="assignments-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="assignments-heading" className="text-base font-semibold text-ink">
          {t({ en: 'Assigned work', vi: 'Bài đã giao' })}
        </h2>
        <Button type="button" onClick={onAssign}>
          {t({ en: 'Assign work', vi: 'Giao bài' })}
        </Button>
      </div>

      {notice && <Alert tone="danger">{t(notice)}</Alert>}

      {state.status === 'loading' && <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>}
      {state.status === 'error' && <Alert tone="danger">{t(state.message)}</Alert>}
      {state.status === 'ready' && state.items.length === 0 && (
        <EmptyState
          title={t({ en: 'Nothing assigned yet', vi: 'Chưa giao bài nào' })}
          description={t({ en: 'Give the class a published lesson or exam; you will see who has done it.', vi: 'Giao cho lớp một bài học hoặc đề thi đã xuất bản; thầy cô sẽ thấy em nào đã làm.' })}
        />
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
          {state.items.map((item) => {
            const Icon = item.kind === 'lesson' ? BookOpen : ClipboardCheck;
            return (
              <li key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
                  <div className="flex min-w-0 flex-col gap-1">
                    {item.href ? (
                      <Link prefetch={false} href={item.href} className="break-words font-semibold text-ink underline-offset-4 hover:underline">{t(item.title)}</Link>
                    ) : (
                      <span className="break-words font-semibold text-ink">{t(item.title)}</span>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                      <span>{item.kind === 'lesson' ? t({ en: 'Lesson', vi: 'Bài học' }) : t({ en: 'Exam', vi: 'Đề thi' })}</span>
                      {item.dueAt && <span>· {t({ en: `Due ${shortDate(item.dueAt)}`, vi: `Hạn ${shortDate(item.dueAt)}` })}</span>}
                      {!item.published && <Badge variant="warning">{t({ en: 'No longer published', vi: 'Không còn xuất bản' })}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 self-start sm:self-auto">
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    {t({ en: `${item.doneCount}/${item.memberCount} done`, vi: `${item.doneCount}/${item.memberCount} em đã làm` })}
                  </span>
                  <Button type="button" variant="ghost" disabled={removing === item.id} onClick={() => onRemove(item)}>
                    {t({ en: 'Remove', vi: 'Gỡ' })}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ClassAssignments({ classId }: { classId: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<AssignmentsState>({ status: 'loading' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [notice, setNotice] = useState<Bilingual | null>(null);

  const load = useCallback(async () => {
    const result = await listAssignments(classId);
    setState(result.ok ? { status: 'ready', items: result.data.assignments } : { status: 'error', message: result.error });
  }, [classId]);
  useEffect(() => { void load(); }, [load]);

  const remove = async (item: TeacherAssignment) => {
    const ok = window.confirm(t({ en: `Remove "${item.title.en}" from the class?`, vi: `Gỡ "${item.title.vi}" khỏi lớp?` }));
    if (!ok) return;
    setRemoving(item.id);
    setNotice(null);
    const result = await removeAssignment(classId, item.id);
    setRemoving(null);
    if (!result.ok) setNotice(result.error);
    await load();
  };

  return (
    <>
      <ClassAssignmentsView state={state} onAssign={() => setDialogOpen(true)} onRemove={(item) => void remove(item)} removing={removing} notice={notice} />
      <AssignDialog classId={classId} open={dialogOpen} onClose={() => setDialogOpen(false)} onAssigned={() => { setDialogOpen(false); void load(); }} />
    </>
  );
}
