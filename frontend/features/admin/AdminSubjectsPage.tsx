'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { archiveSubject, fetchAdminSubjects, restoreSubject, type AdminSubject } from './adminSubjectsApi';

type Bilingual = { vi: string; en: string };

/** The server's order (published lessons first, archived last, then sort_order), kept after a local change. */
const rank = (s: AdminSubject) => (s.archived_at ? 2 : s.counts.lessons_published > 0 ? 0 : 1);
const inServerOrder = (list: AdminSubject[]) => [...list].sort((a, b) => rank(a) - rank(b) || a.sort_order - b.sort_order);

function Counts({ subject }: { subject: AdminSubject }) {
  const { t } = useLanguage();
  const c = subject.counts;
  const items: Bilingual[] = [
    { vi: `${c.lessons_published} bài đã xuất bản`, en: `${c.lessons_published} published lessons` },
    { vi: `${c.lessons_draft} bản nháp`, en: `${c.lessons_draft} drafts` },
    { vi: `${c.questions} câu hỏi`, en: `${c.questions} questions` },
    { vi: `${c.classes} lớp`, en: `${c.classes} classes` },
  ];
  return <p className="text-sm text-ink-muted">{items.map((item) => t(item)).join(' · ')}</p>;
}

/** The admin's list of subjects: delete (hide) one, or restore a deleted one. */
export function AdminSubjectsPage() {
  const { t } = useLanguage();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; message: Bilingual } | { status: 'ready'; subjects: AdminSubject[] }>({ status: 'loading' });
  const [confirming, setConfirming] = useState<AdminSubject | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Bilingual | null>(null);

  const load = useCallback(async () => {
    const result = await fetchAdminSubjects();
    setState(result.ok ? { status: 'ready', subjects: result.data.subjects } : { status: 'error', message: result.error });
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const change = async (subject: AdminSubject, action: typeof archiveSubject) => {
    setBusy(true);
    setProblem(null);
    const result = await action(subject.id);
    setBusy(false);
    setConfirming(null);
    if (!result.ok) {
      setProblem(result.error);
      return;
    }
    const updated = result.data.subject;
    setState((s) => (s.status === 'ready' ? { status: 'ready', subjects: inServerOrder(s.subjects.map((x) => (x.id === updated.id ? updated : x))) } : s));
  };

  const subjects = state.status === 'ready' ? state.subjects : [];
  const active = subjects.filter((s) => !s.archived_at);
  const removed = subjects.filter((s) => s.archived_at);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6">
      <PageBreadcrumb items={[{ href: '/admin', label: { en: 'Admin', vi: 'Quản trị' } }, { label: { en: 'Subjects', vi: 'Môn học' } }]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t({ vi: 'Môn học', en: 'Subjects' })}</h1>
        <p className="mt-2 text-base text-ink-muted">
          {t({
            vi: 'Môn có bài đã xuất bản xếp trước. Xóa môn chỉ ẩn môn khỏi học sinh và giáo viên, mọi nội dung và dữ liệu học tập vẫn còn và khôi phục được.',
            en: 'Subjects with published lessons come first. Deleting a subject only hides it from learners and teachers; all content and learning data stay and it can be restored.',
          })}
        </p>
      </header>

      {state.status === 'loading' && <p className="text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>}
      {state.status === 'error' && <Alert tone="danger">{t(state.message)}</Alert>}
      {problem && <Alert tone="danger">{t(problem)}</Alert>}

      {state.status === 'ready' && (
        <>
          <section aria-labelledby="subjects-active" className="flex flex-col gap-3">
            <h2 id="subjects-active" className="text-lg font-bold text-ink">{t({ vi: 'Đang dùng', en: 'In use' })}</h2>
            <ul className="flex flex-col gap-3">
              {active.map((subject) => (
                <li key={subject.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      <span aria-hidden="true">{subject.icon} </span>
                      {t({ vi: subject.name_vi, en: subject.name_en })}
                    </p>
                    <Counts subject={subject} />
                  </div>
                  <Button variant="destructive" onClick={() => setConfirming(subject)} disabled={busy}>
                    {t({ vi: 'Xóa môn', en: 'Delete subject' })}
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="subjects-removed" className="flex flex-col gap-3">
            <h2 id="subjects-removed" className="text-lg font-bold text-ink">{t({ vi: 'Đã xóa', en: 'Deleted' })}</h2>
            {removed.length === 0 ? (
              <p className="text-sm text-ink-muted">{t({ vi: 'Chưa có môn nào bị xóa.', en: 'No subject has been deleted.' })}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {removed.map((subject) => (
                  <li key={subject.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-surface-sunken p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{t({ vi: subject.name_vi, en: subject.name_en })}</p>
                      <Counts subject={subject} />
                    </div>
                    <Button variant="outline" onClick={() => void change(subject, restoreSubject)} disabled={busy}>
                      {t({ vi: 'Khôi phục', en: 'Restore' })}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={t({ vi: 'Xóa môn học này?', en: 'Delete this subject?' })}
        closeLabel={t({ vi: 'Đóng', en: 'Close' })}
        className="max-w-md"
      >
        {confirming && (
          <div className="flex flex-col gap-4">
            <p className="text-base text-ink">
              {t({
                vi: `Học sinh và giáo viên sẽ không còn thấy môn ${confirming.name_vi}. Không có gì bị xóa: bài học, câu hỏi, XP và lớp học vẫn còn, và bạn khôi phục được bất cứ lúc nào.`,
                en: `Learners and teachers will no longer see ${confirming.name_en}. Nothing is deleted: lessons, questions, XP and classes stay, and you can restore it any time.`,
              })}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>{t({ vi: 'Hủy', en: 'Cancel' })}</Button>
              <Button variant="destructive" onClick={() => void change(confirming, archiveSubject)} disabled={busy}>
                {t({ vi: 'Xóa môn', en: 'Delete subject' })}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
