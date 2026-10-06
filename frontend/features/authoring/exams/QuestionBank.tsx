'use client';

import { MathText } from '@/components/math/MathText';
import { useEffect, useId, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { QUESTION_TYPES, type QuestionStatus, type QuestionType } from '@scipal/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { LessonStatusBadge } from '../lessonStatusBadge';
import type { AuthoringSubjectOption } from '../authoringQueries';
import { deleteQuestion, listQuestions, type AuthorQuestion, type QuestionFilters } from '../practice/api';
import { QuestionEditor } from '../practice/QuestionEditor';
import { withPage } from '../practice/QuestionPicker';
import { emptyQuestion, QUESTION_TYPE_LABEL } from '../practice/questionDraft';

type Bilingual = { en: string; vi: string };

export const DIFFICULTY_LABEL: Record<number, Bilingual> = {
  1: { en: 'Easy', vi: 'Dễ' },
  2: { en: 'Medium', vi: 'Vừa' },
  3: { en: 'Hard', vi: 'Khó' },
};
const STATUS_LABEL: Record<QuestionStatus, Bilingual> = {
  draft: { en: 'Draft', vi: 'Nháp' },
  pending_review: { en: 'Waiting for review', vi: 'Chờ duyệt' },
  published: { en: 'Published', vi: 'Đã duyệt' },
};
const SELECT = 'min-h-11 rounded-lg border border-edge bg-surface px-3 text-sm text-ink';

/** The stem of a question in the reader's language, for a one-line list. */
export function questionStem(row: AuthorQuestion, t: (text: Bilingual) => string): string {
  const stem = (row.data as { stem?: Bilingual }).stem;
  return stem ? t(stem) || stem.vi : '';
}

/** The exam question bank: filter, write, edit and delete exam questions. */
export function QuestionBank({ subjects }: { subjects: AuthoringSubjectOption[] }) {
  const { t } = useLanguage();
  const ids = useId();
  const [filters, setFilters] = useState<Omit<QuestionFilters, 'usage' | 'page'>>({});
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuthorQuestion[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);
  const [editing, setEditing] = useState<AuthorQuestion | 'new' | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!filters.subject_id) return;
    let live = true;
    setLoading(true);
    void listQuestions({ usage: 'exam', ...filters, page }).then((res) => {
      if (!live) return;
      setLoading(false);
      if (!res.ok) return setError(res.error);
      setError(null);
      setRows((old) => withPage(page === 1 ? [] : old, res.data).rows);
      setMore(withPage([], res.data).more);
    });
    return () => {
      live = false;
    };
  }, [filters, page, reload]);

  const setFilter = (patch: Partial<typeof filters>) => {
    setFilters((old) => ({ ...old, ...patch }));
    setPage(1);
  };
  const subject = subjects.find((s) => s.id === filters.subject_id);
  const refresh = () => {
    setPage(1);
    setReload((n) => n + 1);
  };
  const remove = async (id: string) => {
    const res = await deleteQuestion(id);
    setConfirming(null);
    if (!res.ok) return setError(res.error);
    setRows((old) => old.filter((row) => row.id !== id));
  };

  const select = (key: string, label: Bilingual, value: string, onChange: (value: string) => void, options: Array<[string, string]>, any: Bilingual) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${ids}-${key}`} className="text-sm font-semibold text-ink">
        {t(label)}
      </label>
      <select id={`${ids}-${key}`} value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>
        <option value="">{t(any)}</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {select('subject', { en: 'Subject', vi: 'Môn học' }, filters.subject_id ?? '', (v) => setFilter({ subject_id: v || undefined }), subjects.map((s) => [s.id, t({ en: s.name_en, vi: s.name_vi })]), { en: 'Choose…', vi: 'Chọn môn…' })}
        {select('grade', { en: 'Grade', vi: 'Lớp' }, String(filters.grade ?? ''), (v) => setFilter({ grade: v ? Number(v) : undefined }), (subject?.grades ?? []).map((g) => [String(g), String(g)]), { en: 'All', vi: 'Tất cả' })}
        {select('type', { en: 'Type', vi: 'Dạng câu' }, filters.type ?? '', (v) => setFilter({ type: (v || undefined) as QuestionType | undefined }), QUESTION_TYPES.map((type) => [type, t(QUESTION_TYPE_LABEL[type])]), { en: 'All', vi: 'Tất cả' })}
        {select('difficulty', { en: 'Difficulty', vi: 'Mức độ' }, String(filters.difficulty ?? ''), (v) => setFilter({ difficulty: v ? (Number(v) as 1 | 2 | 3) : undefined }), [1, 2, 3].map((d) => [String(d), t(DIFFICULTY_LABEL[d]!)]), { en: 'All', vi: 'Tất cả' })}
        {select('status', { en: 'Status', vi: 'Trạng thái' }, filters.status ?? '', (v) => setFilter({ status: (v || undefined) as QuestionStatus | undefined }), (Object.keys(STATUS_LABEL) as QuestionStatus[]).map((s) => [s, t(STATUS_LABEL[s])]), { en: 'All', vi: 'Tất cả' })}
      </div>

      {!filters.subject_id ? (
        <EmptyState title={t({ en: 'Choose a subject to see its questions.', vi: 'Chọn môn học để xem câu hỏi.' })} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-muted" aria-live="polite">
              {loading ? t({ en: 'Loading…', vi: 'Đang tải…' }) : t({ en: `${rows.length} questions shown`, vi: `Đang hiện ${rows.length} câu` })}
            </p>
            <Button type="button" onClick={() => setEditing('new')}>
              {t({ en: 'Write a question', vi: 'Soạn câu mới' })}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-danger">
              {t(error)}
            </p>
          )}
          {rows.length === 0 && !loading ? (
            <EmptyState title={t({ en: 'No questions match these filters.', vi: 'Không có câu hỏi nào khớp bộ lọc.' })} />
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm text-ink"><MathText text={questionStem(row, t)} /></p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span>{t(QUESTION_TYPE_LABEL[row.type])}</span>
                      <span>· {t(DIFFICULTY_LABEL[row.difficulty] ?? DIFFICULTY_LABEL[1]!)}</span>
                      {row.grade && <span>· {t({ en: `Grade ${row.grade}`, vi: `Lớp ${row.grade}` })}</span>}
                      <LessonStatusBadge status={row.status} />
                    </p>
                  </div>
                  {row.editable && (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditing(row)}>
                        {t({ en: 'Edit', vi: 'Sửa' })}
                      </Button>
                      {row.status !== 'published' &&
                        (confirming === row.id ? (
                          <>
                            <Button type="button" variant="destructive" onClick={() => void remove(row.id)}>
                              {t({ en: 'Confirm delete', vi: 'Xác nhận xóa' })}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setConfirming(null)}>
                              {t({ en: 'Keep', vi: 'Giữ lại' })}
                            </Button>
                          </>
                        ) : (
                          <Button type="button" variant="ghost" onClick={() => setConfirming(row.id)}>
                            {t({ en: 'Delete', vi: 'Xóa' })}
                          </Button>
                        ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {more && !loading && (
            <Button type="button" variant="outline" className="self-start" onClick={() => setPage((n) => n + 1)}>
              {t({ en: 'Show more', vi: 'Xem thêm' })}
            </Button>
          )}
        </>
      )}

      <Dialog
        open={editing !== null && !!filters.subject_id}
        onClose={() => setEditing(null)}
        title={t(editing === 'new' ? { en: 'New exam question', vi: 'Câu hỏi đề thi mới' } : { en: 'Edit question', vi: 'Sửa câu hỏi' })}
        closeLabel={t({ en: 'Close', vi: 'Đóng' })}
        className="max-w-2xl"
      >
        {editing !== null && filters.subject_id && (
          <QuestionEditor
            context={{ usage: 'exam', subjectId: filters.subject_id, grade: filters.grade ?? null }}
            question={editing === 'new' ? undefined : editing}
            initial={editing === 'new' ? emptyQuestion('mc') : undefined}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>
    </section>
  );
}
