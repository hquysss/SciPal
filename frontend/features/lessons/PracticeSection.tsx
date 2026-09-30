'use client';

import { useCallback, useId, useState } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { PracticeCheckResult, PracticeResponse, PublicPracticeQuestion } from '@scipal/types';
import { buttonVariants } from '@/components/ui/button';
import { checkPractice, type PracticeLoad } from './practiceApi';

type Bilingual = { en: string; vi: string };

/** This visit's answers and latest verdicts. Kept by the lesson view so switching parts loses nothing; never stored. */
export interface PracticeState {
  answers: Record<string, PracticeResponse>;
  results: Record<string, PracticeCheckResult>;
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
      return { answers: { ...old.answers, [id]: answer }, results };
    });
  }, []);
  const onResult = useCallback((id: string, result: PracticeCheckResult, checked: PracticeResponse | undefined) => {
    setState((old) => withResult(old, id, result, checked));
  }, []);
  return { state, onAnswer, onResult };
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
  return answer?.short_answer?.trim() ? { short_answer: answer.short_answer } : null;
}

interface PracticeSectionProps {
  load: PracticeLoad;
  state: PracticeState;
  onAnswer: (id: string, answer: PracticeResponse) => void;
  /** `checked` is the answer object the verdict is for. */
  onResult: (id: string, result: PracticeCheckResult, checked: PracticeResponse | undefined) => void;
  onRetry?: () => void;
  /** Read in this language instead of the reader's (the editor preview). */
  lang?: 'en' | 'vi';
}

const CARD = 'rounded-xl border border-line bg-surface p-4 sm:p-5';

/** The Tự luyện part: every question with its own check, then this visit's score. */
export function PracticeSection({ load, state, onAnswer, onResult, onRetry, lang }: PracticeSectionProps) {
  const { t: readerT } = useLanguage();
  const t = lang ? (text: Bilingual) => text[lang] || text.vi : readerT;

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
  if (load.questions.length === 0) {
    return <p className={`${CARD} text-sm text-ink-muted`}>{t({ en: 'The practice questions are not ready yet.', vi: 'Câu tự luyện của bài này chưa sẵn sàng.' })}</p>;
  }

  const summary = practiceSummary(
    load.questions.map((q) => q.id),
    state.results,
  );
  return (
    <div className="flex flex-col gap-5">
      {load.questions.map((question, i) => (
        <QuestionCard
          key={question.id}
          number={i + 1}
          question={question}
          answer={state.answers[question.id]}
          result={state.results[question.id]}
          onAnswer={(answer) => onAnswer(question.id, answer)}
          onResult={(result, checked) => onResult(question.id, result, checked)}
          t={t}
        />
      ))}
      <p aria-live="polite" className="text-center text-lg font-bold text-ink">
        {summary.checked > 0 && t({ en: `Correct ${summary.right}/${summary.total}`, vi: `Đúng ${summary.right}/${summary.total}` })}
      </p>
    </div>
  );
}

interface QuestionCardProps {
  number: number;
  question: PublicPracticeQuestion;
  answer: PracticeResponse | undefined;
  result: PracticeCheckResult | undefined;
  onAnswer: (answer: PracticeResponse) => void;
  onResult: (result: PracticeCheckResult, checked: PracticeResponse | undefined) => void;
  t: (text: Bilingual) => string;
}

function QuestionCard({ number, question, answer, result, onAnswer, onResult, t }: QuestionCardProps) {
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

  return (
    <section aria-labelledby={stemId} className={CARD}>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{t({ en: `Question ${number}`, vi: `Câu ${number}` })}</p>
      <h3 id={stemId} className="mt-1 whitespace-pre-line text-base font-semibold text-ink">
        {t(data.stem)}
      </h3>

      {'options' in data && (
        <fieldset className="mt-3 flex flex-col gap-2">
          <legend className="sr-only">{t({ en: 'Choose one option', vi: 'Chọn một phương án' })}</legend>
          {data.options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2 text-ink transition-colors hover:bg-surface-sunken has-[:checked]:border-accent"
            >
              <input
                type="radio"
                name={`${id}-mc`}
                checked={answer?.selected_option === option.id}
                onChange={() => answerWith({ selected_option: option.id })}
                className="h-5 w-5 shrink-0 accent-[var(--accent,var(--action))]"
              />
              <span>{t(option.text)}</span>
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
                  {t(item.text)}
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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!response || checking} onClick={check} className={buttonVariants({ variant: result ? 'outline' : 'default' })}>
          {checking ? t({ en: 'Checking…', vi: 'Đang kiểm tra…' }) : result ? t({ en: 'Check again', vi: 'Kiểm tra lại' }) : t({ en: 'Check', vi: 'Kiểm tra' })}
        </button>
        <div aria-live="polite" className="text-sm">
          {result &&
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
      {result?.explanation && (
        <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-sunken px-3 py-2 text-sm text-ink">{t(result.explanation)}</p>
      )}
    </section>
  );
}
