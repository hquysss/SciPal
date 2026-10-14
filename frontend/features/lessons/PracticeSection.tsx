'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { PracticeCheckResult, PracticeResponse, PublicPracticeQuestion } from '@scipal/types';
import { buttonVariants } from '@/components/ui/button';
import { MathText } from '@/components/math/MathText';
import { QuestionFigure, QuestionSource } from '@/components/math/QuestionFigure';
import { useShuffledOptions } from '@/lib/useShuffledOptions';
import { checkPractice, type PracticeLoad } from './practiceApi';
import { WritingAnswer, type WritingFeedbackState } from './WritingAnswer';
import styles from './practice.module.css';

type Bilingual = { en: string; vi: string };

/** This visit's answers and latest verdicts. Kept by the lesson view so switching parts loses nothing; never stored. */
export interface PracticeState {
  answers: Record<string, PracticeResponse>;
  results: Record<string, PracticeCheckResult>;
  activeQuestionId?: string;
  writingFeedback?: Record<string, WritingFeedbackState>;
}

/**
 * Record a verdict only if the answer is still the one that was checked: a reply arriving after
 * the learner changed the answer belongs to the old answer and is dropped.
 */
export function withResult(state: PracticeState, id: string, result: PracticeCheckResult, checked: PracticeResponse | undefined): PracticeState {
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
  const onResult = useCallback((id: string, result: PracticeCheckResult, checked: PracticeResponse | undefined) => {
    setState((old) => withResult(old, id, result, checked));
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
export function practiceSummary(ids: string[], results: Record<string, PracticeCheckResult>) {
  const checked = ids.filter((id) => results[id]);
  return { right: checked.filter((id) => results[id]!.correct).length, total: ids.length, checked: checked.length };
}

/** The answer to send, or null while there is nothing to check. */
export function responseOf(question: PublicPracticeQuestion, answer: PracticeResponse | undefined): PracticeResponse | null {
  if (question.type === 'mc') return answer?.selected_option ? { selected_option: answer.selected_option } : null;
  if (question.type === 'truefalse') return answer?.items?.length ? { items: answer.items } : null;
  if (question.type === 'writing') return answer?.writing_answer?.trim() ? { writing_answer: answer.writing_answer } : null;
  return answer?.short_answer?.trim() ? { short_answer: answer.short_answer } : null;
}

interface PracticeSectionProps {
  load: PracticeLoad;
  state: PracticeState;
  onAnswer: (id: string, answer: PracticeResponse) => void;
  /** `checked` is the answer object the verdict is for. */
  onResult: (id: string, result: PracticeCheckResult, checked: PracticeResponse | undefined) => void;
  onRetry?: () => void;
  onQuestion?: (id: string) => void;
  onWritingFeedback?: (id: string, feedback: WritingFeedbackState) => void;
  /** Read in this language instead of the reader's (the editor preview). */
  lang?: 'en' | 'vi';
}

const PART_ORDER =['mc', 'truefalse', 'short', 'writing'] as const;
const PART_TITLE: Record<(typeof PART_ORDER)[number], Bilingual> = {
  mc: { en: 'Multiple choice', vi: 'Trắc nghiệm nhiều phương án lựa chọn' },
  truefalse: { en: 'True / false', vi: 'Trắc nghiệm đúng sai' },
  short: { en: 'Short answer', vi: 'Trắc nghiệm trả lời ngắn' },
  writing: { en: 'Write in English', vi: 'Viết tiếng Anh' },
};

const CARD ='rounded-xl border border-line bg-surface p-4 sm:p-5';

export function PracticeSection({ load, state, onAnswer, onResult, onRetry, onQuestion, onWritingFeedback, lang }: PracticeSectionProps) {
  const { t: readerT, lang: readerLang } = useLanguage();
  const t = lang ? (text: Bilingual) => text[lang] || text.vi : readerT;
  const shownLang = lang ?? (readerLang === 'en' ? 'en' : 'vi');
  const [activeId, setActiveId] = useState<string>();
  const [backward, setBackward] = useState(false);
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
    return <p className={`${CARD} text-sm text-ink-muted`}>{t({ en: 'The practice questions are not ready yet.', vi: 'Câu tự luyện của bài này chưa sẵn sàng.' })}</p>;
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
  return (
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
      <nav aria-label={t({ en: 'Practice questions', vi: 'Các câu tự luyện' })} className="flex items-center justify-between gap-3">
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
  );
}

interface QuestionCardProps {
  question: PublicPracticeQuestion;
  options: Array<{ id: string; text: Bilingual }>;
  answer: PracticeResponse | undefined;
  result: PracticeCheckResult | undefined;
  writingFeedback?: WritingFeedbackState;
  onWritingFeedback?: (feedback: WritingFeedbackState) => void;
  onAnswer: (answer: PracticeResponse) => void;
  onResult: (result: PracticeCheckResult, checked: PracticeResponse | undefined) => void;
  t: (text: Bilingual) => string;
  lang: 'vi' | 'en';
}

function QuestionCard({ question, options, answer, result, writingFeedback, onWritingFeedback, onAnswer, onResult, t, lang }: QuestionCardProps) {
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
    const res = await checkPractice(question.id, response);
    setChecking(false);
    if (res.ok) onResult(res.result, checked);
    else setError(res.error);
  };
  const answerWith = (next: PracticeResponse) => {
    setError(null);
    onAnswer(next);
  };
  const itemVerdict = (itemId: string) => result?.items?.find((it) => it.id === itemId);
  const picked = (itemId: string) => answer?.items?.find((it) => it.id === itemId)?.selected;

  const checkRow = (
    <div className="mt-4 flex flex-wrap items-center gap-3">
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

      {question.type !== 'writing' && checkRow}
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
