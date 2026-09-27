'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchQuestionsByIds, type AuthorQuestion } from './api';

/** The lesson's practice questions as the editor knows them, shared by the block list and editors. */
export interface PracticeQuestions {
  lessonId: string;
  subjectId: string;
  rows: Readonly<Record<string, AuthorQuestion>>;
  /** Every id the lesson used when last loaded has been fetched (a missing one is gone). */
  loaded: boolean;
  failed: boolean;
  /** A question was created, saved or picked. */
  upsert: (row: AuthorQuestion) => void;
}

export const PracticeQuestionsContext = createContext<PracticeQuestions | null>(null);

export const usePracticeQuestions = () => useContext(PracticeQuestionsContext);

/** Load the questions behind these ids once each; later ids (picked or created) come in by `upsert`. */
export function usePracticeQuestionRows(lessonId: string, subjectId: string, ids: string[]): PracticeQuestions {
  const [rows, setRows] = useState<Record<string, AuthorQuestion>>({});
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);
  const requested = useRef(new Set<string>());
  const key = ids.join(',');

  useEffect(() => {
    const missing = ids.filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.current.add(id));
    setPending((n) => n + 1);
    void fetchQuestionsByIds(missing).then((res) => {
      if (res.ok) setRows((old) => ({ ...old, ...Object.fromEntries(res.data.questions.map((q) => [q.id, q])) }));
      else {
        missing.forEach((id) => requested.current.delete(id));
        setFailed(true);
      }
      setPending((n) => n - 1);
    });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const upsert = useCallback((row: AuthorQuestion) => {
    requested.current.add(row.id);
    setRows((old) => ({ ...old, [row.id]: row }));
  }, []);

  return useMemo(
    () => ({ lessonId, subjectId, rows, loaded: pending === 0 && !failed && ids.every((id) => requested.current.has(id)), failed, upsert }),
    [lessonId, subjectId, rows, pending, failed, key, upsert], // eslint-disable-line react-hooks/exhaustive-deps
  );
}
