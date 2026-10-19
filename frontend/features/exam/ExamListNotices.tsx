'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Code2 } from 'lucide-react';
import { StaffLinks } from '@/features/nav/StaffLinks';
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
        <h1 className="text-3xl font-bold text-ink">{t({ en: 'Mock exams: Competency test & graduation exam', vi: 'Phòng thi ĐGNL & THPTQG' })}</h1>
        <p className="mt-2 text-base text-ink-muted">
          {t({
            en: 'Timed exams with a question grid. Your score appears as soon as you submit.',
            vi: 'Bài thi bấm giờ có bảng điều hướng câu hỏi. Điểm được chấm ngay khi bạn nộp bài.',
          })}
        </p>
        <div className="mt-4">
          <StaffLinks place="exams" />
        </div>
      </header>
    </>
  );
}

/** A subject with programming problems in Bồi dưỡng HSG, shown as a card that opens its problem list. */
export interface HsgCoding {
  slug: string;
  name_vi: string;
  name_en: string | null;
  count: number;
}

const cardClass =
  'flex min-h-11 flex-col gap-3 rounded-xl border border-line bg-surface p-6 transition-colors hover:border-edge hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

function ExamCard({ bp, subjectName }: { bp: BlueprintSummary; subjectName: string | null }) {
  const { t } = useLanguage();
  return (
    <li>
      <Link href={`/exam/${bp.id}`} className={cardClass}>
        <span className="flex flex-wrap items-center justify-between gap-2">
          {subjectName && <span className="rounded-md bg-surface-sunken px-2.5 py-0.5 text-sm font-semibold text-ink">{subjectName}</span>}
          <span className="text-sm text-ink-muted">
            {bp.exam_year ? `${bp.exam_year} · ` : ''}
            {bp.grade !== null ? t({ en: `Grade ${bp.grade} · `, vi: `Lớp ${bp.grade} · ` }) : ''}
            {t({
              en: `${bp.question_count} ${bp.question_count === 1 ? 'question' : 'questions'}`,
              vi: `${bp.question_count} câu`,
            })}
          </span>
        </span>
        <span className="text-base font-bold text-ink">{bp.name}</span>
        {bp.exam_code && (
          <span className="text-sm text-ink-muted">
            {t({ en: 'Code', vi: 'Mã đề' })}: <span className="font-semibold text-ink">{bp.exam_code}</span>
          </span>
        )}
        {bp.source && (
          <span className="text-sm text-ink-muted">
            {t({ en: 'Source', vi: 'Nguồn' })}: {bp.source}
          </span>
        )}
        <span className="text-sm font-semibold text-action">{t({ en: 'Start exam', vi: 'Vào thi' })}</span>
      </Link>
    </li>
  );
}

function CodingCard({ coding, subjectName }: { coding: HsgCoding; subjectName: string }) {
  const { t } = useLanguage();
  return (
    <li>
      <Link href={`/exam/hsg/${coding.slug}`} className={cardClass}>
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-md bg-surface-sunken px-2.5 py-0.5 text-sm font-semibold text-ink">{subjectName}</span>
          <span className="text-sm text-ink-muted">{t({ en: `${coding.count} ${coding.count === 1 ? 'problem' : 'problems'}`, vi: `${coding.count} bài` })}</span>
        </span>
        <span className="flex items-center gap-2 text-base font-bold text-ink">
          <Code2 aria-hidden="true" className="h-5 w-5 shrink-0 text-action" />
          {t({ en: 'Programming problems', vi: 'Luyện lập trình' })}
        </span>
        <span className="text-sm text-ink-muted">
          {t({ en: 'Submit your code and the judge runs it on the sample and hidden tests.', vi: 'Nộp code để máy chấm chạy trên test mẫu và test ẩn.' })}
        </span>
        <span className="text-sm font-semibold text-action">{t({ en: 'Open problem list', vi: 'Xem danh sách bài' })}</span>
      </Link>
    </li>
  );
}

export function ExamBlueprintList({ blueprints, hsgCoding = [] }: { blueprints: BlueprintSummary[]; hsgCoding?: HsgCoding[] }) {
  const { lang, t } = useLanguage();
  const nameOf = (bp: BlueprintSummary) =>
    lang === 'en' ? (bp.subject_name_en ?? bp.subject_name_vi) : bp.subject_name_vi;
  const codingName = (c: HsgCoding) => (lang === 'en' ? (c.name_en ?? c.name_vi) : c.name_vi);
  const coding = hsgCoding.filter((c) => c.count > 0);
  // Classify by subject: chips above the list, "All" by default.
  const [subject, setSubject] = useState<string | null>(null);
  const subjects = [
    ...new Map([
      ...blueprints.flatMap((bp) => (bp.subject_slug ? [[bp.subject_slug, nameOf(bp) ?? bp.subject_slug] as const] : [])),
      ...coding.map((c) => [c.slug, codingName(c)] as const),
    ]).entries(),
  ];
  const shown = subject ? blueprints.filter((bp) => bp.subject_slug === subject) : blueprints;
  const shownCoding = subject ? coding.filter((c) => c.slug === subject) : coding;
  const chip = (active: boolean) =>
    `min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
      active ? 'border-action bg-action text-action-ink' : 'border-edge bg-surface text-ink hover:bg-surface-sunken'
    }`;
  const byYear = (a: BlueprintSummary, b: BlueprintSummary) => (b.exam_year ?? 0) - (a.exam_year ?? 0);

  // Gifted-student training comes first, split by subject; a subject with programming problems
  // leads with the card to its problem list. Its exams are listed here whatever their format.
  const isHsg = (bp: BlueprintSummary) => bp.category === 'hsg';
  const hsgExams = shown.filter(isHsg).sort(byYear);
  const hsgSubjects = [
    ...new Map([
      ...shownCoding.map((c) => [c.slug, codingName(c)] as const),
      ...hsgExams.map((bp) => [bp.subject_slug ?? '', nameOf(bp) ?? ''] as const),
    ]).entries(),
  ].map(([slug, name]) => ({
    slug,
    name,
    coding: shownCoding.find((c) => c.slug === slug),
    exams: hsgExams.filter((bp) => (bp.subject_slug ?? '') === slug),
  }));
  const hsgCount = hsgSubjects.reduce((n, s) => n + s.exams.length + (s.coding ? 1 : 0), 0);
  const hsgTitle = t({ en: 'Gifted-student training', vi: 'Bồi dưỡng HSG' });

  const sections = [
    { format: 'thptqg', title: t({ en: 'National High School Graduation Exam (THPTQG)', vi: 'Kỳ thi tốt nghiệp THPT (THPTQG)' }) },
    { format: 'dgnl_hcm', title: t({ en: 'Competency Assessment (ĐGNL)', vi: 'Kỳ thi Đánh giá năng lực (ĐGNL)' }) },
    { format: 'generic', title: t({ en: 'Other practice exams', vi: 'Đề luyện tập khác' }) },
  ]
    .map((s) => ({ ...s, items: shown.filter((bp) => !isHsg(bp) && (bp.format ?? 'generic') === s.format).sort(byYear) }))
    .filter((s) => s.items.length > 0);
  return (
    <div className="flex flex-col gap-8">
      {subjects.length > 1 && (
        <div role="group" aria-label={t({ en: 'Filter by subject', vi: 'Lọc theo môn' })} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={subject === null} onClick={() => setSubject(null)} className={chip(subject === null)}>
            {t({ en: 'All subjects', vi: 'Tất cả môn' })}
          </button>
          {subjects.map(([slug, name]) => (
            <button key={slug} type="button" aria-pressed={subject === slug} onClick={() => setSubject(slug)} className={chip(subject === slug)}>
              {name}
            </button>
          ))}
        </div>
      )}
      {hsgCount > 0 && (
        <section aria-label={hsgTitle} className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-ink">
            {hsgTitle} ({hsgCount})
          </h2>
          {hsgSubjects.map(({ slug, name, coding: subjectCoding, exams }) => (
            <section key={slug} aria-label={`${hsgTitle} · ${name}`} className="flex flex-col gap-3">
              <h3 className="text-base font-semibold text-ink">{name}</h3>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {subjectCoding && <CodingCard coding={subjectCoding} subjectName={name} />}
                {exams.map((bp) => (
                  <ExamCard key={bp.id} bp={bp} subjectName={nameOf(bp)} />
                ))}
              </ul>
            </section>
          ))}
        </section>
      )}
      {sections.map(({ format, title: group, items }) => (
        <section key={format} aria-label={group} className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-ink">
            {group} ({items.length})
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((bp) => (
              <ExamCard key={bp.id} bp={bp} subjectName={nameOf(bp)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
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
