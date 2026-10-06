'use client';

import { Media } from '@/components/media/Media';
import { useContext, useId, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { QUESTION_TYPES, questionIncomplete, validateQuestionInput, type QuestionType } from '@scipal/types';
import { buttonVariants } from '@/components/ui/button';
import { MathText } from '@/components/math/MathText';
import { hasMath } from '@/lib/mathText';
import { QuestionImageField } from './QuestionImageField';
import { LangTabs } from '../editor/editors/LangTabs';
import { LABEL, SMALL_BUTTON, TEXTAREA } from '../editor/editors/styles';
import { createQuestion, updateQuestion, type AuthorQuestion } from './api';
import { nextNotice, translateBeforeSave } from '../translation/autoTranslate';
import { AutoTranslateContext, AutoTranslatedNote } from '../translation/AutoTranslateContext';
import { draftFields, setDraftField } from '../translation/bilingualFields';
import { translateTexts } from '../translation/translateApi';
import { readAutoTranslate } from '../translation/useAutoTranslate';
import {
  QUESTION_TYPE_LABEL,
  draftFromQuestion,
  draftProblem,
  emptyQuestion,
  nextChoiceId,
  questionInput,
  type QuestionContext,
  switchQuestionType,
  type QuestionDraft,
} from './questionDraft';

type Bilingual = { en: string; vi: string };

const DIFFICULTY: Array<{ value: 1 | 2 | 3; label: Bilingual }> = [
  { value: 1, label: { en: 'Easy', vi: 'Dễ' } },
  { value: 2, label: { en: 'Medium', vi: 'Vừa' } },
  { value: 3, label: { en: 'Hard', vi: 'Khó' } },
];
const MAX_CHOICES = 10;
const INPUT = TEXTAREA.replace('py-2', 'py-1.5');
const SEGMENT = 'inline-flex min-h-9 items-center rounded-md px-3 text-sm font-semibold transition-colors';

interface QuestionEditorProps {
  /** A lesson's practice part, or the exam bank. */
  context: QuestionContext;
  /** A saved question to edit; otherwise `initial` starts a new one. */
  question?: AuthorQuestion;
  initial?: QuestionDraft;
  onSaved: (row: AuthorQuestion) => void;
  onCancel?: () => void;
}

/**
 * Write or edit one practice question. Saving goes to the question bank first; the lesson then
 * refers to it by id. A failed save keeps everything typed.
 */
export function QuestionEditor({ context, question, initial, onSaved, onCancel }: QuestionEditorProps) {
  const { t } = useLanguage();
  const ids = useId();
  const [draft, setDraft] = useState<QuestionDraft>(() => (question ? draftFromQuestion(question) : initial ?? emptyQuestion('mc')));
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Bilingual | null>(null);
  const [translationNotice, setTranslationNotice] = useState<Bilingual | null>(null);
  const autoTranslate = useContext(AutoTranslateContext);
  const [dirty, setDirty] = useState(!question);
  const [grade, setGrade] = useState<number | null>(() => (question ? question.grade : context.usage === 'exam' ? context.grade : null));
  const ctx: QuestionContext =
    context.usage === 'practice' ? { ...context, lessonId: question?.lesson_id ?? context.lessonId } : { ...context, grade };
  const problem = draftProblem(draft, ctx);
  const checked = validateQuestionInput(questionInput(draft, ctx));
  const missingEnglish = checked.ok && questionIncomplete(checked.value) !== null;
  const { data } = draft;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const change = (next: QuestionDraft) => {
    setDraft(next);
    setDirty(true);
    setSaveError(null);
  };
  const setData = (patch: Partial<QuestionDraft['data']>) => change({ ...draft, data: { ...data, ...patch } });
  const setText = (text: Bilingual | undefined, value: string): Bilingual => ({ ...(text ?? { vi: '', en: '' }), [lang]: value });

  const save = async () => {
    if (problem || saving) return;
    setSaving(true);
    setSaveError(null);
    // Empty English is filled first; the question is saved even when that fails.
    const translated = await translateBeforeSave({
      enabled: readAutoTranslate(),
      value: draft,
      current: () => draftRef.current,
      fields: (d) => draftFields(d).map((f) => ({ key: f.path, text: f.text })),
      set: setDraftField,
      call: translateTexts,
    });
    setTranslationNotice((prev) => nextNotice(prev, translated.failed));
    const filled = Object.values(translated.marks);
    if (filled.length) {
      setDraft(translated.value);
      autoTranslate?.addMarks(filled);
    }
    const payload = questionInput(translated.value, ctx);
    const res = question ? await updateQuestion(question.id, payload) : await createQuestion(payload);
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    setDirty(false);
    onSaved(res.data.question);
  };

  const textField = (label: Bilingual, text: Bilingual | undefined, onText: (value: string) => void, rows = 2) => {
    const id = `${ids}-${label.en}`;
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className={LABEL}>
          {t(label)}
        </label>
        <textarea id={id} rows={rows} value={text?.[lang] ?? ''} onChange={(e) => onText(e.target.value)} className={TEXTAREA} />
        {lang === 'en' && text && <AutoTranslatedNote text={text} onEnglish={onText} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="radiogroup" aria-label={t({ en: 'Question type', vi: 'Dạng câu hỏi' })} className="inline-flex flex-wrap rounded-lg border border-line bg-surface-sunken p-0.5">
          {QUESTION_TYPES.map((type: QuestionType) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={draft.type === type}
              onClick={() => draft.type !== type && change(switchQuestionType(draft, type))}
              className={`${SEGMENT} ${draft.type === type ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
            >
              {t(QUESTION_TYPE_LABEL[type])}
            </button>
          ))}
        </div>
        <LangTabs lang={lang} onLangChange={setLang} missingEnglish={missingEnglish} />
      </div>

      {textField({ en: 'Question', vi: 'Câu hỏi' }, data.stem, (v) => setData({ stem: setText(data.stem, v) }), 3)}
      <p className="-mt-2 text-xs text-ink-muted">
        {t({ en: 'Write formulas between dollar signs, e.g. $\\frac{a}{b}$ or $x \\to +\\infty$, in the question and the options.', vi: 'Viết công thức giữa hai dấu đô la, ví dụ $\\frac{a}{b}$ hay $x \\to +\\infty$, ở cả câu hỏi và phương án.' })}
      </p>
      <QuestionImageField image={data.image} lang={lang} onChange={(image) => setData({ image })} />

      {draft.type === 'mc' && data.options && (
        <fieldset className="flex flex-col gap-2">
          <legend className={LABEL}>{t({ en: 'Options — mark the correct one', vi: 'Phương án — đánh dấu phương án đúng' })}</legend>
          {data.options.map((option, i) => (
            <div key={option.id} className="flex items-center gap-2">
              <input
                type="radio"
                name={`${ids}-answer`}
                checked={data.answer === option.id}
                onChange={() => setData({ answer: option.id })}
                aria-label={t({ en: `Option ${option.id.toUpperCase()} is correct`, vi: `Phương án ${option.id.toUpperCase()} đúng` })}
                className="h-5 w-5 shrink-0 accent-[var(--action)]"
              />
              <span aria-hidden="true" className="w-5 shrink-0 text-sm font-bold text-ink-muted">{option.id.toUpperCase()}</span>
              <input
                value={option.text[lang]}
                onChange={(e) => setData({ options: data.options!.map((o, j) => (j === i ? { ...o, text: setText(o.text, e.target.value) } : o)) })}
                aria-label={t({ en: `Option ${option.id.toUpperCase()}`, vi: `Phương án ${option.id.toUpperCase()}` })}
                className={INPUT}
              />
              <button
                type="button"
                disabled={data.options!.length <= 2}
                onClick={() => {
                  const options = data.options!.filter((_, j) => j !== i);
                  setData({ options, answer: data.answer === option.id ? options[0]!.id : data.answer });
                }}
                aria-label={t({ en: `Remove option ${option.id.toUpperCase()}`, vi: `Bỏ phương án ${option.id.toUpperCase()}` })}
                className={SMALL_BUTTON}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data.options.length < MAX_CHOICES && (
            <button
              type="button"
              onClick={() => setData({ options: [...data.options!, { id: nextChoiceId(data.options!.map((o) => o.id), false), text: { vi: '', en: '' } }] })}
              className={`${SMALL_BUTTON} self-start`}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Add option', vi: 'Thêm phương án' })}
            </button>
          )}
        </fieldset>
      )}

      {draft.type === 'truefalse' && data.items && (
        <fieldset className="flex flex-col gap-2">
          <legend className={LABEL}>{t({ en: 'Statements — right or wrong', vi: 'Các ý — đúng hay sai' })}</legend>
          {data.items.map((item, i) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <span aria-hidden="true" className="w-5 shrink-0 text-sm font-bold text-ink-muted">{String.fromCharCode(97 + i)}</span>
              <input
                value={item.text[lang]}
                onChange={(e) => setData({ items: data.items!.map((it, j) => (j === i ? { ...it, text: setText(it.text, e.target.value) } : it)) })}
                aria-label={t({ en: `Statement ${i + 1}`, vi: `Ý ${i + 1}` })}
                className={`${INPUT} min-w-0 flex-1`}
              />
              <div role="group" aria-label={t({ en: `Statement ${i + 1} is`, vi: `Ý ${i + 1} là` })} className="inline-flex rounded-lg border border-line bg-surface-sunken p-0.5">
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    aria-pressed={item.correct === value}
                    onClick={() => setData({ items: data.items!.map((it, j) => (j === i ? { ...it, correct: value } : it)) })}
                    className={`${SEGMENT} ${item.correct === value ? (value ? 'bg-success-surface text-success' : 'bg-danger-surface text-danger') : 'text-ink-muted hover:text-ink'}`}
                  >
                    {value ? t({ en: 'True', vi: 'Đúng' }) : t({ en: 'False', vi: 'Sai' })}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={data.items!.length <= 1}
                onClick={() => setData({ items: data.items!.filter((_, j) => j !== i) })}
                aria-label={t({ en: `Remove statement ${i + 1}`, vi: `Bỏ ý ${i + 1}` })}
                className={SMALL_BUTTON}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data.items.length < MAX_CHOICES && (
            <button
              type="button"
              onClick={() => setData({ items: [...data.items!, { id: nextChoiceId(data.items!.map((it) => it.id), true), text: { vi: '', en: '' }, correct: true }] })}
              className={`${SMALL_BUTTON} self-start`}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Add statement', vi: 'Thêm ý' })}
            </button>
          )}
        </fieldset>
      )}

      {draft.type === 'short' && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-key`} className={LABEL}>
              {t({ en: 'Answer (checked ignoring case and extra spaces)', vi: 'Đáp án (so sánh không phân biệt hoa thường, khoảng trắng)' })}
            </label>
            <input id={`${ids}-key`} value={data.answer_key ?? ''} onChange={(e) => setData({ answer_key: e.target.value })} className={INPUT} />
          </div>
          {textField({ en: 'Marking note (optional)', vi: 'Hướng dẫn chấm (không bắt buộc)' }, data.rubric, (v) => setData({ rubric: setText(data.rubric, v) }))}
        </>
      )}

      <MathPreview draft={draft} lang={lang} />

      {textField({ en: 'Explanation shown after checking (optional)', vi: 'Lời giải thích hiện sau khi kiểm tra (không bắt buộc)' }, data.explanation, (v) =>
        setData({ explanation: setText(data.explanation, v) }),
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span id={`${ids}-difficulty`} className={LABEL}>
          {t({ en: 'Difficulty', vi: 'Mức độ' })}
        </span>
        <div role="radiogroup" aria-labelledby={`${ids}-difficulty`} className="inline-flex rounded-lg border border-line bg-surface-sunken p-0.5">
          {DIFFICULTY.map((level) => (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={draft.difficulty === level.value}
              onClick={() => change({ ...draft, difficulty: level.value })}
              className={`${SEGMENT} ${draft.difficulty === level.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
            >
              {t(level.label)}
            </button>
          ))}
        </div>
        {context.usage === 'exam' && (
          <>
            <label htmlFor={`${ids}-grade`} className={`${LABEL} ml-2`}>
              {t({ en: 'Grade', vi: 'Lớp' })}
            </label>
            <select
              id={`${ids}-grade`}
              value={grade ?? ''}
              onChange={(e) => {
                setGrade(e.target.value ? Number(e.target.value) : null);
                setDirty(true);
              }}
              className={`${INPUT} w-auto`}
            >
              <option value="">{t({ en: 'Any grade', vi: 'Không ghi lớp' })}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-source`} className={LABEL}>
          {t({ en: 'Source (optional, shown to learners)', vi: 'Nguồn (không bắt buộc, học sinh thấy)' })}
        </label>
        <input
          id={`${ids}-source`}
          value={data.source ?? ''}
          maxLength={300}
          placeholder={t({ en: 'e.g. Ministry sample exam 2025, question 3', vi: 'Ví dụ: Đề minh họa BGD 2025, câu 3' })}
          onChange={(e) => setData({ source: e.target.value })}
          className={INPUT}
        />
      </div>

      {(problem || saveError) && (
        <p role="alert" className="text-sm font-medium text-danger">
          {t(saveError ?? problem!)}
        </p>
      )}
      {translationNotice && (
        <p role="status" className="text-sm text-warning">
          {t({ en: 'Not translated to English yet — it will try again on the next save.', vi: 'Chưa dịch được sang tiếng Anh — sẽ thử lại ở lần lưu sau.' })} ({t(translationNotice)})
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!!problem || saving || !dirty} onClick={save} className={buttonVariants()}>
          {saving ? t({ en: 'Saving…', vi: 'Đang lưu…' }) : t({ en: 'Save question', vi: 'Lưu câu hỏi' })}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={SMALL_BUTTON}>
            {t({ en: 'Cancel', vi: 'Hủy' })}
          </button>
        )}
        {question && !dirty && <span className="text-sm text-ink-muted">{t({ en: 'Saved', vi: 'Đã lưu' })}</span>}
      </div>
    </div>
  );
}

/** How the question will look to learners, shown once it has a formula to check. */
function MathPreview({ draft, lang }: { draft: QuestionDraft; lang: 'vi' | 'en' }) {
  const { t } = useLanguage();
  const { data } = draft;
  const choices = draft.type === 'mc' ? data.options ?? [] : draft.type === 'truefalse' ? data.items ?? [] : [];
  const texts = [data.stem[lang], ...choices.map((c) => c.text[lang])];
  if (!texts.some(hasMath)) return null;
  return (
    <section aria-label={t({ en: 'Preview', vi: 'Xem trước' })} className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{t({ en: 'Preview', vi: 'Xem trước' })}</p>
      <MathText text={data.stem[lang]} className="font-semibold text-ink" />
      {choices.length > 0 && (
        <ol className="flex flex-col gap-1 text-ink">
          {choices.map((c, i) => (
            <li key={c.id} className="flex gap-2">
              <span className="font-bold text-ink-muted">{draft.type === 'mc' ? String.fromCharCode(65 + i) : String.fromCharCode(97 + i)}.</span>
              <MathText text={c.text[lang]} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** A question the teacher may not edit (published, or shared from another lesson): shown as learners see it. */
export function QuestionView({ question }: { question: AuthorQuestion }) {
  const { t } = useLanguage();
  const data = question.data as {
    stem?: Bilingual;
    options?: Array<{ id: string; text: Bilingual }>;
    items?: Array<{ id: string; text: Bilingual }>;
    image?: { url: string; alt?: Bilingual };
    source?: string;
  };
  const note =
    question.status === 'published'
      ? question.mine
        ? { en: 'Published question: only an admin can change it now.', vi: 'Câu hỏi đã duyệt: giờ chỉ admin sửa được.' }
        : { en: 'A published question shared from another lesson. Remove the block to stop using it.', vi: 'Câu hỏi đã duyệt, dùng chung từ bài khác. Xóa khối nếu không dùng nữa.' }
      : { en: 'This question is under review and locked.', vi: 'Câu hỏi đang chờ duyệt nên tạm khóa.' };
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="rounded-md bg-surface-sunken px-3 py-2 text-ink-muted">{t(note)}</p>
      <MathText text={data.stem ? t(data.stem) : ''} className="font-semibold text-ink" />
      {data.image?.url && (
        // eslint-disable-next-line @next/next/no-img-element -- lesson media from SciPal's own storage
        <Media url={data.image.url} alt={data.image.alt ? t(data.image.alt) : ''} className="max-h-48 w-auto max-w-full self-start rounded-md border border-line" />
      )}
      {(data.options ?? data.items ?? []).length > 0 && (
        <ul className="list-inside list-disc text-ink">
          {(data.options ?? data.items ?? []).map((choice) => (
            <li key={choice.id}>
              <MathText text={t(choice.text)} />
            </li>
          ))}
        </ul>
      )}
      {data.source && <p className="text-xs text-ink-muted">{t({ en: 'Source', vi: 'Nguồn' })}: {data.source}</p>}
    </div>
  );
}
