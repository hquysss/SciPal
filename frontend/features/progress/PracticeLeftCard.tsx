'use client';

import Link from 'next/link';
import { ArrowRight, ListChecks } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { PracticeLeftLesson } from './practiceRemaining';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** "Bài đang làm dở": lessons whose Tự luyện was started and has questions left. Nothing when there are none. */
export function PracticeLeftCard({ lessons }: { lessons: PracticeLeftLesson[] }) {
  const { t } = useLanguage();
  if (lessons.length === 0) return null;
  return (
    <section aria-labelledby="practice-left-title" className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface))] text-ink">
          <ListChecks className="h-5 w-5" />
        </span>
        <div>
          <h2 id="practice-left-title" className="text-lg font-bold text-ink">{t({ en: 'Practice in progress', vi: 'Bài đang làm dở' })}</h2>
          <p className="text-sm text-ink-muted">{t({ en: 'Lessons with practice questions you have not done yet', vi: 'Bài còn câu tự luyện chưa làm' })}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {lessons.map((lesson) => (
          <li key={lesson.lesson_id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-sunken p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink" title={t(lesson.title)}>{t(lesson.title)}</p>
              <p className="text-sm text-ink-muted">
                {t({
                  en: `Done ${lesson.done}/${lesson.total} · ${lesson.remaining} ${lesson.remaining === 1 ? 'question' : 'questions'} left`,
                  vi: `Đã làm ${lesson.done}/${lesson.total} · còn ${lesson.remaining} câu`,
                })}
              </p>
            </div>
            <Link
              href={`/${lesson.subject_slug}/${lesson.slug}`}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-surface-sunken ${FOCUS}`}
            >
              {t({ en: 'Continue', vi: 'Làm tiếp' })}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
