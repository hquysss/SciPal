'use client';

import { SubjectIcon } from '@/components/subject/SubjectIcon';
import { levelOfGrade } from '@/features/landing/educationLevel';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import type { LessonDetail } from './lessonDetailQuery';

type HeaderLesson = Pick<LessonDetail, 'title_en' | 'title_vi' | 'source' | 'grade' | 'topics' | 'subjects'>;

export function LessonHeader({ lesson }: { lesson: HeaderLesson }) {
  const { lang, t } = useLanguage();
  const subjectName = lang === 'en' ? lesson.subjects.name_en : lesson.subjects.name_vi;
  const topicName = lang === 'en' ? lesson.topics.name_en : lesson.topics.name_vi;
  const title = lang === 'en' ? lesson.title_en : lesson.title_vi;
  const otherTitle = lang === 'en' ? lesson.title_vi : lesson.title_en;
  const crumbLink =
    'rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

  return (
    <header className="mb-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className={crumbLink}>
              {t({ en: 'Home', vi: 'Trang chủ' })}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li>
            <Link href={`/${lesson.subjects.slug}`} className={crumbLink}>
              {subjectName}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li className="text-ink-muted">{topicName}</li>
        </ol>
      </nav>

      <p className="inline-flex items-center gap-2 rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] px-2.5 py-1 text-sm font-semibold text-accent-ink">
        <span aria-hidden="true" className="[--subject-icon:1.6rem]"><SubjectIcon slug={lesson.subjects.slug} glyph={lesson.subjects.icon} level={levelOfGrade(lesson.grade)} /></span>
        <span>{t({ en: `${lesson.subjects.name_en}, grade ${lesson.grade}`, vi: `${lesson.subjects.name_vi}, lớp ${lesson.grade}` })}</span>
      </p>

      <h1 className="mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-2 text-base text-ink-muted">{otherTitle}</p>
      {lesson.source && (
        <p className="mt-1 text-sm text-ink-muted">
          {t({ en: 'Source', vi: 'Nguồn' })}: <cite className="not-italic">{lesson.source}</cite>
        </p>
      )}
    </header>
  );
}
