'use client';

import { useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { QUESTION_TYPES, type QuestionType } from '@scipal/types';
import { Button } from '@/components/ui/button';
import { QUESTION_TYPE_LABEL } from '../practice/questionDraft';
import { drawExamQuestions, type DrawResult } from './api';
import { DIFFICULTY_LABEL } from './QuestionBank';

type Row = { type: QuestionType; difficulty: 1 | 2 | 3; n: number };
const SELECT = 'min-h-11 rounded-lg border border-edge bg-surface px-2 text-sm text-ink';

interface DrawPanelProps {
  subjectId: string;
  grade: number | null;
  excludeIds: string[];
  onDrawn: (ids: string[]) => void;
}

/** "Bốc ngẫu nhiên": counts per type × difficulty; the server draws once and reports shortfalls. */
export function DrawPanel({ subjectId, grade, excludeIds, onDrawn }: DrawPanelProps) {
  const { t } = useLanguage();
  const ids = useId();
  const [rows, setRows] = useState<Row[]>([{ type: 'mc', difficulty: 1, n: 5 }]);
  const [shortfalls, setShortfalls] = useState<DrawResult['shortfalls']>([]);
  const [error, setError] = useState<{ en: string; vi: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (i: number, patch: Partial<Row>) => setRows((old) => old.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  const draw = async () => {
    setBusy(true);
    const res = await drawExamQuestions({ subject_id: subjectId, grade: grade ?? undefined, exclude_ids: excludeIds, counts: rows });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setError(null);
    setShortfalls(res.data.shortfalls);
    onDrawn(res.data.question_ids);
  };

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => {
        const short = shortfalls.find((s) => s.type === row.type && s.difficulty === row.difficulty);
        return (
          <fieldset key={i} className="flex flex-wrap items-end gap-2">
            <legend className="sr-only">{t({ en: `Row ${i + 1}`, vi: `Dòng ${i + 1}` })}</legend>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink" htmlFor={`${ids}-type-${i}`}>
              {t({ en: 'Type', vi: 'Dạng' })}
              <select id={`${ids}-type-${i}`} value={row.type} onChange={(e) => set(i, { type: e.target.value as QuestionType })} className={SELECT}>
                {QUESTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(QUESTION_TYPE_LABEL[type])}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink" htmlFor={`${ids}-diff-${i}`}>
              {t({ en: 'Difficulty', vi: 'Mức độ' })}
              <select id={`${ids}-diff-${i}`} value={row.difficulty} onChange={(e) => set(i, { difficulty: Number(e.target.value) as 1 | 2 | 3 })} className={SELECT}>
                {[1, 2, 3].map((d) => (
                  <option key={d} value={d}>
                    {t(DIFFICULTY_LABEL[d]!)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink" htmlFor={`${ids}-n-${i}`}>
              {t({ en: 'How many', vi: 'Số câu' })}
              <input
                id={`${ids}-n-${i}`}
                type="number"
                min={1}
                max={200}
                value={row.n}
                onChange={(e) => set(i, { n: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
                className={`${SELECT} w-20`}
              />
            </label>
            {rows.length > 1 && (
              <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Remove row ${i + 1}`, vi: `Xóa dòng ${i + 1}` })} onClick={() => setRows((old) => old.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden="true" />
              </Button>
            )}
            {short && (
              <p className="w-full text-sm text-warning">
                {t({ en: `Only ${short.got} of ${short.wanted} available.`, vi: `Chỉ có ${short.got}/${short.wanted} câu phù hợp.` })}
              </p>
            )}
          </fieldset>
        );
      })}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {rows.length < 9 && (
          <Button type="button" variant="outline" onClick={() => setRows((old) => [...old, { type: 'mc', difficulty: 1, n: 1 }])}>
            {t({ en: 'Add a row', vi: 'Thêm dòng' })}
          </Button>
        )}
        <Button type="button" disabled={busy} onClick={() => void draw()}>
          {t({ en: 'Draw', vi: 'Bốc câu' })}
        </Button>
      </div>
    </div>
  );
}
