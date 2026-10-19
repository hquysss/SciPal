'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, CircleCheck, CircleX, Code2, Sparkles, Trophy } from 'lucide-react';
import type { PracticeCheckResult, PracticeResponse, PublicPracticeQuestion } from '@scipal/types';
import { MathText } from '@/components/math/MathText';
import { CodeAnswer } from './CodeAnswer';
import { fetchSolvedCode } from './practiceApi';
import styles from './practice.module.css';

type Bilingual = { en: string; vi: string };

/** XP for the first accepted answer, by difficulty; the server decides, this only shows it. Keep in step with backend CODE_XP. */
export const CODE_XP: Record<number, number> = { 1: 20, 2: 35, 3: 50 };
const DIFFICULTY: Record<number, { label: Bilingual; tone: string }> = {
  1: { label: { en: 'Easy', vi: 'Dễ' }, tone: 'bg-success-surface text-success' },
  2: { label: { en: 'Medium', vi: 'Vừa' }, tone: 'bg-warning-surface text-warning' },
  3: { label: { en: 'Hard', vi: 'Khó' }, tone: 'bg-danger-surface text-danger' },
};

/** A short name for a problem: its statement up to the first colon, full stop or line break. */
export function problemTitle(stem: string): string {
  const first = stem.split(/[:.\n]/)[0]!.trim() || stem.trim();
  return first.length > 70 ? `${first.slice(0, 67).trimEnd()}…` : first;
}

interface CodePracticeBoardProps {
  questions: PublicPracticeQuestion[];
  answers: Record<string, PracticeResponse>;
  results: Record<string, PracticeCheckResult>;
  onAnswer: (id: string, answer: PracticeResponse) => void;
  onResult: (id: string, result: PracticeCheckResult, checked: PracticeResponse | undefined) => void;
  t: (text: Bilingual) => string;
}

/** Informatics practice as an online judge shows it: a problem set, then one problem at full width. */
export function CodePracticeBoard({ questions, answers, results, onAnswer, onResult, t }: CodePracticeBoardProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [solvedBefore, setSolvedBefore] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    void fetchSolvedCode().then((ids) => live && setSolvedBefore(ids));
    return () => {
      live = false;
    };
  }, []);

  const solved = (id: string) => solvedBefore.includes(id) || !!results[id]?.correct;
  const tried = (id: string) => !!results[id] && !results[id]!.correct;
  const solvedCount = questions.filter((q) => solved(q.id)).length;
  const xpTotal = questions.reduce((sum, q) => sum + (CODE_XP[q.difficulty] ?? CODE_XP[1]!), 0);
  const xpWon = questions.filter((q) => solved(q.id)).reduce((sum, q) => sum + (CODE_XP[q.difficulty] ?? CODE_XP[1]!), 0);
  const index = questions.findIndex((q) => q.id === openId);
  const open = index >= 0 ? questions[index] : undefined;

  const go = (id: string | null) => {
    setOpenId(id);
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };

  if (open) {
    const difficulty = DIFFICULTY[open.difficulty] ?? DIFFICULTY[1]!;
    const nav = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-surface-sunken disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
    return (
      <section aria-labelledby="code-problem-title" className={`flex flex-col gap-4 pb-20 ${styles.question}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => go(null)} className={nav}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t({ en: 'All problems', vi: 'Danh sách bài' })}
          </button>
          <div className="flex items-center gap-1">
            <button type="button" disabled={index === 0} onClick={() => go(questions[index - 1]!.id)} className={nav} aria-label={t({ en: 'Previous problem', vi: 'Bài trước' })}>
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="px-1 text-sm font-semibold tabular-nums text-ink">
              {t({ en: `Problem ${index + 1} / ${questions.length}`, vi: `Bài ${index + 1} / ${questions.length}` })}
            </span>
            <button type="button" disabled={index === questions.length - 1} onClick={() => go(questions[index + 1]!.id)} className={nav} aria-label={t({ en: 'Next problem', vi: 'Bài tiếp' })}>
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${difficulty.tone}`}>{t(difficulty.label)}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-bold text-ink">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
              {CODE_XP[open.difficulty] ?? CODE_XP[1]} XP
            </span>
            {solved(open.id) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-surface px-2.5 py-0.5 text-xs font-bold text-success">
                <CircleCheck aria-hidden="true" className="h-3.5 w-3.5" />
                {t({ en: 'Solved', vi: 'Đã giải' })}
              </span>
            )}
          </div>
          <h3 id="code-problem-title" className="text-xl font-bold leading-snug text-ink sm:text-2xl">
            {problemTitle(t(open.data.stem))}
          </h3>
          {problemTitle(t(open.data.stem)) !== t(open.data.stem).trim() && (
            <p className="text-base leading-relaxed text-ink">
              <MathText text={t(open.data.stem)} />
            </p>
          )}
        </div>

        <CodeAnswer
          key={open.id}
          question={open}
          answer={answers[open.id]}
          result={results[open.id]}
          onAnswer={(answer) => onAnswer(open.id, answer)}
          onResult={(result, checked) => onResult(open.id, result, checked)}
          t={t}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="code-board-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-surface-sunken p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface))] text-accent-ink">
            <Code2 aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h3 id="code-board-title" className="text-lg font-bold text-ink">
              {t({ en: 'Programming problems', vi: 'Bài lập trình' })}
            </h3>
            <p className="text-sm text-ink">{t({ en: 'Write code, submit, and the judge checks it on hidden tests.', vi: 'Viết code, nộp bài, hệ thống chấm bằng bộ test ẩn.' })}</p>
          </div>
        </div>
        <div className="flex gap-6 sm:text-right">
          <p>
            <span className="block font-mono text-2xl font-extrabold tabular-nums text-ink">
              {solvedCount}/{questions.length}
            </span>
            <span className="text-xs font-semibold text-ink">{t({ en: 'solved', vi: 'bài đã giải' })}</span>
          </p>
          <p>
            <span className="block font-mono text-2xl font-extrabold tabular-nums text-ink">
              {xpWon}/{xpTotal}
            </span>
            <span className="text-xs font-semibold text-ink">XP</span>
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface" role="progressbar" aria-label={t({ en: 'Problems solved', vi: 'Bài đã giải' })} aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={solvedCount}>
          <div className={`${styles.progress} h-full origin-left rounded-full bg-success`} style={{ transform: `scaleX(${questions.length ? solvedCount / questions.length : 0})` }} />
        </div>
      </div>

      <ol className="flex flex-col gap-2">
        {questions.map((q, i) => {
          const difficulty = DIFFICULTY[q.difficulty] ?? DIFFICULTY[1]!;
          const done = solved(q.id);
          const failed = !done && tried(q.id);
          const status = done ? t({ en: 'solved', vi: 'đã giải' }) : failed ? t({ en: 'not passed yet', vi: 'chưa đạt' }) : t({ en: 'not tried', vi: 'chưa làm' });
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => go(q.id)}
                aria-label={`${t({ en: `Problem ${i + 1}`, vi: `Bài ${i + 1}` })}: ${problemTitle(t(q.data.stem))}, ${t(difficulty.label)}, ${status}`}
                className="group flex min-h-16 w-full items-center gap-3 rounded-xl bg-surface-sunken px-3 py-3 text-left transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none sm:px-4"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-mono text-sm font-extrabold ${done ? 'bg-success-surface text-success' : failed ? 'bg-danger-surface text-danger' : 'bg-surface text-ink'}`} aria-hidden="true">
                  {done ? <CircleCheck className="h-5 w-5" /> : failed ? <CircleX className="h-5 w-5" /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-semibold text-ink">{problemTitle(t(q.data.stem))}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className={`rounded-full px-2 py-0.5 ${difficulty.tone}`}>{t(difficulty.label)}</span>
                    <span className="inline-flex items-center gap-1 text-ink">
                      <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                      {CODE_XP[q.difficulty] ?? CODE_XP[1]} XP
                    </span>
                    <span className="text-ink">{status}</span>
                  </span>
                </span>
                {done ? <Trophy aria-hidden="true" className="h-5 w-5 shrink-0 text-success" /> : <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-ink transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
