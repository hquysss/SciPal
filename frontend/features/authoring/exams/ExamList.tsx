'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { LessonStatusBadge } from '../lessonStatusBadge';
import { getExam, listExams, type ExamDetail, type ExamSummary } from './api';
import { ExamBuilder } from './ExamBuilder';
import type { AuthoringSubjectOption } from '../authoringQueries';

type Bilingual = { en: string; vi: string };

/** The exams a teacher (their own) or an admin (all) can open in the builder. */
export function ExamTable({ exams }: { exams: ExamSummary[] }) {
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
        <li key={exam.id}>
          <Link
            href={`/exam/manage/${exam.id}`}
            className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-edge hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus sm:flex-row sm:items-center"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">{exam.name}</span>
              <span className="mt-1 block text-sm text-ink-muted">
                {[
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
        </li>
      ))}
    </ul>
  );
}

/** The list, loaded in the browser with the signed-in author's token. */
export function ExamList() {
  const { t } = useLanguage();
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  useEffect(() => {
    void listExams().then((res) => (res.ok ? setExams(res.data.exams) : setError(res.error)));
  }, []);
  if (error) return <Alert tone="danger">{t(error)}</Alert>;
  if (!exams) return <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  return <ExamTable exams={exams} />;
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
