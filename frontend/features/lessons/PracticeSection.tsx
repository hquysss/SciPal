'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { PracticeCheckResult, PracticeResponse, PublicPracticeQuestion } from '@scipal/types';
import { buttonVariants } from '@/components/ui/button';
import { MathText } from '@/components/math/MathText';
import { QuestionFigure, QuestionSource } from '@/components/math/QuestionFigure';
import { useShuffledOptions } from '@/lib/useShuffledOptions';
import { checkPractice, type PracticeCheck, type PracticeLoad } from './practiceApi';
import { PRACTICE_SYNCED, type SyncResult } from '../../lib/pwa/pendingPractice';
import { CodePracticeBoard } from './CodePracticeBoard';
import { WritingAnswer, type WritingFeedbackState } from './WritingAnswer';
import styles from './practice.module.css';

type Bilingual = { en: string; vi: string };

/** A verdict; `provisional` when it was graded on this device without a connection (XP and streak are estimates). */
export type PracticeResult = PracticeCheckResult & { provisional?: { xp: number; streak: number | null } };

/** The verdict to keep from a successful check, with its provisional estimate when there is one. */
export const resultOf = (res: Extract<PracticeCheck, { ok: true }>): PracticeResult =>
  res.provisional ? { ...res.result, provisional: res.provisional } : res.result;

/** This visit's answers and latest verdicts. Kept by the lesson view so switching parts loses nothing; never stored. */
export interface PracticeState {
  answers: Record<string, PracticeResponse>;
  results: Record<string, PracticeResult>;
  activeQuestionId?: string;
  writingFeedback?: Record<string, WritingFeedbackState>;
}

/**
 * Record a verdict only if the answer is still the one that was checked: a reply arriving after
 * the learner changed the answer belongs to the old answer and is dropped.
 */
export function withResult(state: PracticeState, id: string, result: PracticeResult, checked: PracticeResponse | undefined): PracticeState {
  if (state.answers[id] !== checked) return state;
  return { ...state, results: { ...state.results, [id]: result } };
}

export function usePracticeState() {
  const [state, setState] = useState<PracticeState>({ answers: {}, results: {} });
  // A changed answer is a new attempt: its old verdict no longer applies.
  const onAnswer = useCallback((id: string, answer: PracticeResponse) => {
    setState((old) => {
      const { [id]: _stale, ...results } = old.results;
      const { [id]: _oldFeedback, ...writingFeedback } = old.writingFeedback ?? {};
      return { ...old, answers: { ...old.answers, [id]: answer }, results, writingFeedback };
    });
  }, []);
  const onResult = useCallback((id: string, result: PracticeResult, checked: PracticeResponse | undefined) => {
    setState((old) => withResult(old, id, result, checked));
  }, []);
  // Answers made offline were synced: the server's verdicts replace the provisional ones on screen.
  useEffect(() => {
    const onSynced = (event: Event) => {
      const synced = (event as CustomEvent<SyncResult[]>).detail ?? [];
      setState((old) => {
        let results = old.results;
        for (const { question_id, status, counted: _counted, response, ...server } of synced) {
          const shown = results[question_id];
          if (status !== 'ok' || !shown?.provisional || typeof server.correct !== 'boolean') continue;
          // The server judged the first answer; a later one on screen keeps its own verdict, without the label.
          const same = JSON.stringify(old.answers[question_id]) === JSON.stringify(response);
          const { provisional: _provisional, ...local } = shown;
          results = { ...results, [question_id]: same ? (server as PracticeCheckResult) : local };
        }
        return results === old.results ? old : { ...old, results };
      });
    };
    window.addEventListener(PRACTICE_SYNCED, onSynced);
    return () => window.removeEventListener(PRACTICE_SYNCED, onSynced);
  }, []);
  const onQuestion = useCallback((id: string) => {
    setState((old) => ({ ...old, activeQuestionId: id }));
  }, []);
  const onWritingFeedback = useCallback((id: string, feedback: WritingFeedbackState) => {
    setState((old) => old.answers[id]?.writing_answer === feedback.answer
      ? { ...old, writingFeedback: { ...old.writingFeedback, [id]: feedback } }
      : old);
  }, []);
  return { state, onAnswer, onResult, onQuestion, onWritingFeedback };
}

/** Right answers of this visit over all questions (unanswered ones count in the total). */
export function practiceSummary(ids: string[], results: Record<string, PracticeResult>) {
  const checked = ids.filter((id) => results[id]);
  return { right: checked.filter((id) => results[id]!.correct).length, total: ids.length, checked: checked.length };
}

/** The answer to send, or null while there is nothing to check. */
export function responseOf(question: PublicPracticeQuestion, answer: PracticeResponse | undefined): PracticeResponse | null {
  if (question.type === 'mc') return answer?.selected_option ? { selected_option: answer.selected_option } : null;
  if (question.type === 'truefalse') return answer?.items?.length ? { items: answer.items } : null;
  if (question.type === 'writing') return answer?.writing_answer?.trim() ? { writing_answer: answer.writing_answer } : null;
  if (question.type === 'code') return answer?.code?.source.trim() ? { code: answer.code } : null;
  return answer?.short_answer?.trim() ? { short_answer: answer.short_answer } : null;
}

type QuestionStatus = 'empty' | 'answered' | 'right' | 'wrong';
const STATUS_ORDER: QuestionStatus[] = ['empty', 'answered', 'right', 'wrong'];
const STATUS_TEXT: Record<QuestionStatus, Bilingual> = {
  empty: { en: 'not answered', vi: 'chưa làm' },
  answered: { en: 'answered, not checked', vi: 'đã làm, chưa kiểm tra' },
  right: { en: 'right', vi: 'đúng' },
  wrong: { en: 'not right', vi: 'chưa đúng' },
};
const STATUS_CLASS: Record<QuestionStatus, string> = {
  empty: 'border-line bg-surface text-ink-muted hover:bg-surface-sunken',
  answered: 'border-2 border-accent bg-[color-mix(in_srgb,var(--accent,var(--action))_22%,transparent)] text-ink',
  right: 'border-success bg-success-surface text-success',
  wrong: 'border-danger bg-danger-surface text-danger',
};

/** Where a question stands in this visit: the server's verdict wins over a plain answer. */
export function questionStatus(question: PublicPracticeQuestion, state: PracticeState): QuestionStatus {
  const result = state.results[question.id];
  if (result) return result.correct ? 'right' : 'wrong';
  return responseOf(question, state.answers[question.id]) ? 'answered' : 'empty';
}

interface PracticeSectionProps {
  load: PracticeLoad;
  /** The lesson, so an answer made offline can be graded from its saved pack. */
  lessonId?: string;
  state: PracticeState;
  onAnswer: (id: string, answer: PracticeResponse) => void;
  /** `checked` is the answer object the verdict is for. */
  onResult: (id: string, result: PracticeResult, checked: PracticeResponse | undefined) => void;
  onRetry?: () => void;
  onQuestion?: (id: string) => void;
  onWritingFeedback?: (id: string, feedback: WritingFeedbackState) => void;
  /** Read in this language instead of the reader's (the editor preview). */
  lang?: 'en' | 'vi';
}

const PART_ORDER = ['mc', 'truefalse', 'short', 'writing', 'code'] as const;
const PART_TITLE: Record<(typeof PART_ORDER)[number], Bilingual> = {
  mc: { en: 'Multiple choice', vi: 'Trắc nghiệm nhiều phương án lựa chọn' },
  truefalse: { en: 'True / false', vi: 'Trắc nghiệm đúng sai' },
  short: { en: 'Short answer', vi: 'Trắc nghiệm trả lời ngắn' },
  writing: { en: 'Write in English', vi: 'Viết tiếng Anh' },
  code: { en: 'Programming', vi: 'Lập trình' },
};

const CARD ='rounded-xl border border-line bg-surface p-4 sm:p-5';

/**
 * A lesson's Tự luyện. Programming questions (Tin học) get their own problem set, like an online
 * judge; every other question is done one at a time with the status panel beside it.
 */
export function PracticeSection(props: PracticeSectionProps) {
  const { t: readerT } = useLanguage();
  const t = props.lang ? (text: Bilingual) => text[props.lang!] || text.vi : readerT;
  const [view, setView] = useState<'code' | 'quiz'>('code');
  const code = props.load.ok ? props.load.questions.filter((q) => q.type === 'code') : [];
  if (!props.load.ok || code.length === 0) return <QuestionPractice {...props} />;
  const quiz = props.load.questions.filter((q) => q.type !== 'code');
  const board = <CodePracticeBoard questions={code} answers={props.state.answers} results={props.state.results} onAnswer={props.onAnswer} onResult={props.onResult} t={t} />;
  if (quiz.length === 0) return board;
  const tabs: Array<{ id: 'code' | 'quiz'; label: Bilingual }> = [
    { id: 'code', label: { en: `Programming (${code.length})`, vi: `Bài lập trình (${code.length})` } },
    { id: 'quiz', label: { en: `Questions (${quiz.length})`, vi: `Trắc nghiệm (${quiz.length})` } },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={t({ en: 'Practice kind', vi: 'Dạng luyện tập' })} className="inline-flex self-start rounded-xl bg-surface-sunken p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none ${view === tab.id ? 'bg-surface text-ink shadow-sm' : 'text-ink hover:bg-surface/60'}`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>
      {view === 'code' ? board : <QuestionPractice {...props} load={{ ok: true, questions: quiz }} />}
    </div>
  );
}

function QuestionPractice({ load, lessonId, state, onAnswer, onResult, onRetry, onQuestion, onWritingFeedback, lang }: PracticeSectionProps) {
  const { t: readerT, lang: readerLang } = useLanguage();
  const t = lang ? (text: Bilingual) => text[lang] || text.vi : readerT;
  const shownLang = lang ?? (readerLang === 'en' ? 'en' : 'vi');
  const [activeId, setActiveId] = useState<string>();
  const [backward, setBackward] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const positionRef = useRef<HTMLParagraphElement>(null);
  const questions = load.ok ? load.questions : [];
  const activeIndex = Math.max(0, questions.findIndex((q) => q.id === (state.activeQuestionId ?? activeId)));
  const question = questions[activeIndex];
  const options = useShuffledOptions(question?.id ?? '', question && 'options' in question.data ? question.data.options : []);

  if (!load.ok) {
    return (
      <div role="alert" className={`${CARD} flex flex-col items-start gap-3`}>
        <p className="font-semibold text-ink">{t({ en: 'Could not load the practice questions.', vi: 'Chưa tải được câu tự luyện.' })}</p>
        <p className="text-sm text-ink-muted">{t(load.error)}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className={buttonVariants({ variant: 'outline' })}>
            {t({ en: 'Try again', vi: 'Thử lại' })}
          </button>
        )}
      </div>
    );
  }
  if (!question) {
    return <p className={`${CARD} text-sm text-ink-muted`}>{t({ en: 'This lesson has no practice yet.', vi: 'Bài này chưa có bài tập.' })}</p>;
  }

  const summary = practiceSummary(
    load.questions.map((q) => q.id),
    state.results,
  );
  const goTo = (index: number) => {
    const next = questions[index];
    if (!next) return;
    setBackward(index < activeIndex);
    setActiveId(next.id);
    onQuestion?.(next.id);
    positionRef.current?.focus({ preventScroll: true });
  };
  // Hand in the whole set: every answered question not checked yet goes to the server at once.
  const pending = questions.flatMap((q) => {
    const response = state.results[q.id] ? null : responseOf(q, state.answers[q.id]);
    return response ? [{ id: q.id, response, checked: state.answers[q.id] }] : [];
  });
  const submitAll = async () => {
    if (!pending.length || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    const replies = await Promise.all(pending.map(async (p) => ({ ...p, res: await checkPractice(lessonId, p.id, p.response) })));
    setSubmitting(false);
    for (const { id, res, checked } of replies) if (res.ok) onResult(id, resultOf(res), checked);
    setSubmitError(replies.some(({ res }) => !res.ok));
  };
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p ref={positionRef} tabIndex={-1} aria-live="polite" className="rounded text-lg font-bold tabular-nums text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
              {t({ en: `Question ${activeIndex + 1} / ${questions.length}`, vi: `Câu ${activeIndex + 1} / ${questions.length}` })}
            </p>
            <span className="text-sm text-ink-muted">{t(PART_TITLE[question.type])}</span>
          </div>
          <div role="progressbar" aria-label={t({ en: 'Questions checked', vi: 'Câu đã kiểm tra' })} aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.checked} className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div className={`${styles.progress} h-full origin-left rounded-full bg-accent`} style={{ transform: `scaleX(${summary.checked / summary.total})` }} />
          </div>
        </div>
        <div key={question.id} className={styles.question} data-backward={backward}>
          <QuestionCard
            question={question}
            lessonId={lessonId}
            options={options}
            answer={state.answers[question.id]}
            result={state.results[question.id]}
            writingFeedback={state.writingFeedback?.[question.id]}
            onWritingFeedback={onWritingFeedback ? (feedback) => onWritingFeedback(question.id, feedback) : undefined}
            onAnswer={(answer) => onAnswer(question.id, answer)}
            onResult={(result, checked) => onResult(question.id, result, checked)}
            t={t}
            lang={shownLang}
          />
        </div>
        <nav aria-label={t({ en: 'Practice questions', vi: 'Các câu tự luyện' })} className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-line bg-surface py-3">
          <button type="button" disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)} className={buttonVariants({ variant: 'outline' })}>
            {t({ en: 'Previous question', vi: 'Câu trước' })}
          </button>
          <button type="button" disabled={activeIndex === questions.length - 1} onClick={() => goTo(activeIndex + 1)} className={buttonVariants()}>
            {t({ en: 'Next question', vi: 'Câu tiếp' })}
          </button>
        </nav>
        <div aria-live="polite" className="flex flex-wrap justify-between gap-2 text-sm tabular-nums text-ink-muted">
          <span>{t({ en: `Checked ${summary.checked}/${summary.total}`, vi: `Đã kiểm tra ${summary.checked}/${summary.total}` })}</span>
          {summary.checked > 0 && <span className="font-semibold text-ink">{t({ en: `Correct ${summary.right}/${summary.total}`, vi: `Đúng ${summary.right}/${summary.total}` })}</span>}
        </div>
      </div>
      <aside aria-label={t({ en: 'Question status', vi: 'Trạng thái các câu' })} className={`${CARD} flex flex-col gap-4 lg:sticky lg:top-4`}>
        <h3 className="text-sm font-semibold text-ink">{t({ en: 'Question status', vi: 'Trạng thái các câu' })}</h3>
        <ol className="grid grid-cols-5 gap-2">
          {questions.map((q, i) => {
            const status = questionStatus(q, state);
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === activeIndex ? 'step' : undefined}
                  aria-label={t({ en: `Question ${i + 1}: ${STATUS_TEXT[status].en}`, vi: `Câu ${i + 1}: ${STATUS_TEXT[status].vi}` })}
                  className={`flex h-11 w-full items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none ${STATUS_CLASS[status]} ${i === activeIndex ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
        <ul className="flex flex-col gap-1.5 text-xs text-ink-muted">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded border ${STATUS_CLASS[status]}`} />
              {t(STATUS_TEXT[status])}
            </li>
          ))}
        </ul>
        <button type="button" disabled={!pending.length || submitting} onClick={submitAll} className={buttonVariants()}>
          {submitting ? t({ en: 'Submitting…', vi: 'Đang nộp…' }) : t({ en: `Submit all (${pending.length})`, vi: `Nộp bài (${pending.length} câu)` })}
        </button>
        <p aria-live="polite" className="text-xs text-ink-muted">
          {submitError
            ? <span className="text-danger">{t({ en: 'Some answers could not be checked. Try again.', vi: 'Một số câu chưa kiểm tra được. Hãy nộp lại.' })}</span>
            : t({ en: 'Grades every answered question at once.', vi: 'Chấm cùng lúc mọi câu đã làm.' })}
        </p>
      </aside>
    </div>
  );
}

interface QuestionCardProps {
  question: PublicPracticeQuestion;
  options: Array<{ id: string; text: Bilingual }>;
  answer: PracticeResponse | undefined;
  lessonId?: string;
  result: PracticeResult | undefined;
  writingFeedback?: WritingFeedbackState;
  onWritingFeedback?: (feedback: WritingFeedbackState) => void;
  onAnswer: (answer: PracticeResponse) => void;
  onResult: (result: PracticeResult, checked: PracticeResponse | undefined) => void;
  t: (text: Bilingual) => string;
  lang: 'vi' | 'en';
}

function QuestionCard({ question, lessonId, options, answer, result, writingFeedback, onWritingFeedback, onAnswer, onResult, t, lang }: QuestionCardProps) {
  const id = useId();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<Bilingual | null>(null);
  const response = responseOf(question, answer);
  const { data } = question;
  const stemId = `${id}-stem`;

  const check = async () => {
    if (!response || checking) return;
    setChecking(true);
    setError(null);
    const checked = answer;
    const res = await checkPractice(lessonId, question.id, response);
    setChecking(false);
    if (res.ok) onResult(resultOf(res), checked);
    else setError(res.error);
  };
  const answerWith = (next: PracticeResponse) => {
    setError(null);
    onAnswer(next);
  };
  const itemVerdict = (itemId: string) => result?.items?.find((it) => it.id === itemId);
  const picked = (itemId: string) => answer?.items?.find((it) => it.id === itemId)?.selected;

  const checkRow = (
    <div className="sticky bottom-[4.25rem] z-10 -mx-1 mt-4 flex flex-wrap items-center gap-3 bg-surface px-1 py-2">
      <button type="button" disabled={!response || checking} onClick={check} className={buttonVariants({ variant: result ? 'outline' : 'default' })}>
        {checking ? t({ en: 'Checking…', vi: 'Đang kiểm tra…' }) : result ? t({ en: 'Check again', vi: 'Kiểm tra lại' }) : t({ en: 'Check', vi: 'Kiểm tra' })}
      </button>
      <div key={result ? String(result.correct) : 'unchecked'} aria-live="polite" className={`text-sm ${result ? styles.result : ''}`}>
        {result &&
          !result.writing &&
          (result.correct ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-success">
              <CircleCheck aria-hidden="true" className="h-5 w-5" />
              {t({ en: 'Correct!', vi: 'Đúng rồi!' })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-semibold text-danger">
              <CircleX aria-hidden="true" className="h-5 w-5" />
              {t({ en: 'Not quite — change your answer and try again.', vi: 'Chưa đúng. Sửa câu trả lời rồi thử lại.' })}
            </span>
          ))}
        {result && <ResultNote result={result} t={t} />}
        {error && <span className="text-danger">{t(error)}</span>}
      </div>
    </div>
  );

  return (
    <section aria-labelledby={stemId} className={CARD}>
      <h3 id={stemId} className="text-base font-semibold text-ink">
        <MathText text={t(data.stem)} />
      </h3>
      {data.image && (
        <div className="mt-3">
          <QuestionFigure image={data.image} lang={lang} />
        </div>
      )}

      {'options' in data && (
        <fieldset className="mt-3 flex flex-col gap-2">
          <legend className="sr-only">{t({ en: 'Choose one option', vi: 'Chọn một phương án' })}</legend>
          {options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-edge px-3 py-2 text-ink transition-colors hover:bg-surface-sunken has-[:checked]:border-accent has-[:checked]:bg-surface-sunken motion-reduce:transition-none"
            >
              <input
                type="radio"
                name={`${id}-mc`}
                checked={answer?.selected_option === option.id}
                onChange={() => answerWith({ selected_option: option.id })}
                className="h-5 w-5 shrink-0 accent-[var(--accent,var(--action))]"
              />
              <MathText text={t(option.text)} className="min-w-0" />
            </label>
          ))}
        </fieldset>
      )}

      {'items' in data && (
        <ul className="mt-3 flex flex-col gap-2">
          {data.items.map((item, i) => {
            const verdict = itemVerdict(item.id);
            const choice = picked(item.id);
            const setItem = (selected: boolean) =>
              answerWith({ items: [...(answer?.items ?? []).filter((it) => it.id !== item.id), { id: item.id, selected }] });
            return (
              <li key={item.id} className="flex flex-col gap-2 rounded-lg border border-line px-3 py-2 sm:flex-row sm:items-center">
                <span id={`${id}-tf-${item.id}-text`} className="flex-1 text-ink">
                  <span aria-hidden="true" className="mr-2 font-bold text-ink-muted">{String.fromCharCode(97 + i)}</span>
                  <MathText text={t(item.text)} />
                </span>
                <span role="radiogroup" aria-labelledby={`${id}-tf-${item.id}-text`} className="flex items-center gap-3">
                  {[true, false].map((value) => (
                    <label key={String(value)} className="flex min-h-11 cursor-pointer items-center gap-1.5 text-sm text-ink">
                      <input
                        type="radio"
                        name={`${id}-tf-${item.id}`}
                        checked={choice === value}
                        onChange={() => setItem(value)}
                        className="h-5 w-5 accent-[var(--accent,var(--action))]"
                      />
                      {value ? t({ en: 'True', vi: 'Đúng' }) : t({ en: 'False', vi: 'Sai' })}
                    </label>
                  ))}
                </span>
                {result && verdict && (
                  <span className={`text-sm font-semibold ${choice === undefined ? 'text-ink-muted' : verdict.correct ? 'text-success' : 'text-danger'}`}>
                    {choice === undefined
                      ? t({ en: 'not answered', vi: 'chưa trả lời' })
                      : verdict.correct
                        ? t({ en: 'right', vi: 'đúng' })
                        : t({ en: 'not right', vi: 'chưa đúng' })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {question.type === 'short' && (
        <div className="mt-3">
          <label htmlFor={`${id}-short`} className="sr-only">
            {t({ en: 'Your answer', vi: 'Câu trả lời của bạn' })}
          </label>
          <input
            id={`${id}-short`}
            type="text"
            value={answer?.short_answer ?? ''}
            maxLength={500}
            onChange={(e) => answerWith({ short_answer: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void check();
            }}
            placeholder={t({ en: 'Your answer', vi: 'Câu trả lời của bạn' })}
            className="min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
        </div>
      )}

      {question.type === 'writing' && (
        <WritingAnswer
          questionId={question.id}
          value={answer?.writing_answer ?? ''}
          onChange={(text) => answerWith({ writing_answer: text })}
          result={result}
          t={t}
          lang={lang}
          actions={checkRow}
          feedbackState={writingFeedback}
          onFeedback={onWritingFeedback}
        />
      )}

      {question.type !== 'writing' && question.type !== 'code' && checkRow}
      {result?.explanation && (
        <p className="mt-3 rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink">
          <MathText text={t(result.explanation)} />
        </p>
      )}
      {data.source && (
        <div className="mt-3">
          <QuestionSource source={data.source} lang={lang} />
        </div>
      )}
    </section>
  );
}

/** What the answer earned: a provisional estimate offline, or the server's XP and a completed lesson. */
function ResultNote({ result, t }: { result: PracticeResult; t: (text: Bilingual) => string }) {
  const { provisional } = result;
  if (provisional) {
    const xp = provisional.xp > 0 ? { en: ` · +${provisional.xp} XP (estimate)`, vi: ` · +${provisional.xp} XP tạm tính` } : { en: '', vi: '' };
    const streak = provisional.streak ? { en: ` · ${provisional.streak}-day streak (estimate)`, vi: ` · chuỗi ${provisional.streak} ngày (tạm tính)` } : { en: '', vi: '' };
    return (
      <span className="mt-1 block text-ink-muted">
        {t({ en: `Provisional · waiting to sync${xp.en}${streak.en}`, vi: `Kết quả tạm · chờ đồng bộ${xp.vi}${streak.vi}` })}
      </span>
    );
  }
  return (
    <>
      {(result.xp_earned ?? 0) > 0 && !result.code && <span className="mt-1 block font-semibold text-ink">{`+${result.xp_earned} XP`}</span>}
      {result.lesson_completed && <span className="mt-1 block font-semibold text-success">{t({ en: 'You have completed this lesson.', vi: 'Bạn đã hoàn thành bài này.' })}</span>}
    </>
  );
}
