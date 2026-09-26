'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import type { EducationLevel } from '../landing/educationLevel';
import { LevelLine } from './SubjectPageNotices';

interface SubjectHeaderProps {
  subject: { slug: string; name_en: string; name_vi: string; icon: string; levels: EducationLevel[] };
  topicCount: number;
  lessonCount: number;
}

export function SubjectHeader({ subject, topicCount, lessonCount }: SubjectHeaderProps) {
  const { lang, t } = useLanguage();
  const name = lang === 'en' ? subject.name_en : subject.name_vi;
  const counts = t({
    en: `${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}, ${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}`,
    vi: `${topicCount} chủ đề, ${lessonCount} bài học`,
  });

  return (
    <header className="mb-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link
          href="/"
          className="rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t({ en: 'Home', vi: 'Trang chủ' })}
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-2xl text-accent-ink"
        >
          {subject.icon}
        </span>
        <div>
          <h1 className="text-3xl font-bold text-ink">{name}</h1>
          <LevelLine levels={subject.levels} />
        </div>
      </div>
      <p className="mt-4 text-base text-ink-muted">{counts}</p>
    </header>
  );
}
