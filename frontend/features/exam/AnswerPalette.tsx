'use client';

import { useLanguage } from '@scipal/hooks';

interface AnswerPaletteProps {
  total: number;
  currentIndex: number;
  answers: Record<number, unknown>;
  onSelect: (index: number) => void;
}

export function AnswerPalette({ total, currentIndex, answers, onSelect }: AnswerPaletteProps) {
  const { t } = useLanguage();
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white/90 p-4 sm:p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90">
      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5 dark:border-gray-800">
        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
          📋 {t({ en: 'Question Grid', vi: 'Bảng theo dõi câu hỏi' })}
        </h4>
        <span className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1 rounded-full">
          {answeredCount} / {total} {t({ en: 'answered', vi: 'đã làm' })}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: total }, (_, i) => {
          const isAnswered = answers[i] !== undefined;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              aria-label={`Câu ${i + 1}`}
              className={`relative flex h-11 w-full items-center justify-center rounded-xl font-mono text-sm font-black transition duration-150 active:scale-95 ${
                isCurrent
                  ? 'border-2 border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs ring-2 ring-emerald-500/20 dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-200'
                  : isAnswered
                  ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                  : 'border border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span>{i + 1}</span>
              {isAnswered && !isCurrent && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-white opacity-80" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
