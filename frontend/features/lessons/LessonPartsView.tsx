'use client';

import { useState, type ReactNode } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { Block } from '@scipal/types';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { LessonSheet } from '@/components/blocks/LessonSheet';
import { buttonVariants } from '@/components/ui/button';
import { LESSON_PARTS, PART_LABEL, splitLessonParts, type LessonPart } from './lessonParts';
import { PracticeSection, usePracticeState } from './PracticeSection';
import { fetchLessonPractice, type PracticeLoad } from './practiceApi';

interface LessonPartsProps {
  blocks: Block[];
  /** Shown after the last part (the learner's "complete lesson" bar). */
  completion?: ReactNode;
  /** Editor preview: show only this part, without tabs or completion. */
  part?: LessonPart;
  /** Preview in this language instead of the reader's. */
  lang?: 'en' | 'vi';
  /** Show the blocks on the notebook sheet (learner page); `squared` for primary grades. */
  sheet?: { squared: boolean };
  /** The Tự luyện questions, without answers (loaded by the page, or built by the editor). */
  practice?: PracticeLoad;
  /** Lets the learner reload the questions after a failed load. */
  lessonId?: string;
}

/** A lesson read in steps: Bài học → Mô phỏng → Tự luyện; parts without blocks are skipped. */
export function LessonPartsView({ blocks, completion, part, sheet, lang, practice, lessonId }: LessonPartsProps) {
  const { t } = useLanguage();
  // Owned here, above the tabs, so answers and verdicts survive switching parts during the visit.
  const practiceState = usePracticeState();
  const [reloaded, setReloaded] = useState<PracticeLoad | null>(null);
  const practiceLoad = reloaded ?? practice;
  const parts = splitLessonParts(blocks);
  const present = LESSON_PARTS.filter((p) => parts[p].length > 0);
  const [active, setActive] = useState<LessonPart>(present[0] ?? 'lesson');
  const shown = part ?? (present.includes(active) ? active : (present[0] ?? 'lesson'));
  const tabbed = !part && present.length > 1;

  const content = (
    <div className="flex flex-col gap-7" role={tabbed ? 'tabpanel' : undefined} id={tabbed ? `part-${shown}` : undefined}>
      {shown === 'practice' && practiceLoad ? (
        <PracticeSection
          load={practiceLoad}
          state={practiceState.state}
          onAnswer={practiceState.onAnswer}
          onResult={practiceState.onResult}
          onRetry={lessonId ? () => void fetchLessonPractice(lessonId).then(setReloaded) : undefined}
          lang={lang}
        />
      ) : (
        parts[shown].map((block, i) => <BlockRenderer key={i} block={block} lang={lang} />)
      )}
    </div>
  );
  const body = sheet ? <LessonSheet squared={sheet.squared}>{content}</LessonSheet> : content;
  if (part) return <>{body}</>;
  if (!tabbed) return <>{body}{completion}</>;

  const position = present.indexOf(shown);
  const next = present[position + 1];
  const go = (p: LessonPart) => {
    setActive(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={t({ en: 'Lesson parts', vi: 'Các phần của bài' })} className="flex gap-1 overflow-x-auto border-b border-line">
        {present.map((p, i) => (
          <button
            key={p}
            type="button"
            role="tab"
            id={`tab-${p}`}
            aria-selected={p === shown}
            aria-controls={`part-${p}`}
            onClick={() => setActive(p)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${
              p === shown ? 'border-accent text-accent-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <span aria-hidden="true" className="tabular-nums">{i + 1}</span>
            {t(PART_LABEL[p])}
          </button>
        ))}
      </div>
      {body}
      {next ? (
        <button type="button" onClick={() => go(next)} className={`${buttonVariants({ size: 'lg' })} self-end`}>
          {t({ en: 'Next', vi: 'Tiếp theo' })}: {t(PART_LABEL[next])} →
        </button>
      ) : (
        completion
      )}
    </div>
  );
}
