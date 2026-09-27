'use client';

import { useRef, type KeyboardEvent } from 'react';
import { useLanguage } from '@scipal/hooks';
import { LESSON_PARTS, PART_LABEL, type LessonPart } from '@/features/lessons/lessonParts';
import type { LessonIssue } from './lessonIssues';

interface PartTabsProps {
  active: LessonPart;
  counts: Record<LessonPart, number>;
  issues: LessonIssue[];
  onSelect: (part: LessonPart) => void;
}

/** Bài học · Mô phỏng · Tự luyện, with block counts and a dot where something needs a look. */
export function PartTabs({ active, counts, issues, onSelect }: PartTabsProps) {
  const { t } = useLanguage();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = (LESSON_PARTS.indexOf(active) + step + LESSON_PARTS.length) % LESSON_PARTS.length;
    onSelect(LESSON_PARTS[next]!);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={t({ en: 'Lesson parts', vi: 'Các phần của bài' })} onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-line">
      {LESSON_PARTS.map((part, i) => {
        const partIssues = issues.filter((issue) => issue.part === part);
        const blocking = partIssues.some((issue) => issue.blocking);
        const selected = part === active;
        return (
          <button
            key={part}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`editor-tab-${part}`}
            aria-selected={selected}
            aria-controls={`editor-panel-${part}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(part)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${
              selected ? 'border-action text-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t(PART_LABEL[part])}
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-xs tabular-nums text-ink-muted">{counts[part]}</span>
            {partIssues.length > 0 && (
              <>
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${blocking ? 'bg-danger' : 'bg-warning'}`} />
                <span className="sr-only">{t({ en: 'needs a look', vi: 'cần xem lại' })}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
