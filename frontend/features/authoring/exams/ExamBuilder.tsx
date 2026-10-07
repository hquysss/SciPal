'use client';

import { MathText } from '@/components/math/MathText';
import { INPUT_CLASS as FIELD } from '@/components/ui/input';
import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Pencil, Shuffle, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { layoutQuestionIds, type ExamSection, type SectionKind } from '@scipal/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { LessonStatusBadge } from '../lessonStatusBadge';
import type { AuthoringSubjectOption } from '../authoringQueries';
import { fetchQuestionsByIds, type AuthorQuestion } from '../practice/api';
import { QuestionEditor } from '../practice/QuestionEditor';
import { emptyQuestion, QUESTION_TYPE_LABEL } from '../practice/questionDraft';
import { approveExam, createExam, deleteExam, drawExamQuestions, shareExamWithClasses, submitExam, updateExam, withdrawExam, type ExamDetail, type ExamInput } from './api';
import { BankBrowser } from './BankBrowser';
import { DrawPanel } from './DrawPanel';
import {
  addQuestions, examBody, examPatch, examProblem, examTotals, layoutHasGroupWork, moveQuestion, placeQuestion, removeQuestion, sectionProblems,
  swapQuestion, switchFormat, templateKeyOf,
} from './examDraft';
import { FormatPicker, type FormatChoice } from './FormatPicker';
import { DIFFICULTY_LABEL, questionStem } from './QuestionBank';
import { SectionEditor } from './SectionEditor';

type Bilingual = { en: string; vi: string };
type Panel = 'write' | 'bank' | 'draw' | null;
type Message = { text: Bilingual; tone: 'success' | 'danger' };

const LABEL = 'text-sm font-semibold text-ink';

interface ExamBuilderProps {
  /** null: a new exam. */
  exam: ExamDetail | null;
  subjects: AuthoringSubjectOption[];
  isAdmin: boolean;
  /** Questions already known (the dev showcase); others load from the bank. */
  initialQuestions?: AuthorQuestion[];
}

/**
 * Build one exam: its details, then questions written here, picked from the bank or drawn at
 * random, in order. Saving sends the whole list with the version it was loaded at, so a second tab
 * cannot silently overwrite it.
 */
export function ExamBuilder({ exam, subjects, isAdmin, initialQuestions = [] }: ExamBuilderProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const ids = useId();
  const [form, setForm] = useState<ExamInput>(() => ({
    name: exam?.name ?? '',
    name_en: exam?.name_en ?? '',
    source: exam?.source ?? '',
    subject_id: exam?.subject_id ?? '',
    grade: exam?.grade ?? subjects[0]?.grades[0] ?? 10,
    duration_minutes: exam?.duration_minutes ?? 45,
    question_ids: exam?.question_ids ?? [],
    // An exam without a layout is edited as a flat list, whatever its stored format.
    format: exam?.layout ? exam.format : 'generic',
    layout: exam?.layout ?? null,
  }));
  const [choice, setChoice] = useState<FormatChoice>(() =>
    templateKeyOf(exam?.layout ? exam.format : 'generic', exam?.layout ?? null, subjects.find((s) => s.id === exam?.subject_id)?.slug),
  );
  /** Questions a structure change could not place in any section; they are not saved until placed. */
  const [unassigned, setUnassigned] = useState<string[]>([]);
  const [publishNow, setPublishNow] = useState(false);
  const [saved, setSaved] = useState<ExamDetail | null>(exam);
  const [dirty, setDirty] = useState(false);
  const [rows, setRows] = useState<Record<string, AuthorQuestion>>(() => Object.fromEntries(initialQuestions.map((q) => [q.id, q])));
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsFailed, setRowsFailed] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [editing, setEditing] = useState<AuthorQuestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const readOnly = saved !== null && !saved.editable;
  const subject = subjects.find((s) => s.id === form.subject_id);
  const layout: ExamSection[] | null = form.format !== 'generic' && form.layout ? form.layout : null;
  // A sectioned exam's list is its layout flattened; unassigned questions are held beside it.
  const examIds = layout ? layoutQuestionIds(layout) : form.question_ids;
  const heldIds = layout ? [...examIds, ...unassigned] : examIds;
  const listed = examIds.map((id) => rows[id]).filter((row): row is AuthorQuestion => !!row);
  const totals = examTotals(listed);
  const problem = examProblem(form, false);
  const reviewProblem = examProblem({ ...form, unassigned }, true);
  // A sectioned exam shows why it cannot go to review yet; a flat exam says so when the button is pressed, as before.
  const reviewBlocked = layout !== null && reviewProblem !== null;
  const savedFormat = saved?.layout ? saved.format : 'generic';
  const missingLabel: Bilingual = loadingRows
    ? { en: 'Loading…', vi: 'Đang tải…' }
    : rowsFailed
      ? { en: 'Could not load this question. Reload the page.', vi: 'Không tải được câu hỏi. Hãy tải lại trang.' }
      : { en: 'Question not found. Remove it.', vi: 'Không tìm thấy câu hỏi. Bạn hãy bỏ câu này khỏi đề.' };
  const legacyPool = !layout && saved !== null && saved.question_ids.length === 0 && saved.question_count > 0 && form.question_ids.length === 0;

  // Load the questions this exam holds that the builder does not know yet.
  const missingKey = heldIds.filter((id) => !rows[id]).join(',');
  useEffect(() => {
    if (!missingKey) return;
    let live = true;
    setLoadingRows(true);
    void fetchQuestionsByIds(missingKey.split(','), 'exam').then((res) => {
      if (!live) return;
      setLoadingRows(false);
      setRowsFailed(!res.ok);
      if (res.ok) setRows((old) => ({ ...old, ...Object.fromEntries(res.data.questions.map((q) => [q.id, q])) }));
    });
    return () => {
      live = false;
    };
  }, [missingKey]);

  const change = (patch: Partial<ExamInput>) => {
    setForm((old) => ({ ...old, ...patch }));
    setDirty(true);
    setMessage(null);
  };
  const known = (added: AuthorQuestion[]) => setRows((old) => ({ ...old, ...Object.fromEntries(added.map((q) => [q.id, q])) }));

  /**
   * "Cấu trúc đề": lay the exam out on another structure (or back to one list) without losing
   * questions. Passages and extra groups do not survive, so the author confirms first.
   */
  const pickFormat = (next: FormatChoice) => {
    if (next === choice) return;
    if (
      layoutHasGroupWork(layout) &&
      !window.confirm(
        t({
          en: 'Changing the structure removes the shared passages and merges the question groups. Change it anyway?',
          vi: 'Đổi cấu trúc sẽ bỏ các đoạn văn dùng chung và gộp các nhóm câu. Bạn vẫn muốn đổi?',
        }),
      )
    ) {
      return;
    }
    const kinds: Record<string, SectionKind> = Object.fromEntries(Object.values(rows).map((row) => [row.id, row.type]));
    const { unassigned: left, ...patch } = switchFormat(form, unassigned, next, kinds);
    change(patch);
    setUnassigned(left);
    setChoice(next);
    setPanel(null);
  };

  const placeUnassigned = (id: string) => {
    const row = rows[id];
    const placed = layout && row ? placeQuestion(layout, id, row.type) : null;
    if (!placed) return;
    change({ layout: placed });
    setUnassigned((old) => old.filter((x) => x !== id));
  };
  const dropUnassigned = (id: string) => {
    setUnassigned((old) => old.filter((x) => x !== id));
    setMessage(null);
  };

  /** Save the form; returns the saved exam, or null (the message says why). */
  const save = async (): Promise<ExamDetail | null> => {
    const why = examProblem(form, false);
    if (why) {
      setMessage({ text: why, tone: 'danger' });
      return null;
    }
    if (
      layout &&
      unassigned.length > 0 &&
      !window.confirm(
        t({
          en: `${unassigned.length} question(s) are not in any section. Saving now leaves them out of the exam. Save anyway?`,
          vi: `Còn ${unassigned.length} câu chưa xếp vào phần nào. Lưu lúc này sẽ bỏ các câu đó khỏi đề. Bạn vẫn muốn lưu?`,
        }),
      )
    ) {
      return null;
    }
    const body = examBody(form, savedFormat);
    const res = saved
      ? await updateExam(saved.id, examPatch(body, saved, saved.updated_at))
      : await createExam({ ...body, ...(isAdmin && publishNow ? { publish: true } : {}) });
    if (!res.ok) {
      setMessage({ text: res.error, tone: 'danger' });
      return null;
    }
    setSaved(res.data.exam);
    setDirty(false);
    if (layout) setUnassigned([]);
    if (!saved) router.replace(`/exam/manage/${res.data.exam.id}`);
    return res.data.exam;
  };

  const run = async (action: 'save' | 'submit' | 'publish' | 'classOnly' | 'withdraw') => {
    if (busy) return;
    if (action !== 'save' && action !== 'withdraw') {
      const why = reviewProblem;
      if (why) return setMessage({ text: why, tone: 'danger' });
    }
    setBusy(true);
    setMessage(null);
    const current = dirty || !saved ? await save() : saved;
    if (current && action !== 'save') {
      const call = { submit: submitExam, publish: approveExam, classOnly: shareExamWithClasses, withdraw: withdrawExam }[action];
      const res = await call(current.id);
      if (res.ok) setSaved(res.data.exam);
      const done: Record<typeof action, Bilingual> = {
        submit: { en: 'Sent to an admin for review.', vi: 'Đã gửi đề cho admin duyệt.' },
        publish: { en: 'The exam is published.', vi: 'Đề đã được xuất bản.' },
        classOnly: { en: 'Ready for your classes. Give it to a class from the class page.', vi: 'Đề đã sẵn sàng cho lớp của bạn. Hãy giao đề ở trang lớp học.' },
        withdraw: { en: 'The exam is a draft again.', vi: 'Đề đã về bản nháp.' },
      };
      setMessage(
        res.ok
          ? {
              text: done[action],
              tone: 'success',
            }
          : { text: res.error, tone: 'danger' },
      );
    } else if (current) {
      setMessage({ text: { en: 'Saved.', vi: 'Đã lưu đề.' }, tone: 'success' });
    }
    setBusy(false);
    router.refresh();
  };

  /** Deletes a draft after a confirmation; its questions stay in the bank. */
  const remove = async () => {
    if (!saved || busy) return;
    if (!window.confirm(t({ en: 'Delete this exam? Its questions stay in the bank.', vi: 'Xóa đề này? Các câu hỏi vẫn còn trong ngân hàng.' }))) return;
    setBusy(true);
    const res = await deleteExam(saved.id);
    setBusy(false);
    if (!res.ok) return setMessage({ text: res.error, tone: 'danger' });
    router.replace('/exam/manage');
  };

  /** "Đổi câu": one question of the same type and difficulty that the exam does not have yet. */
  const swap = async (row: AuthorQuestion) => {
    const res = await drawExamQuestions({
      subject_id: form.subject_id,
      grade: form.grade,
      exclude_ids: form.question_ids,
      counts: [{ type: row.type, difficulty: row.difficulty as 1 | 2 | 3, n: 1 }],
    });
    if (!res.ok) return setMessage({ text: res.error, tone: 'danger' });
    const [next] = res.data.question_ids;
    if (!next) return setMessage({ text: { en: 'No other question of this type and difficulty.', vi: 'Không còn câu nào cùng dạng và mức độ.' }, tone: 'danger' });
    change({ question_ids: swapQuestion(form.question_ids, row.id, next) });
  };

  const statusNote: Bilingual | null = !readOnly
    ? null
    : saved?.status === 'pending_review'
      ? { en: 'This exam is waiting for review and cannot be edited.', vi: 'Đề đang chờ duyệt nên không sửa được.' }
      : saved?.status === 'class_only'
        ? { en: 'This exam is for your classes. Take it back to a draft to edit.', vi: 'Đề đang dùng cho lớp. Đưa về bản nháp để sửa.' }
        : { en: 'This exam is published; only an admin can change it.', vi: 'Đề đã xuất bản nên không sửa được; chỉ admin mới sửa.' };

  const panelButton = (id: Exclude<Panel, null>, label: Bilingual) => (
    <Button type="button" variant={panel === id ? 'secondary' : 'outline'} aria-expanded={panel === id} onClick={() => setPanel(panel === id ? null : id)}>
      {t(label)}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      {saved && (
        <div className="flex flex-wrap items-center gap-2">
          <LessonStatusBadge status={saved.status} />
          {saved.imported && <span className="text-sm text-ink-muted">{t({ en: 'Imported from Excel', vi: 'Nhập từ Excel' })}</span>}
        </div>
      )}
      {statusNote && <Alert tone="warning">{t(statusNote)}</Alert>}
      {saved?.review_note && (
        <Alert tone="warning" title={t({ en: 'Sent back by the admin', vi: 'Admin trả lại đề' })}>
          {saved.review_note}
        </Alert>
      )}

      <section aria-labelledby={`${ids}-details`} className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 sm:p-5">
        <h2 id={`${ids}-details`} className="text-lg font-bold text-ink sm:col-span-2">
          {t({ en: 'Exam details', vi: 'Thông tin đề' })}
        </h2>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-name`} className={LABEL}>{t({ en: 'Name (Vietnamese)', vi: 'Tên đề (tiếng Việt)' })}</label>
          <input id={`${ids}-name`} value={form.name} maxLength={200} disabled={readOnly} onChange={(e) => change({ name: e.target.value })} className={FIELD} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-name-en`} className={LABEL}>{t({ en: 'Name (English)', vi: 'Tên đề (tiếng Anh)' })}</label>
          <input id={`${ids}-name-en`} value={form.name_en} maxLength={200} disabled={readOnly} onChange={(e) => change({ name_en: e.target.value })} className={FIELD} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-source`} className={LABEL}>{t({ en: 'Source', vi: 'Nguồn đề' })}</label>
          <input
            id={`${ids}-source`}
            value={form.source ?? ''}
            maxLength={300}
            disabled={readOnly}
            placeholder={t({ en: 'e.g. Ministry of Education, 2026 national exam', vi: 'VD: Bộ GD&ĐT, kỳ thi tốt nghiệp THPT 2026' })}
            onChange={(e) => change({ source: e.target.value })}
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-subject`} className={LABEL}>{t({ en: 'Subject', vi: 'Môn học' })}</label>
          <select
            id={`${ids}-subject`}
            value={form.subject_id}
            // The subject is fixed once the exam exists: its questions belong to it.
            disabled={readOnly || saved !== null}
            onChange={(e) => {
              const next = subjects.find((s) => s.id === e.target.value);
              // Questions belong to a subject: a new subject empties the list or the sections, keeping the structure.
              const emptied = layout?.map((s) => ({ ...s, groups: s.groups.map((g) => ({ ...g, question_ids: [] })) }));
              change({ subject_id: e.target.value, grade: next?.grades[0] ?? form.grade, question_ids: [], ...(emptied ? { layout: emptied } : {}) });
              setUnassigned([]);
            }}
            className={FIELD}
          >
            <option value="">{t({ en: 'Choose a subject…', vi: 'Chọn môn…' })}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {t({ en: s.name_en, vi: s.name_vi })}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-grade`} className={LABEL}>{t({ en: 'Grade', vi: 'Lớp' })}</label>
            <select id={`${ids}-grade`} value={form.grade} disabled={readOnly || !subject} onChange={(e) => change({ grade: Number(e.target.value) })} className={FIELD}>
              {(subject?.grades ?? [form.grade]).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-duration`} className={LABEL}>{t({ en: 'Time (minutes)', vi: 'Thời gian (phút)' })}</label>
            <input
              id={`${ids}-duration`}
              type="number"
              min={5}
              max={300}
              value={form.duration_minutes}
              disabled={readOnly}
              onChange={(e) => change({ duration_minutes: Number(e.target.value) })}
              className={FIELD}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <FormatPicker value={choice} onChange={pickFormat} disabled={readOnly} />
        </div>
      </section>

      <section aria-labelledby={`${ids}-questions`} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={`${ids}-questions`} className="text-lg font-bold text-ink">
            {t({ en: `Questions (${examIds.length})`, vi: `Câu hỏi (${examIds.length})` })}
          </h2>
          {listed.length > 0 && (
            <p className="text-sm text-ink-muted">
              {(['mc', 'truefalse', 'short'] as const).map((type) => `${t(QUESTION_TYPE_LABEL[type])} ${totals.byType[type]}`).join(' · ')}
              {' — '}
              {([1, 2, 3] as const).map((d) => `${t(DIFFICULTY_LABEL[d]!)} ${totals.byDifficulty[d]}`).join(' · ')}
            </p>
          )}
        </div>

        {layout ? (
          <>
            {!readOnly && !form.subject_id && <p className="text-sm text-ink-muted">{t({ en: 'Choose a subject to add questions.', vi: 'Chọn môn học để thêm câu hỏi.' })}</p>}
            {unassigned.length > 0 && (
              <section aria-labelledby={`${ids}-unassigned`} className="flex flex-col gap-2 rounded-lg border border-edge bg-surface-sunken p-3">
                <h3 id={`${ids}-unassigned`} className="text-sm font-bold text-ink">
                  {t({ en: `Questions not in any section (${unassigned.length})`, vi: `Câu chưa xếp vào phần nào (${unassigned.length})` })}
                </h3>
                <p className="text-sm text-ink-muted">
                  {t({
                    en: 'These questions are not saved with the exam until you place them in a section of their type. Place or remove them.',
                    vi: 'Các câu này chưa được lưu vào đề cho đến khi bạn xếp vào phần cùng dạng. Bạn hãy xếp hoặc bỏ các câu đó.',
                  })}
                </p>
                <ol className="flex flex-col gap-2">
                  {unassigned.map((id, i) => {
                    const row = rows[id];
                    const fits = !!row && placeQuestion(layout, id, row.type) !== null;
                    return (
                      <li key={id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          {row ? (
                            <>
                              <p className="line-clamp-2 text-sm text-ink"><MathText text={questionStem(row, t)} /></p>
                              <p className="mt-1 text-xs text-ink-muted">
                                {t(QUESTION_TYPE_LABEL[row.type])}
                                {!fits && ` · ${t({ en: 'no section of this structure takes this type', vi: 'cấu trúc này không có phần nhận dạng câu này' })}`}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-ink-muted">{t(missingLabel)}</p>
                          )}
                        </div>
                        {!readOnly && (
                          <div className="flex shrink-0 flex-wrap items-center gap-1">
                            <Button type="button" variant="outline" disabled={!fits} aria-label={t({ en: `Place unassigned question ${i + 1} in a section`, vi: `Xếp câu chưa xếp ${i + 1} vào phần` })} onClick={() => placeUnassigned(id)}>
                              {t({ en: 'Place in a section', vi: 'Xếp vào phần' })}
                            </Button>
                            <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Remove unassigned question ${i + 1}`, vi: `Bỏ câu chưa xếp ${i + 1}` })} onClick={() => dropUnassigned(id)}>
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}
            <SectionEditor
              layout={layout}
              rows={rows}
              problems={sectionProblems(layout)}
              subjectId={form.subject_id}
              readOnly={readOnly}
              missingLabel={missingLabel}
              onKnown={known}
              onEdit={setEditing}
              onChange={(next) => change({ layout: next })}
            />
          </>
        ) : (
          <>
        {legacyPool && (
          <p className="rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
            {t({
              en: `This older exam draws ${saved!.question_count} questions from the subject pool. Adding questions turns it into a fixed list.`,
              vi: `Đề cũ này lấy ${saved!.question_count} câu từ kho câu hỏi của môn. Thêm câu hỏi sẽ chuyển nó thành danh sách cố định.`,
            })}
          </p>
        )}

        {!readOnly && (
          <div className="flex flex-col gap-3">
            {!form.subject_id ? (
              <p className="text-sm text-ink-muted">{t({ en: 'Choose a subject to add questions.', vi: 'Chọn môn học để thêm câu hỏi.' })}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {panelButton('write', { en: 'Write a question', vi: 'Soạn câu mới' })}
                {panelButton('bank', { en: 'Pick from the bank', vi: 'Chọn từ ngân hàng' })}
                {panelButton('draw', { en: 'Draw at random', vi: 'Bốc ngẫu nhiên' })}
              </div>
            )}
            {panel === 'bank' && form.subject_id && (
              <div className="rounded-lg border border-line p-3">
                <BankBrowser
                  subjectId={form.subject_id}
                  excludeIds={form.question_ids}
                  onAdd={(added) => {
                    known(added);
                    change({ question_ids: addQuestions(form.question_ids, added.map((q) => q.id)) });
                  }}
                />
              </div>
            )}
            {panel === 'draw' && form.subject_id && (
              <div className="rounded-lg border border-line p-3">
                <DrawPanel subjectId={form.subject_id} grade={form.grade} excludeIds={form.question_ids} onDrawn={(drawn) => change({ question_ids: addQuestions(form.question_ids, drawn) })} />
              </div>
            )}
          </div>
        )}

        {form.question_ids.length === 0 ? (
          <p className="rounded-lg border border-dashed border-edge p-6 text-center text-sm text-ink-muted">
            {t({ en: 'No questions yet.', vi: 'Đề chưa có câu hỏi.' })}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {form.question_ids.map((id, i) => {
              const row = rows[id];
              return (
                <li key={id} className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-center">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface-sunken text-sm font-bold tabular-nums text-ink-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    {row ? (
                      <>
                        <p className="line-clamp-2 text-sm text-ink"><MathText text={questionStem(row, t)} /></p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          <span>{t(QUESTION_TYPE_LABEL[row.type])}</span>
                          <span>· {t(DIFFICULTY_LABEL[row.difficulty] ?? DIFFICULTY_LABEL[1]!)}</span>
                          {row.status !== 'published' && <LessonStatusBadge status={row.status} />}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-ink-muted">
                        {loadingRows
                          ? t({ en: 'Loading…', vi: 'Đang tải…' })
                          : rowsFailed
                            ? t({ en: 'Could not load this question. Reload the page.', vi: 'Không tải được câu hỏi. Hãy tải lại trang.' })
                            : t({ en: 'Question not found — remove it.', vi: 'Không tìm thấy câu hỏi — hãy bỏ khỏi đề.' })}
                      </p>
                    )}
                  </div>
                  {row?.editable && (
                    <Button type="button" variant="outline" aria-label={t({ en: `Edit question ${i + 1}`, vi: `Sửa câu ${i + 1}` })} onClick={() => setEditing(row)}>
                      <Pencil aria-hidden="true" />
                      {t({ en: 'Edit', vi: 'Sửa' })}
                    </Button>
                  )}
                  {!readOnly && (
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Move question ${i + 1} up`, vi: `Đưa câu ${i + 1} lên` })} disabled={i === 0} onClick={() => change({ question_ids: moveQuestion(form.question_ids, i, i - 1) })}>
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t({ en: `Move question ${i + 1} down`, vi: `Đưa câu ${i + 1} xuống` })}
                        disabled={i === form.question_ids.length - 1}
                        onClick={() => change({ question_ids: moveQuestion(form.question_ids, i, i + 1) })}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                      {row && (
                        <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Swap question ${i + 1}`, vi: `Đổi câu ${i + 1}` })} title={t({ en: 'Swap for another of the same kind', vi: 'Đổi sang câu khác cùng dạng, cùng mức độ' })} onClick={() => void swap(row)}>
                          <Shuffle aria-hidden="true" />
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Remove question ${i + 1}`, vi: `Bỏ câu ${i + 1}` })} onClick={() => change({ question_ids: removeQuestion(form.question_ids, id) })}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
          </>
        )}
      </section>

      {message && <Alert tone={message.tone}>{t(message.text)}</Alert>}

      {readOnly && saved?.status === 'class_only' && saved.mine && (
        <div>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void run('withdraw')}>
            {t({ en: 'Back to draft to edit', vi: 'Đưa về bản nháp để sửa' })}
          </Button>
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && !saved && (
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="h-5 w-5 accent-[var(--action)]" />
              {t({ en: 'Publish now', vi: 'Xuất bản ngay' })}
            </label>
          )}
          <Button type="button" disabled={busy || !!problem || (saved !== null && !dirty)} onClick={() => void run('save')}>
            {busy ? t({ en: 'Saving…', vi: 'Đang lưu…' }) : t({ en: 'Save exam', vi: 'Lưu đề' })}
          </Button>
          {saved?.status === 'draft' && !isAdmin && (
            <Button type="button" variant="outline" disabled={busy || reviewBlocked} onClick={() => void run('submit')}>
              {t({ en: 'Send for review', vi: 'Gửi duyệt' })}
            </Button>
          )}
          {saved?.status === 'draft' && (
            <Button type="button" variant="outline" disabled={busy || reviewBlocked} onClick={() => void run('classOnly')}>
              {t({ en: 'Use in my classes', vi: 'Dùng cho lớp của tôi' })}
            </Button>
          )}
          {saved?.status === 'draft' && isAdmin && saved.mine && (
            <Button type="button" variant="outline" disabled={busy || reviewBlocked} onClick={() => void run('publish')}>
              {t({ en: 'Publish', vi: 'Xuất bản' })}
            </Button>
          )}
          {saved?.status === 'draft' && (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()}>
              {t({ en: 'Delete exam', vi: 'Xóa đề' })}
            </Button>
          )}
          {problem && <p className="text-sm text-danger">{t(problem)}</p>}
          {!problem && reviewBlocked && <p className="text-sm text-ink-muted">{t(reviewProblem!)}</p>}
          {saved && !dirty && !problem && <span className="text-sm text-ink-muted">{t({ en: 'All changes saved', vi: 'Đã lưu mọi thay đổi' })}</span>}
        </div>
      )}

      <Dialog
        open={panel === 'write' && !!form.subject_id}
        onClose={() => setPanel(null)}
        title={t({ en: 'New exam question', vi: 'Câu hỏi đề thi mới' })}
        closeLabel={t({ en: 'Close', vi: 'Đóng' })}
        className="max-w-2xl"
      >
        {panel === 'write' && form.subject_id && (
          <QuestionEditor
            context={{ usage: 'exam', subjectId: form.subject_id, grade: form.grade }}
            initial={emptyQuestion('mc')}
            onSaved={(row) => {
              known([row]);
              change({ question_ids: addQuestions(form.question_ids, [row.id]) });
              setPanel(null);
            }}
            onCancel={() => setPanel(null)}
          />
        )}
      </Dialog>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={t({ en: 'Edit question', vi: 'Sửa câu hỏi' })} closeLabel={t({ en: 'Close', vi: 'Đóng' })} className="max-w-2xl">
        {editing && form.subject_id && (
          <QuestionEditor
            context={{ usage: 'exam', subjectId: form.subject_id, grade: form.grade }}
            question={editing}
            onSaved={(row) => {
              known([row]);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
