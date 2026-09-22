'use client';
import { useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { MCData } from '@scipal/types';

export interface QuizQuestion {
  id: string;
  data: MCData;
}

export function QuizBlock({ question }: { question: QuizQuestion }) {
  const { lang } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const data = question.data;

  if (!data || !data.stem || !data.options) {
    return null;
  }

  return (
    <div className="my-4 rounded-xl border-2 p-5 bg-white shadow-sm" style={{ borderColor: 'var(--accent, #16a34a)' }}>
      <p className="font-semibold text-gray-900 mb-3 text-base">
        {lang === 'en' ? data.stem.en : data.stem.vi}
      </p>
      <div className="space-y-2">
        {data.options.map((opt) => {
          const isCorrect = selected && opt.id === data.answer;
          const isWrong = selected === opt.id && opt.id !== data.answer;
          return (
            <button
              key={opt.id}
              disabled={!!selected}
              onClick={() => setSelected(opt.id)}
              className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition font-medium ${
                isCorrect
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : isWrong
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {lang === 'en' ? opt.text.en : opt.text.vi}
            </button>
          );
        })}
      </div>
    </div>
  );
}
