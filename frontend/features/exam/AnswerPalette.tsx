'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@scipal/hooks';

type Bilingual = { en: string; vi: string };

export interface AnswerPaletteSection {
  key: string;
  title: Bilingual;
  /** Index of the section's first question. */
  start: number;
  count: number;
}

interface AnswerPaletteProps {
  total: number;
  currentIndex: number;
  answers: Record<number, unknown>;
  onSelect: (index: number) => void;
  /** Groups the cells under section headings; absent means one grid for the whole exam. */
  sections?: AnswerPaletteSection[];
}

const CELL = 'relative flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors lg:w-auto';
const ANSWERED = 'answer-pop bg-action text-action-ink hover:bg-action-hover';
const UNANSWERED = 'border border-edge bg-surface text-ink hover:bg-surface-sunken';
const CURRENT = 'outline outline-2 outline-offset-2 outline-focus';
// One row that scrolls sideways on a phone; a compact grid in the side column on a desktop.
const GRID = 'flex gap-1.5 lg:grid lg:grid-cols-5';

/** Sections are used only when they cover every question once, in order; otherwise one grid shows. */
function coversAll(sections: AnswerPaletteSection[] | undefined, total: number): sections is AnswerPaletteSection[] {
  if (!sections?.length) return false;
  let next = 0;
  for (const section of sections) {
    if (section.start !== next || section.count < 1) return false;
    next += section.count;
  }
  return next === total;
}

export function AnswerPalette({ total, currentIndex, answers, onSelect, sections }: AnswerPaletteProps) {
  const { lang, t } = useLanguage();
  const answeredCount = Object.keys(answers).length;
  const currentRef = useRef<HTMLButtonElement>(null);
  // Keep the current cell in view when the strip scrolls sideways.
  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [currentIndex]);

  const cell = (i: number) => {
    const isAnswered = answers[i] !== undefined;
    const isCurrent = i === currentIndex;
    const state = isAnswered
      ? t({ en: 'answered', vi: 'đã trả lời' })
      : t({ en: 'not answered', vi: 'chưa trả lời' });
    return (
      <button
        key={i}
        ref={isCurrent ? currentRef : undefined}
        type="button"
        onClick={() => onSelect(i)}
        aria-label={t({ en: `Question ${i + 1}, ${state}`, vi: `Câu ${i + 1}, ${state}` })}
        aria-current={isCurrent ? 'step' : undefined}
        className={`${CELL} ${isAnswered ? ANSWERED : UNANSWERED} ${isCurrent ? CURRENT : ''} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
      >
        {i + 1}
      </button>
    );
  };
  const range = (start: number, count: number) => Array.from({ length: count }, (_, k) => cell(start + k));

  return (
    <section className="rounded-xl border border-line bg-surface p-3 sm:p-4 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <h2 className="text-sm font-bold text-ink">{t({ en: 'Question grid', vi: 'Bảng theo dõi câu hỏi' })}</h2>
        <span className="rounded-md bg-surface-sunken px-3 py-1 text-sm font-semibold tabular-nums text-ink">
          {answeredCount} / {total} {t({ en: 'answered', vi: 'đã làm' })}
        </span>
      </div>

      {coversAll(sections, total) ? (
        <div className="flex gap-4 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {sections.map((section) => {
            const title = lang === 'en' ? section.title.en.trim() || section.title.vi : section.title.vi.trim() || section.title.en;
            return (
              <div key={`${section.key}-${section.start}`} role="group" aria-label={title} className="flex shrink-0 flex-col gap-1.5 lg:shrink">
                <h3 className="whitespace-nowrap text-xs font-semibold text-ink-muted lg:whitespace-normal">{title}</h3>
                <div className={GRID}>{range(section.start, section.count)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`${GRID} overflow-x-auto pb-1 lg:overflow-visible`}>{range(0, total)}</div>
      )}

      <ul className="mt-2 hidden flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted lg:flex">
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-4 w-4 rounded bg-action" />
          {t({ en: 'Answered', vi: 'Đã trả lời' })}
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-4 w-4 rounded border border-edge bg-surface" />
          {t({ en: 'Not answered', vi: 'Chưa trả lời' })}
        </li>
        <li className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-4 w-4 rounded border border-edge bg-surface outline outline-2 outline-offset-1 outline-focus" />
          {t({ en: 'Current question', vi: 'Câu đang xem' })}
        </li>
      </ul>
    </section>
  );
}
