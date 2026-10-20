'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { Block } from '@scipal/types';
import { autoTagBlocks, type TermIndexEntry } from '@/components/blocks/autoTerms';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { LessonSheet } from '@/components/blocks/LessonSheet';
import { termIdsOfBlocks } from '@/components/blocks/remarkTerm';
import { LessonTermsProvider } from '@/components/blocks/terms/LessonTermsContext';
import { buttonVariants } from '@/components/ui/button';
import { SelectionLookup } from '@/features/dictionary/SelectionLookup';
import { PART_LABEL, splitLessonParts, type LessonPart } from './lessonParts';
import { LessonTermsSection } from './LessonTermsSection';
import { LessonVideoPanel, useLessonVideo } from './LessonVideoPanel';
import { PracticeSection, usePracticeState } from './PracticeSection';
import { fetchLessonPractice, type PracticeLoad } from './practiceApi';

interface LessonPartsProps {
  blocks: Block[];
  /** Editor preview: show only this part, without tabs. */
  part?: LessonPart;
  /** Preview in this language instead of the reader's. */
  lang?: 'en' | 'vi';
  /** Show the blocks on the notebook sheet (learner page); `squared` for primary grades. */
  sheet?: { squared: boolean };
  /** The Tự luyện questions, without answers (loaded by the page, or built by the editor). */
  practice?: PracticeLoad;
  /** Lets the learner reload the questions after a failed load. */
  lessonId?: string;
  /** The subject's terms: their first use in the lesson text is tagged for the learner (Bài học only, never Tự luyện). */
  termIndex?: TermIndexEntry[];
}

/** The learner's steps: the lesson with its simulations on one page, then Tự luyện. */
type Step = 'lesson' | 'video' | 'practice';
const STEPS: readonly Step[] = ['lesson', 'video', 'practice'];
const STEP_LABEL: Record<Step, { en: string; vi: string }> = { ...PART_LABEL, video: { en: 'Video', vi: 'Video' } };

/**
 * A lesson read in two steps: Bài học (theory and simulations together, in the order the teacher
 * wrote them) → Tự luyện; a step without blocks is skipped. The editor previews one of its two
 * parts at a time through `part`.
 */
export function LessonPartsView({ blocks: written, part, sheet, lang, practice, lessonId, termIndex }: LessonPartsProps) {
  const { t, lang: readerLang } = useLanguage();
  // Owned here, above the tabs, so answers and verdicts survive switching parts during the visit.
  const practiceState = usePracticeState();
  const [reloaded, setReloaded] = useState<PracticeLoad | null>(null);
  const practiceLoad = reloaded ?? practice;
  // The teacher's own tags stay; the subject's other terms are tagged on top, once each.
  const blocks = useMemo(() => autoTagBlocks(written, termIndex ?? []), [written, termIndex]);
  const parts = splitLessonParts(blocks);
  const steps: Record<Step, Block[]> = {
    lesson: parts.lesson,
    video: [],
    practice: parts.practice,
  };
  // The Video tab is the learner's page only, and only when the lesson has a video (or an admin may add one).
  const lessonVideo = useLessonVideo(part ? undefined : lessonId);
  // The learner's page always shows Tự luyện (an empty one says it is not ready); the editor decides by blocks.
  const present = STEPS.filter((p) => steps[p].length > 0 || (p === 'practice' && !!lessonId) || (p === 'video' && lessonVideo.showTab));
  const [active, setActive] = useState<Step>(present[0] ?? 'lesson');
  const step = present.includes(active) ? active : (present[0] ?? 'lesson');
  const shownBlocks = part ? parts[part] : steps[step];
  const showPractice = part ? part === 'practice' : step === 'practice';
  const shown = part ?? step;
  const tabbed = !part && present.length > 1;
  // Every term either language tags, loaded once; the list at the end of Bài học shows the reading language's.
  const termIds = [...new Set([...termIdsOfBlocks(blocks, 'vi'), ...termIdsOfBlocks(blocks, 'en')])];
  // The learner's page can look up any selected word; the editor's preview (no lesson id) cannot.
  const wrap = (node: ReactNode) => (
    <LessonTermsProvider ids={termIds} lang={lang}>
      {lessonId ? <SelectionLookup lessonId={lessonId}>{node}</SelectionLookup> : node}
    </LessonTermsProvider>
  );

  const content = (
    <div className="flex flex-col gap-7" role={tabbed ? 'tabpanel' : undefined} id={tabbed ? `part-${shown}` : undefined}>
      {step === 'video' && !part && lessonId && lessonVideo.video ? (
        <LessonVideoPanel lessonId={lessonId} video={lessonVideo.video} onChanged={lessonVideo.reload} />
      ) : showPractice && practiceLoad ? (
        <PracticeSection
          load={practiceLoad}
          state={practiceState.state}
          onAnswer={practiceState.onAnswer}
          onResult={practiceState.onResult}
          onQuestion={practiceState.onQuestion}
          onWritingFeedback={practiceState.onWritingFeedback}
          onRetry={lessonId ? () => void fetchLessonPractice(lessonId).then(setReloaded) : undefined}
          lang={lang}
        />
      ) : (
        shownBlocks.map((block, i) => <BlockRenderer key={i} block={block} lang={lang} />)
      )}
      {shown === 'lesson' && <LessonTermsSection ids={termIdsOfBlocks(parts.lesson, lang ?? readerLang)} blocks={parts.lesson} />}
    </div>
  );
  const body = sheet ? <LessonSheet squared={sheet.squared}>{content}</LessonSheet> : content;
  if (part) return wrap(body);
  if (!tabbed) return wrap(body);

  const position = present.indexOf(step);
  const next = present[position + 1];
  const go = (p: Step) => {
    setActive(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return wrap(
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label={t({ en: 'Lesson parts', vi: 'Các phần của bài' })} className="flex gap-1 overflow-x-auto border-b border-line">
        {present.map((p, i) => (
          <button
            key={p}
            type="button"
            role="tab"
            id={`tab-${p}`}
            aria-selected={p === step}
            aria-controls={`part-${p}`}
            onClick={() => setActive(p)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors ${
              p === step ? 'border-accent text-accent-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            <span aria-hidden="true" className="tabular-nums">{i + 1}</span>
            {t(STEP_LABEL[p])}
          </button>
        ))}
      </div>
      {body}
      {next && (
        <button type="button" onClick={() => go(next)} className={`${buttonVariants({ size: 'lg' })} self-end`}>
          {t({ en: 'Next', vi: 'Tiếp theo' })}: {t(STEP_LABEL[next])} →
        </button>
      )}
    </div>
  );
}
