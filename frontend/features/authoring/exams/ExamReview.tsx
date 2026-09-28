'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { approveExam, listExams, rejectExam, type ExamSummary } from './api';

type Bilingual = { en: string; vi: string };

/** One exam waiting for review, with "Duyệt" and "Trả lại" (a note is required to send it back). */
export function ExamReviewCard({ exam, onDone }: { exam: ExamSummary; onDone: (id: string) => void }) {
  const { t } = useLanguage();
  const noteId = useId();
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);

  const act = async (decision: 'approve' | 'reject') => {
    setBusy(true);
    setError(null);
    const res = decision === 'approve' ? await approveExam(exam.id) : await rejectExam(exam.id, note.trim());
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone(exam.id);
  };

  const facts = [
    exam.subject_name_vi && exam.grade ? `${exam.subject_name_vi} · ${t({ en: `Grade ${exam.grade}`, vi: `Lớp ${exam.grade}` })}` : exam.subject_name_vi,
    t({ en: `${exam.question_count} questions`, vi: `${exam.question_count} câu` }),
    exam.duration_minutes ? t({ en: `${exam.duration_minutes} min`, vi: `${exam.duration_minutes} phút` }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-ink-muted">{facts}</span>
        <h3 className="font-bold text-ink">{exam.name}</h3>
        {exam.name_en && <p className="text-sm text-ink-muted">{exam.name_en}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/teacher/exams/${exam.id}`} className={buttonVariants({ variant: 'outline' })}>
          {t({ en: 'Open the exam', vi: 'Xem đề' })}
        </Link>
        <Button type="button" disabled={busy} onClick={() => void act('approve')}>
          {t({ en: 'Approve', vi: 'Duyệt' })}
        </Button>
        {!returning && (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setReturning(true)}>
            {t({ en: 'Send back', vi: 'Trả lại' })}
          </Button>
        )}
      </div>
      {returning && (
        <div className="flex flex-col gap-2">
          <label htmlFor={noteId} className="text-sm font-semibold text-ink">
            {t({ en: 'What should the teacher change?', vi: 'Giáo viên cần sửa gì?' })}
          </label>
          <textarea
            id={noteId}
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-edge bg-surface px-3 py-2 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" disabled={busy || !note.trim()} onClick={() => void act('reject')}>
              {t({ en: 'Send back with this note', vi: 'Trả lại kèm ghi chú' })}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReturning(false)}>
              {t({ en: 'Cancel', vi: 'Hủy' })}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
    </article>
  );
}

/** Builder exams waiting for an admin (Excel imports have their own cards). */
export function PendingExamReviews() {
  const { t } = useLanguage();
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  useEffect(() => {
    void listExams('pending_review').then((res) => (res.ok ? setExams(res.data.exams.filter((e) => !e.imported)) : setError(res.error)));
  }, []);
  const done = useCallback((id: string) => setExams((old) => (old ?? []).filter((e) => e.id !== id)), []);

  if (error) return <Alert tone="danger">{t(error)}</Alert>;
  if (!exams) return <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  if (exams.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-edge p-4 text-sm text-ink-muted">
        {t({ en: 'No exams from the builder are waiting.', vi: 'Không có đề nào soạn trong ứng dụng đang chờ duyệt.' })}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {exams.map((exam) => (
        <ExamReviewCard key={exam.id} exam={exam} onDone={done} />
      ))}
    </div>
  );
}
