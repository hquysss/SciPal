'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Check, CircleCheck, CircleX, LoaderCircle, Send, ServerCog, Trophy } from 'lucide-react';
import type { CodeVerdict } from '@scipal/types';
import { TONE, VERDICT_TEXT, VerdictIcon, barTone } from './CodeResults';
import styles from './practice.module.css';

type Bilingual = { en: string; vi: string };

/** What the judge has said so far: the number of tests, and each finished test's verdict by index. */
export type JudgingProgress = { total: number; tests: Array<{ verdict: CodeVerdict; time_ms: number } | undefined> };

const STEPS: Array<{ icon: typeof Send; label: Bilingual; hint: Bilingual }> = [
  { icon: Send, label: { en: 'Submitted', vi: 'Đã gửi bài' }, hint: { en: 'Your code reached SciPal.', vi: 'Code của bạn đã tới SciPal.' } },
  {
    icon: ServerCog,
    label: { en: 'Running on every test', vi: 'Đang chạy trên bộ test' },
    hint: { en: 'The judge compiles your code and runs it on the examples and the hidden tests.', vi: 'Máy chấm biên dịch rồi chạy code của bạn trên test mẫu và test ẩn.' },
  },
  { icon: Trophy, label: { en: 'Result', vi: 'Trả kết quả' }, hint: { en: 'Each test gets a verdict.', vi: 'Mỗi test có một kết luận.' } },
];

/** What the judge is really doing, from what it has reported so far. */
const phaseOf = (progress: JudgingProgress | null | undefined): Bilingual =>
  !progress
    ? { en: 'Sending your code', vi: 'Đang gửi code' }
    : progress.tests.filter(Boolean).length < progress.total
      ? { en: 'Running the tests', vi: 'Đang chạy test' }
      : { en: 'Adding up the result', vi: 'Đang tổng hợp kết quả' };

/** Running tests are sky blue, so they never read as passed (green) or the subject colour. */
const RUNNING = 'bg-[color-mix(in_srgb,var(--sky)_28%,var(--surface))]';

/**
 * What the learner sees while the judge works: where the code is, for how long, and each test lighting
 * up with its verdict as the judge finishes it (tests finish in any order, so tiles do too).
 */
export function CodeJudging({ t, progress }: { t: (text: Bilingual) => string; progress?: JudgingProgress | null }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const tests = progress?.tests ?? [];
  const done = tests.filter(Boolean).length;
  const passed = tests.filter((x) => x?.verdict === 'AC').length;
  const failed = done - passed;
  const total = progress?.total ?? 0;
  const phase = phaseOf(progress);

  return (
    <section
      aria-label={t({ en: 'Judging your code', vi: 'Đang chấm bài' })}
      aria-busy="true"
      className={`flex flex-col gap-4 rounded-2xl border border-edge bg-surface-sunken p-4 ${styles.result}`}
    >
      <div className="flex items-center gap-3">
        <span className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full ${RUNNING} text-ink`}>
          <span aria-hidden="true" className={`absolute inset-0 rounded-full ${styles.halo}`} />
          <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin motion-reduce:animate-none" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* The step rolls in when the judge moves on to the next one. */}
          <p className={`text-lg font-extrabold text-ink ${styles.words}`}>
            <span key={phase.en} className={styles.word}>
              {t(phase)}
            </span>
          </p>
          <p className="text-sm text-ink">
            {progress
              ? t({ en: `${done} of ${total} tests judged`, vi: `Đã chấm ${done}/${total} test` })
              : t({ en: 'Sending your code to the judge…', vi: 'Đang gửi code tới máy chấm…' })}
          </p>
        </div>
        <p aria-hidden="true" className="shrink-0 font-mono text-xl font-extrabold tabular-nums text-ink">
          {seconds}s
        </p>
      </div>

      {/* One segment per test, coloured by its verdict once judged; before the count is known, a sweep. */}
      <div className="flex h-2.5 gap-1 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        {progress ? (
          tests.map((test, i) =>
            test ? <span key={`${i}-done`} className={`flex-1 ${styles.segment} ${barTone(test.verdict)}`} /> : <span key={i} className={`flex-1 ${styles.waiting} bg-[var(--sky)]`} />,
          )
        ) : (
          <div className={`h-full w-1/3 rounded-full bg-[var(--sky)] ${styles.sweep}`} />
        )}
      </div>

      {progress && (
        <>
          <ul className="flex flex-wrap gap-2 text-sm font-bold" aria-hidden="true">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-success-surface px-3 py-1 text-success">
              <CircleCheck className="h-4 w-4" />
              {t({ en: `${passed} passed`, vi: `${passed} đạt` })}
            </li>
            <li className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${failed ? 'bg-danger-surface text-danger' : 'bg-surface text-ink'}`}>
              <CircleX className="h-4 w-4" />
              {t({ en: `${failed} not passed`, vi: `${failed} chưa đạt` })}
            </li>
            <li className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-ink ${RUNNING}`}>
              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              {t({ en: `${total - done} running`, vi: `${total - done} đang chạy` })}
            </li>
          </ul>

          <ol className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2" aria-hidden="true">
            {tests.map((test, i) =>
              test ? (
                <li key={`${i}-done`} className={`flex flex-col gap-0.5 rounded-xl px-3 py-2 ${TONE[test.verdict].tile} ${styles.landed}`}>
                  <span className="text-xs font-bold text-ink">Test {i + 1}</span>
                  <span className={`flex items-center gap-1.5 font-mono text-base font-extrabold ${TONE[test.verdict].ink}`}>
                    <VerdictIcon verdict={test.verdict} className="h-4 w-4" />
                    {test.verdict}
                  </span>
                  <span className="text-xs font-semibold text-ink">
                    {t(VERDICT_TEXT[test.verdict])} · {test.time_ms} ms
                  </span>
                </li>
              ) : (
                <li
                  key={i}
                  style={{ '--i': i } as CSSProperties}
                  className={`flex flex-col gap-0.5 rounded-xl border border-dashed border-edge px-3 py-2 ${RUNNING} ${styles.waiting}`}
                >
                  <span className="text-xs font-bold text-ink">Test {i + 1}</span>
                  <span className="flex items-center gap-1.5 font-mono text-base font-extrabold text-ink">
                    <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />…
                  </span>
                  <span className="text-xs font-semibold text-ink">{t({ en: 'Running', vi: 'Đang chạy' })}</span>
                </li>
              ),
            )}
          </ol>
          <p className="sr-only">{t({ en: `${done} of ${total} tests judged, ${passed} passed.`, vi: `Đã chấm ${done}/${total} test, ${passed} test đạt.` })}</p>
        </>
      )}

      <ol className="grid gap-2 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const state = i === 0 ? 'done' : i === 1 ? 'active' : 'waiting';
          const Icon = state === 'done' ? Check : step.icon;
          return (
            <li
              key={i}
              aria-current={state === 'active' ? 'step' : undefined}
              className={`flex items-start gap-2 rounded-xl bg-surface px-3 py-2 ${state === 'active' ? 'ring-2 ring-[var(--sky)]' : ''} ${state === 'waiting' ? 'opacity-70' : ''}`}
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${state === 'done' ? 'bg-success-surface text-success' : state === 'active' ? `${RUNNING} text-ink` : 'bg-surface-sunken text-ink'}`}
              >
                {state === 'active' ? <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-bold text-ink">
                  {t(step.label)}
                  {state === 'active' && progress ? ` · ${done}/${total}` : ''}
                  <span className="sr-only">
                    {' '}
                    ({state === 'done' ? t({ en: 'done', vi: 'xong' }) : state === 'active' ? t({ en: 'in progress', vi: 'đang làm' }) : t({ en: 'next', vi: 'tiếp theo' })})
                  </span>
                </span>
                <span className="text-xs text-ink">{t(step.hint)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
