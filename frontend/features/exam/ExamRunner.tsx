'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CircleCheck, CircleX, Timer } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { AnswerPalette } from './AnswerPalette';
import { forgetExamAttempt, startExamAttempt } from './examAttempt';
import { createBrowserClient } from '../../lib/supabase';
import { Alert } from '../../components/ui/alert';
import { buttonVariants } from '../../components/ui/button';

type Bilingual = { en: string; vi: string };

export interface ExamQuestionItem {
  id: string;
  /** mc: pick one option; truefalse: judge each statement; short: type the answer. */
  type: string;
  /** 1 (easy) to 3 (hard) from the API; older data used words. */
  difficulty?: number | 'easy' | 'medium' | 'hard';
  data: {
    stem: Bilingual;
    options?: Array<{ id: string; text: Bilingual }>;
    items?: Array<{ id: string; text: Bilingual }>;
  };
}

/** What the student has entered for one question so far. */
export interface DraftAnswer {
  option?: string;
  items?: Record<string, boolean>;
  text?: string;
}

export function isAnswered(answer: DraftAnswer | undefined): boolean {
  if (!answer) return false;
  return Boolean(answer.option) || Object.keys(answer.items ?? {}).length > 0 || Boolean(answer.text?.trim());
}

export interface SubmittedAnswer {
  question_id: string;
  selected_option?: string;
  items?: Array<{ id: string; selected: boolean }>;
  short_answer?: string;
}

/** The body POST /api/score/exam expects, one entry per answered question. */
export function toSubmission(questions: ExamQuestionItem[], answers: Record<number, DraftAnswer>): SubmittedAnswer[] {
  return questions.flatMap((question, index): SubmittedAnswer[] => {
    const answer = answers[index];
    if (!isAnswered(answer)) return [];
    if (question.type === 'truefalse') {
      return [{
        question_id: question.id,
        items: Object.entries(answer!.items ?? {}).map(([id, selected]) => ({ id, selected })),
      }];
    }
    if (question.type === 'short') return [{ question_id: question.id, short_answer: answer!.text!.trim() }];
    return [{ question_id: question.id, selected_option: answer!.option }];
  });
}

export function difficultyKey(value: ExamQuestionItem['difficulty']): 'easy' | 'medium' | 'hard' {
  if (value === 1 || value === 'easy') return 'easy';
  if (value === 3 || value === 'hard') return 'hard';
  return 'medium';
}

export type TimerTone = 'normal' | 'warning' | 'danger';

/** Timer colour band: warning under five minutes, danger in the last minute. */
export function timerTone(secondsLeft: number): TimerTone {
  if (secondsLeft <= 60) return 'danger';
  if (secondsLeft <= 300) return 'warning';
  return 'normal';
}

const TIMER_CLASS: Record<TimerTone, string> = {
  normal: 'border-line bg-surface text-ink',
  warning: 'border-transparent bg-warning-surface text-warning',
  danger: 'border-transparent bg-danger-surface text-danger',
};

const DIFFICULTY_LABEL = {
  easy: { en: 'Easy', vi: 'Dễ' },
  medium: { en: 'Medium', vi: 'Trung bình' },
  hard: { en: 'Hard', vi: 'Khó' },
} as const;

interface ExamRunnerProps {
  blueprintId: string;
  blueprintTitle?: { en: string; vi: string };
  questions: ExamQuestionItem[];
  durationMinutes?: number;
  token?: string;
}

export function ExamRunner({
  blueprintId,
  blueprintTitle,
  questions,
  durationMinutes = 45,
  token,
}: ExamRunnerProps) {
  const { lang, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const autoSubmitAttempted = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, DraftAnswer>>({});
  const answeredIndexes = Object.fromEntries(
    Object.entries(answers).filter(([, answer]) => isAnswered(answer)).map(([index]) => [index, true]),
  );
  const updateAnswer = (index: number, next: DraftAnswer) => setAnswers((prev) => ({ ...prev, [index]: next }));
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number;
    correct_count: number;
    total_questions: number;
    xp_earned: number;
  } | null>(null);
  // The graded attempt (created before the exam for a signed-in student; guests sign in at submit).
  const [attempt, setAttempt] = useState<{ id: string; remaining: number | null; period: 'day' | 'month' | null } | null>(null);
  const [attemptProblem, setAttemptProblem] = useState<{ error: Bilingual; blocked: boolean } | null>(null);

  const begin = useCallback(async (authToken: string) => {
    const res = await startExamAttempt(blueprintId, authToken);
    if (res.ok) {
      setAttempt({ id: res.attemptId, remaining: res.remaining, period: res.period });
      setAttemptProblem(null);
      return res.attemptId;
    }
    setAttemptProblem({ error: res.error, blocked: res.blocked });
    return null;
  }, [blueprintId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const authToken = token ?? (await createBrowserClient().auth.getSession()).data.session?.access_token;
      if (active && authToken) await begin(authToken);
    })();
    return () => {
      active = false;
    };
  }, [begin, token]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmissionError(null);
    setSubmitting(true);

    const formatted = toSubmission(questions, answers);

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
    try {
      const authToken = token ?? (await createBrowserClient().auth.getSession()).data.session?.access_token;
      if (!authToken) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const attemptId = attempt?.id ?? (await begin(authToken));
      if (!attemptId) return;

      const res = await fetch(`${API_BASE}/api/score/exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ blueprint_id: blueprintId, attempt_id: attemptId, answers: formatted }),
      });

      if (!res.ok) throw new Error(`Exam scoring failed: ${res.status}`);
      const data = await res.json();
      if (!Number.isFinite(data.score) || !Number.isFinite(data.xp_earned)) {
        throw new Error('Invalid exam score response');
      }
      setResult(data);
      forgetExamAttempt(blueprintId);
    } catch {
      setSubmissionError(t({
        en: 'Your exam could not be submitted. Answers are still here; please try again.',
        vi: 'Chưa nộp được bài thi. Câu trả lời vẫn được giữ; vui lòng thử lại.',
      }));
    } finally {
      setSubmitting(false);
    }
  }, [answers, attempt, begin, blueprintId, pathname, questions, router, submitting, t, token]);

  // Countdown timer with auto-submit
  useEffect(() => {
    if (result) return;
    if (timeLeft <= 0) {
      if (!autoSubmitAttempted.current) {
        autoSubmitAttempted.current = true;
        void handleSubmit();
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result, handleSubmit]);

  const currentQ = questions[currentIndex];
  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;
  const tone = timerTone(timeLeft);

  if (result) {
    const isHigh = result.score >= 8;
    const isMedium = result.score >= 5;
    const wrongCount = Math.max(0, result.total_questions - result.correct_count);

    return (
      <section className="rounded-xl border border-line bg-surface p-8 text-center sm:p-12">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">{t({ en: 'Exam result', vi: 'Kết quả bài thi thử' })}</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {blueprintTitle
            ? lang === 'en'
              ? blueprintTitle.en
              : blueprintTitle.vi
            : t({ en: 'Informatics evaluation', vi: 'Khảo sát chất lượng Tin học' })}
        </p>

        <div className="my-6 flex flex-col items-center">
          <span className="text-6xl font-bold tabular-nums text-ink">
            {result.score}
            <span className="text-2xl font-semibold text-ink-muted"> / 10</span>
          </span>
          <span className="mt-2 text-base font-semibold text-ink-muted">
            {isHigh
              ? t({ en: 'Very good! You know this well.', vi: 'Rất tốt! Bạn nắm chắc phần này.' })
              : isMedium
                ? t({ en: 'Passed. Look over the questions you missed.', vi: 'Đạt rồi. Xem lại các câu sai nhé.' })
                : t({ en: 'Needs revision', vi: 'Cần ôn tập thêm các chủ đề' })}
          </span>
        </div>

        <dl className="mx-auto grid max-w-md grid-cols-1 gap-3 text-left sm:grid-cols-3">
          <div className="rounded-lg bg-surface-sunken p-3">
            <dt className="flex items-center gap-1 text-sm font-semibold text-success">
              <CircleCheck aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Correct', vi: 'Câu đúng' })}
            </dt>
            <dd className="text-lg font-bold tabular-nums text-ink">
              {result.correct_count} / {result.total_questions}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-sunken p-3">
            <dt className="flex items-center gap-1 text-sm font-semibold text-danger">
              <CircleX aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Wrong or blank', vi: 'Sai hoặc bỏ trống' })}
            </dt>
            <dd className="text-lg font-bold tabular-nums text-ink">{wrongCount}</dd>
          </div>
          <div className="rounded-lg bg-surface-sunken p-3">
            <dt className="text-sm font-semibold text-ink-muted">{t({ en: 'XP earned', vi: 'Phần thưởng XP' })}</dt>
            <dd className="text-lg font-bold tabular-nums text-ink">+{result.xp_earned} XP</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/exam" className={buttonVariants({ variant: 'outline' })}>
            {t({ en: 'Exam list', vi: 'Danh sách đề thi' })}
          </Link>
          <Link href="/progress" className={buttonVariants()}>
            {t({ en: 'View learning progress', vi: 'Xem tiến trình & huy hiệu' })}
          </Link>
        </div>
      </section>
    );
  }

  if (attemptProblem?.blocked) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="text-xl font-bold text-ink">{t({ en: 'No graded attempts left', vi: 'Đã hết lượt thi chấm điểm' })}</h2>
        <p className="text-base text-ink-muted">{t(attemptProblem.error)}</p>
        <Link href="/exam" className={buttonVariants({ variant: 'outline' })}>
          {t({ en: 'Back to exams', vi: 'Về danh sách đề' })}
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {attemptProblem && (
        <Alert tone="warning">
          {t(attemptProblem.error)}{' '}
          {t({ en: 'Your answers are kept; submitting will try again.', vi: 'Câu trả lời vẫn được giữ; khi nộp bài sẽ thử lại.' })}
        </Alert>
      )}
      {/* Top sticky timer bar */}
      <div className="sticky top-20 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="timer"
            aria-label={t({ en: 'Time remaining', vi: 'Thời gian còn lại' })}
            className={`flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-lg font-bold tabular-nums ${TIMER_CLASS[tone]}`}
          >
            <Timer aria-hidden="true" className="h-5 w-5" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
          {attempt?.remaining != null && (
            <span className="text-sm text-ink-muted">
              {attempt.period === 'day'
                ? t({ en: `${attempt.remaining} graded attempts left today`, vi: `Còn ${attempt.remaining} lượt thi chấm điểm hôm nay` })
                : t({ en: `${attempt.remaining} graded attempts left this month`, vi: `Còn ${attempt.remaining} lượt thi chấm điểm tháng này` })}
            </span>
          )}
          <span aria-live="polite" className="text-sm font-semibold text-ink-muted">
            {tone === 'danger'
              ? t({ en: 'Under 1 minute left', vi: 'Còn dưới 1 phút' })
              : tone === 'warning'
                ? t({ en: 'Under 5 minutes left', vi: 'Còn dưới 5 phút' })
                : ''}
          </span>
        </div>

        <button type="button" onClick={handleSubmit} disabled={submitting} className={buttonVariants()}>
          {submitting ? t({ en: 'Submitting…', vi: 'Đang nộp bài…' }) : t({ en: 'Submit exam', vi: 'Nộp bài thi' })}
        </button>
      </div>

      {submissionError && <Alert tone="danger">{submissionError}</Alert>}

      {/* Main question card */}
      {currentQ && (
        <section className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
          <fieldset className="flex min-w-0 flex-col gap-6">
            <legend className="flex w-full flex-col gap-6">
              <span className="flex flex-wrap items-center gap-2.5 border-b border-line pb-3">
                <span className="rounded-md bg-surface-sunken px-3 py-1 text-sm font-bold text-ink">
                  {t({ en: 'Question', vi: 'Câu' })} {currentIndex + 1} / {questions.length}
                </span>
                <span className="rounded-md bg-surface-sunken px-3 py-1 text-sm font-semibold text-ink-muted">
                  {t(DIFFICULTY_LABEL[difficultyKey(currentQ.difficulty)])}
                </span>
              </span>
              <span className="text-lg font-bold leading-relaxed text-ink sm:text-xl">
                {lang === 'en' ? currentQ.data.stem.en : currentQ.data.stem.vi}
              </span>
            </legend>

            {currentQ.type === 'truefalse' && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">
                  {t({ en: 'Mark each statement true or false.', vi: 'Chọn Đúng hoặc Sai cho từng nhận định.' })}
                </p>
                {currentQ.data.items?.map((item, itemIndex) => {
                  const chosen = answers[currentIndex]?.items?.[item.id];
                  return (
                    <div
                      key={item.id}
                      role="radiogroup"
                      aria-label={`${String.fromCharCode(97 + itemIndex)}) ${lang === 'en' ? item.text.en : item.text.vi}`}
                      className="flex flex-col gap-3 rounded-lg border border-edge bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-base font-semibold leading-normal text-ink">
                        {String.fromCharCode(97 + itemIndex)}) {lang === 'en' ? item.text.en : item.text.vi}
                      </span>
                      <span className="flex shrink-0 gap-2">
                        {([true, false] as const).map((value) => (
                          <label
                            key={String(value)}
                            className={`flex min-h-11 min-w-20 cursor-pointer items-center justify-center rounded-lg border px-4 text-sm font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                              chosen === value ? 'border-action bg-action text-action-ink' : 'border-edge bg-surface text-ink hover:bg-surface-sunken'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQ.id}-${item.id}`}
                              checked={chosen === value}
                              onChange={() =>
                                updateAnswer(currentIndex, {
                                  items: { ...(answers[currentIndex]?.items ?? {}), [item.id]: value },
                                })
                              }
                              className="sr-only"
                            />
                            {value ? t({ en: 'True', vi: 'Đúng' }) : t({ en: 'False', vi: 'Sai' })}
                          </label>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {currentQ.type === 'short' && (
              <label className="flex flex-col gap-2 text-sm font-semibold text-ink">
                {t({ en: 'Your answer', vi: 'Câu trả lời của bạn' })}
                <input
                  type="text"
                  value={answers[currentIndex]?.text ?? ''}
                  onChange={(e) => updateAnswer(currentIndex, { text: e.target.value })}
                  maxLength={500}
                  autoComplete="off"
                  className="min-h-11 rounded-lg border border-edge bg-surface px-4 py-3 text-base font-normal text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                />
              </label>
            )}

            {/* Options list */}
            <div className="flex flex-col gap-3">
              {(currentQ.type === 'truefalse' || currentQ.type === 'short' ? [] : currentQ.data.options ?? []).map((opt, optIndex) => {
                const letter = String.fromCharCode(65 + optIndex);
                const isSelected = answers[currentIndex]?.option === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex min-h-11 w-full cursor-pointer items-center gap-4 rounded-lg border p-4 text-left text-base font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus sm:p-5 ${
                      isSelected
                        ? 'border-action bg-[color-mix(in_srgb,var(--action)_10%,var(--surface))] text-ink'
                        : 'border-edge bg-surface text-ink hover:bg-surface-sunken'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => updateAnswer(currentIndex, { option: opt.id })}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        isSelected ? 'bg-action text-action-ink' : 'border border-edge bg-surface-sunken text-ink'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 leading-normal">{lang === 'en' ? opt.text.en : opt.text.vi}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Bottom question step buttons */}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
              className={buttonVariants({ variant: 'outline' })}
            >
              <ChevronLeft aria-hidden="true" />
              {t({ en: 'Previous', vi: 'Câu trước' })}
            </button>
            <button
              type="button"
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
              className={buttonVariants({ variant: 'secondary' })}
            >
              {t({ en: 'Next question', vi: 'Câu tiếp theo' })}
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>
      )}

      {/* Answer Palette */}
      <AnswerPalette
        total={questions.length}
        currentIndex={currentIndex}
        answers={answeredIndexes}
        onSelect={(i) => setCurrentIndex(i)}
      />
    </div>
  );
}
