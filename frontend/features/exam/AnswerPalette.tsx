'use client';

import { useLanguage } from '@scipal/hooks';

interface AnswerPaletteProps {
  total: number;
  currentIndex: number;
  answers: Record<number, unknown>;
  onSelect: (index: number) => void;
}

const CELL = 'relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sm font-bold transition-colors';
const ANSWERED = 'bg-action text-action-ink hover:bg-action-hover';
const UNANSWERED = 'border border-edge bg-surface text-ink hover:bg-surface-sunken';
const CURRENT = 'outline outline-2 outline-offset-2 outline-focus';

export function AnswerPalette({ total, currentIndex, answers, onSelect }: AnswerPaletteProps) {
  const { t } = useLanguage();
  const answeredCount = Object.keys(answers).length;

  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
        <h2 className="text-sm font-bold text-ink">{t({ en: 'Question grid', vi: 'Bảng theo dõi câu hỏi' })}</h2>
        <span className="rounded-md bg-surface-sunken px-3 py-1 text-sm font-semibold tabular-nums text-ink">
          {answeredCount} / {total} {t({ en: 'answered', vi: 'đã làm' })}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: total }, (_, i) => {
          const isAnswered = answers[i] !== undefined;
          const isCurrent = i === currentIndex;
          const state = isAnswered
            ? t({ en: 'answered', vi: 'đã trả lời' })
            : t({ en: 'not answered', vi: 'chưa trả lời' });
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={t({ en: `Question ${i + 1}, ${state}`, vi: `Câu ${i + 1}, ${state}` })}
              aria-current={isCurrent ? 'step' : undefined}
              className={`${CELL} ${isAnswered ? ANSWERED : UNANSWERED} ${isCurrent ? CURRENT : ''} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-muted">
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
