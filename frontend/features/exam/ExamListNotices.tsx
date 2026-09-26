'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { EmptyState } from '../../components/ui/empty-state';
import type { BlueprintSummary } from './examQueries';

export function NoExamsNotice() {
  const { t } = useLanguage();
  return (
    <EmptyState
      title={t({ en: 'No exams yet', vi: 'Chưa có đề thi' })}
      description={t({
        en: 'Practice exams will appear here once teachers publish them.',
        vi: 'Đề thi thử sẽ hiện ở đây khi giáo viên xuất bản.',
      })}
    />
  );
}

const crumbLink =
  'rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export function ExamListHeader() {
  const { t } = useLanguage();
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className={crumbLink}>
              {t({ en: 'Home', vi: 'Trang chủ' })}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li aria-current="page" className="font-semibold text-ink">
            {t({ en: 'Practice exams', vi: 'Phòng thi thử' })}
          </li>
        </ol>
      </nav>

      <header className="max-w-xl">
        <h1 className="text-3xl font-bold text-ink">{t({ en: 'Practice exams', vi: 'Phòng thi thử & đánh giá năng lực' })}</h1>
        <p className="mt-2 text-base text-ink-muted">
          {t({
            en: 'Timed exams with a question grid. Scoring happens on the server, so answers are never sent to your browser.',
            vi: 'Bài thi bấm giờ có bảng điều hướng câu hỏi. Điểm được chấm trên máy chủ, đáp án không bao giờ gửi xuống trình duyệt.',
          })}
        </p>
      </header>
    </>
  );
}

export function ExamBlueprintList({ blueprints }: { blueprints: BlueprintSummary[] }) {
  const { lang, t } = useLanguage();
  return (
    <>
      <h2 className="text-lg font-bold text-ink">
        {t({ en: `Available exams (${blueprints.length})`, vi: `Đề thi có sẵn (${blueprints.length})` })}
      </h2>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {blueprints.map((bp) => {
          const subjectName = lang === 'en' ? (bp.subject_name_en ?? bp.subject_name_vi) : bp.subject_name_vi;
          return (
            <li key={bp.id}>
              <Link
                href={`/exam/${bp.id}`}
                className="flex min-h-11 flex-col gap-3 rounded-xl border border-line bg-surface p-6 transition-colors hover:border-edge hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  {subjectName && (
                    <span className="rounded-md bg-surface-sunken px-2.5 py-0.5 text-sm font-semibold text-ink">{subjectName}</span>
                  )}
                  <span className="text-sm text-ink-muted">
                    {bp.grade !== null ? t({ en: `Grade ${bp.grade} · `, vi: `Lớp ${bp.grade} · ` }) : ''}
                    {t({
                      en: `${bp.question_count} ${bp.question_count === 1 ? 'question' : 'questions'}`,
                      vi: `${bp.question_count} câu`,
                    })}
                  </span>
                </span>
                <span className="text-base font-bold text-ink">{bp.name}</span>
                <span className="text-sm font-semibold text-action">{t({ en: 'Start exam', vi: 'Vào thi' })}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function ExamRoomHeader({ blueprint, questionCount }: { blueprint: BlueprintSummary; questionCount: number }) {
  const { lang, t } = useLanguage();
  const subjectName = lang === 'en' ? (blueprint.subject_name_en ?? blueprint.subject_name_vi) : blueprint.subject_name_vi;
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className={crumbLink}>
              {t({ en: 'Home', vi: 'Trang chủ' })}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li>
            <Link href="/exam" className={crumbLink}>
              {t({ en: 'Practice exams', vi: 'Phòng thi thử' })}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li aria-current="page" className="font-semibold text-ink">
            {blueprint.name}
          </li>
        </ol>
      </nav>

      <header className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <p className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-md bg-surface-sunken px-3 py-1 font-semibold text-ink">
            {subjectName ?? t({ en: 'Exam', vi: 'Đề thi' })}
          </span>
          <span className="text-ink-muted">
            {t({ en: `${questionCount} ${questionCount === 1 ? 'question' : 'questions'}`, vi: `${questionCount} câu` })}
          </span>
        </p>
        <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">{blueprint.name}</h1>
      </header>
    </>
  );
}
