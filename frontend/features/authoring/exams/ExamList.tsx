'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LessonStatusBadge } from '../lessonStatusBadge';
import { deleteExam, getExam, listExams, type ExamDetail, type ExamSummary } from './api';
import { useExamStructureConfirmations } from './useExamStructureConfirmations';
import { ExamBuilder } from './ExamBuilder';
import type { AuthoringSubjectOption } from '../authoringQueries';

type Bilingual = { en: string; vi: string };

/** The exams a teacher (their own) or an admin (all) can open in the builder. */
export function ExamTable({ exams, canDelete, onDelete, busyId }: { exams: ExamSummary[]; canDelete?: (exam: ExamSummary) => boolean; onDelete?: (exam: ExamSummary) => void; busyId?: string | null }) {
  const { t } = useLanguage();
  if (exams.length === 0) {
    return (
      <EmptyState
        title={t({ en: 'No exams yet.', vi: 'Chưa có đề thi nào.' })}
        description={t({ en: 'Write one with “New exam”, or import an Excel workbook.', vi: 'Bấm “Soạn đề mới”, hoặc nhập đề từ tệp Excel.' })}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {exams.map((exam) => (
        <li key={exam.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={`/exam/manage/${exam.id}`}
            className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-edge hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus sm:flex-row sm:items-center"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">{exam.name}</span>
              <span className="mt-1 block text-sm text-ink-muted">
                {[
                  exam.exam_code ? t({ en: `Code ${exam.exam_code}`, vi: `Mã đề ${exam.exam_code}` }) : null,
                  exam.exam_year ? t({ en: `Year ${exam.exam_year}`, vi: `Năm ${exam.exam_year}` }) : null,
                  exam.subject_name_vi && exam.grade ? `${exam.subject_name_vi} · ${t({ en: `Grade ${exam.grade}`, vi: `Lớp ${exam.grade}` })}` : exam.subject_name_vi,
                  t({ en: `${exam.question_count} questions`, vi: `${exam.question_count} câu` }),
                  exam.duration_minutes ? t({ en: `${exam.duration_minutes} min`, vi: `${exam.duration_minutes} phút` }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {exam.source && (
                <span className="mt-1 block truncate text-xs italic text-ink-muted">
                  {t({ en: 'Source', vi: 'Nguồn' })}: {exam.source}
                </span>
              )}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              {exam.imported && <span className="text-xs text-ink-muted">{t({ en: 'Imported from Excel', vi: 'Nhập từ Excel' })}</span>}
              <LessonStatusBadge status={exam.status} />
            </span>
          </Link>
          {onDelete && canDelete?.(exam) && (
            <Button type="button" variant="ghost" disabled={busyId === exam.id} onClick={() => onDelete(exam)} aria-label={t({ en: `Delete ${exam.name}`, vi: `Xóa đề ${exam.name}` })}>
              <Trash2 size={16} aria-hidden="true" />
              {t({ en: 'Delete', vi: 'Xóa' })}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The list, loaded in the browser with the signed-in author's token. */
export function ExamList({ isAdmin = false }: { isAdmin?: boolean }) {
  const { t } = useLanguage();
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  const [deleteError, setDeleteError] = useState<Bilingual | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { dialog, askDeleteExam } = useExamStructureConfirmations();
  // The server decides too: a teacher deletes only drafts, an admin any exam no student has taken.
  const canDelete = (exam: ExamSummary) => isAdmin || exam.status === 'draft';
  const remove = async (exam: ExamSummary) => {
    if (busyId || !(await askDeleteExam())) return;
    setBusyId(exam.id);
    setDeleteError(null);
    const res = await deleteExam(exam.id);
    setBusyId(null);
    if (!res.ok) return setDeleteError(res.error);
    setExams((current) => current?.filter((item) => item.id !== exam.id) ?? null);
  };
  useEffect(() => {
    void listExams().then((res) => (res.ok ? setExams(res.data.exams) : setError(res.error)));
  }, []);
  if (error) return <Alert tone="danger">{t(error)}</Alert>;
  if (!exams) return <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  return (
    <>
      {deleteError && <Alert tone="danger">{t(deleteError)}</Alert>}
      <ExamTable exams={exams} canDelete={canDelete} onDelete={(exam) => void remove(exam)} busyId={busyId} />
      {dialog}
    </>
  );
}

/** The builder for a saved exam, loaded by id. */
export function ExamBuilderLoader({ id, subjects, isAdmin }: { id: string; subjects: AuthoringSubjectOption[]; isAdmin: boolean }) {
  const { t } = useLanguage();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  useEffect(() => {
    void getExam(id).then((res) => (res.ok ? setExam(res.data.exam) : setError(res.error)));
  }, [id]);
  if (error) return <Alert tone="danger">{t(error)}</Alert>;
  if (!exam) return <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  return <ExamBuilder key={exam.id} exam={exam} subjects={subjects} isAdmin={isAdmin} />;
}
