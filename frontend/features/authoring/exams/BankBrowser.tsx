'use client';

import { useEffect, useId, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { QuestionType } from '@scipal/types';
import { Button } from '@/components/ui/button';
import { listQuestions, type AuthorQuestion } from '../practice/api';
import { withPage } from '../practice/QuestionPicker';
import { QUESTION_TYPE_LABEL } from '../practice/questionDraft';
import { DIFFICULTY_LABEL, questionStem } from './QuestionBank';

interface BankBrowserProps {
  subjectId: string;
  /** Questions already in the exam. */
  excludeIds: string[];
  /** Only questions of this type (a section of a structured exam takes one kind). */
  type?: QuestionType;
  onAdd: (rows: AuthorQuestion[]) => void;
}

/** "Chọn từ ngân hàng": tick exam questions of this subject (published, or your own) to add. */
export function BankBrowser({ subjectId, excludeIds, type, onAdd }: BankBrowserProps) {
  const { t } = useLanguage();
  const id = useId();
  const [search, setSearch] = useState({ query: '', page: 1 });
  const [rows, setRows] = useState<AuthorQuestion[]>([]);
  const [more, setMore] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<{ en: string; vi: string } | null>(null);

  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      const res = await listQuestions({ usage: 'exam', subject_id: subjectId, type, q: search.query.trim() || undefined, page: search.page });
      if (!live) return;
      if (!res.ok) return setError(res.error);
      setError(null);
      setRows((old) => withPage(search.page === 1 ? [] : old, res.data).rows);
      setMore(withPage([], res.data).more);
    }, search.page === 1 ? 300 : 0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [search, subjectId, type]);

  const shown = rows.filter((row) => !excludeIds.includes(row.id) && (!type || row.type === type));
  const toggle = (rowId: string) => setPicked((old) => (old.includes(rowId) ? old.filter((x) => x !== rowId) : [...old, rowId]));

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {t({ en: 'Search by question text', vi: 'Tìm theo nội dung câu hỏi' })}
      </label>
      <input
        id={id}
        type="search"
        maxLength={100}
        value={search.query}
        onChange={(e) => setSearch({ query: e.target.value, page: 1 })}
        className="min-h-11 rounded-lg border border-edge bg-surface px-3 text-sm text-ink"
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
      <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto">
        {shown.map((row) => (
          <li key={row.id}>
            <label className="flex min-h-11 cursor-pointer items-start gap-2 rounded-md border border-line p-2 text-sm text-ink">
              <input type="checkbox" checked={picked.includes(row.id)} onChange={() => toggle(row.id)} className="mt-0.5 h-5 w-5 accent-[var(--action)]" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2">{questionStem(row, t)}</span>
                <span className="text-xs text-ink-muted">
                  {t(QUESTION_TYPE_LABEL[row.type])} · {t(DIFFICULTY_LABEL[row.difficulty] ?? DIFFICULTY_LABEL[1]!)}
                  {row.status !== 'published' && ` · ${t({ en: 'your draft', vi: 'nháp của bạn' })}`}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="text-sm text-ink-muted">{t({ en: 'No questions to add.', vi: 'Không có câu hỏi để thêm.' })}</p>}
      <div className="flex flex-wrap gap-2">
        {more && (
          <Button type="button" variant="outline" onClick={() => setSearch((old) => ({ ...old, page: old.page + 1 }))}>
            {t({ en: 'Show more', vi: 'Xem thêm' })}
          </Button>
        )}
        <Button
          type="button"
          disabled={picked.length === 0}
          onClick={() => {
            onAdd(rows.filter((row) => picked.includes(row.id)));
            setPicked([]);
          }}
        >
          {t({ en: `Add ${picked.length} questions`, vi: `Thêm ${picked.length} câu` })}
        </Button>
      </div>
    </div>
  );
}
