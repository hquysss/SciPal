'use client';

import { useId } from 'react';
import { useLessonTerms } from '@/components/blocks/terms/LessonTermsContext';
import { TermCard } from '@/components/blocks/terms/TermCard';

const HEADING = { en: 'Vocabulary in this lesson', vi: 'Từ vựng trong bài' };

/** The terms the lesson tags, in the order they first appear; nothing when none is published. */
export function LessonTermsSection({ ids }: { ids: string[] }) {
  const lesson = useLessonTerms();
  const headingId = useId();
  const terms = lesson ? ids.flatMap((id) => lesson.terms.get(id) ?? []) : [];
  if (!lesson || terms.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 border-t border-line pt-6">
      <h2 id={headingId} className="text-xl font-bold text-ink">
        {HEADING[lesson.lang]}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {terms.map((term) => (
          <li key={term.id} className="rounded-xl border border-line bg-surface p-3">
            <TermCard term={term} lang={lesson.lang} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
