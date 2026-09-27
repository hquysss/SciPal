'use client';

import { useEffect, useId, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { LABEL, SMALL_BUTTON, TEXTAREA } from '../editor/editors/styles';
import { listPracticeQuestions, type AuthorQuestion, type QuestionPage } from './api';
import { QUESTION_TYPE_LABEL } from './questionDraft';

type Bilingual = { en: string; vi: string };

interface QuestionPickerProps {
  subjectId: string;
  /** Questions already in the lesson. */
  excludeIds: string[];
  onPick: (row: AuthorQuestion) => void;
  onCancel: () => void;
}

/** The loaded results after one more page arrives, and whether the server has more. */
export function withPage(loaded: AuthorQuestion[], page: QuestionPage): { rows: AuthorQuestion[]; more: boolean } {
  const seen = new Set(loaded.map((row) => row.id));
  const rows = [...loaded, ...page.questions.filter((row) => !seen.has(row.id))];
  return { rows, more: page.page * page.page_size < page.total };
}

/** "Lấy từ bài khác": find a published practice question of this subject by its Vietnamese text. */
export function QuestionPicker({ subjectId, excludeIds, onPick, onCancel }: QuestionPickerProps) {
  const { t } = useLanguage();
  const id = useId();
  // One search: its text and how many pages are loaded. New text starts again from page 1.
  const [search, setSearch] = useState({ query: '', page: 1 });
  const { query, page } = search;
  const [results, setResults] = useState<AuthorQuestion[] | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  const [searching, setSearching] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await listPracticeQuestions({ subject_id: subjectId, q: query.trim() || undefined, page });
      if (!live) return;
      setSearching(false);
      if (res.ok) {
        setResults((old) => withPage(page === 1 ? [] : old ?? [], res.data).rows);
        setMore(withPage([], res.data).more);
        setError(null);
      } else setError(res.error);
    }, page === 1 ? 300 : 0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, subjectId, page]);

  const shown = (results ?? []).filter((row) => !excludeIds.includes(row.id));
  const stem = (row: AuthorQuestion) => {
    const text = (row.data as { stem?: Bilingual }).stem;
    return text ? t(text) || text.vi : '';
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className={LABEL}>
          {t({ en: 'Find a published question of this subject', vi: 'Tìm câu hỏi đã duyệt của môn này' })}
        </label>
        <input id={id} type="search" value={query} onChange={(e) => setSearch({ query: e.target.value, page: 1 })} maxLength={100} className={TEXTAREA} />
      </div>
      <div aria-live="polite" className="flex flex-col gap-2">
        {error && <p className="text-sm text-danger">{t(error)}</p>}
        {searching && <p className="text-sm text-ink-muted">{t({ en: 'Searching…', vi: 'Đang tìm…' })}</p>}
        {!searching && results && shown.length === 0 && (
          <p className="text-sm text-ink-muted">{t({ en: 'No published question found.', vi: 'Không có câu hỏi đã duyệt phù hợp.' })}</p>
        )}
        {shown.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {shown.map((row) => (
              <li key={row.id} className="flex items-center gap-2 rounded-md border border-line p-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{stem(row)}</span>
                  <span className="text-xs text-ink-muted">{t(QUESTION_TYPE_LABEL[row.type])}</span>
                </span>
                <button type="button" onClick={() => onPick(row)} className={SMALL_BUTTON}>
                  {t({ en: 'Insert', vi: 'Chèn' })}
                </button>
              </li>
            ))}
          </ul>
        )}
        {more && !searching && (
          <button type="button" onClick={() => setSearch((old) => ({ ...old, page: old.page + 1 }))} className={`${SMALL_BUTTON} self-start`}>
            {t({ en: 'Show more', vi: 'Xem thêm' })}
          </button>
        )}
      </div>
      <button type="button" onClick={onCancel} className={`${SMALL_BUTTON} self-start`}>
        {t({ en: 'Cancel', vi: 'Hủy' })}
      </button>
    </div>
  );
}
