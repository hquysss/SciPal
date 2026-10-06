'use client';

import { useId } from 'react';
import type { Block } from '@scipal/types';
import { noteKeysOfBlocks } from '@/components/blocks/remarkTerm';
import { noteAsTerm } from '@/components/blocks/terms/NoteMark';
import { useLessonTerms } from '@/components/blocks/terms/LessonTermsContext';
import { TermCard } from '@/components/blocks/terms/TermCard';

const HEADING = { en: 'Vocabulary in this lesson', vi: 'Từ vựng trong bài' };

/** The terms the lesson tags (glossary, then the teacher's own popovers), in order of first appearance; nothing when none. */
export function LessonTermsSection({ ids, blocks = [] }: { ids: string[]; blocks?: Block[] }) {
  const lesson = useLessonTerms();
  const headingId = useId();
  const own = lesson ? noteKeysOfBlocks(blocks, lesson.lang).map(({ block, key }) => noteAsTerm(key, block.notes![key])) : [];
  const seen = new Set<string>();
  const terms = lesson
    ? [...ids.flatMap((id) => lesson.terms.get(id) ?? []), ...own].filter((t) => {
        const k = t.term_vi.trim().toLowerCase();
        return !seen.has(k) && !!seen.add(k);
      })
    : [];
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
