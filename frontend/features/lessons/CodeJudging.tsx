'use client';

import { useEffect, useState } from 'react';
import { Check, LoaderCircle, Send, ServerCog, Trophy } from 'lucide-react';
import styles from './practice.module.css';

type Bilingual = { en: string; vi: string };

const STEPS: Array<{ icon: typeof Send; label: Bilingual; hint: Bilingual }> = [
  { icon: Send, label: { en: 'Submitted', vi: 'Đã gửi bài' }, hint: { en: 'Your code reached SciPal.', vi: 'Code của em đã tới SciPal.' } },
  {
    icon: ServerCog,
    label: { en: 'Running on every test', vi: 'Đang chạy trên bộ test' },
    hint: { en: 'The judge compiles your code and runs it on the examples and the hidden tests.', vi: 'Máy chấm biên dịch rồi chạy code của em trên test mẫu và test ẩn.' },
  },
  { icon: Trophy, label: { en: 'Result', vi: 'Trả kết quả' }, hint: { en: 'Each test gets a verdict.', vi: 'Mỗi test có một kết luận.' } },
];

/**
 * What the learner sees while the judge works: where the code is (three steps, the middle one
 * running) and for how long. The server answers everything at once, so no per-test progress is invented.
 */
export function CodeJudging({ t }: { t: (text: Bilingual) => string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      aria-label={t({ en: 'Judging your code', vi: 'Đang chấm bài' })}
      aria-busy="true"
      className={`flex flex-col gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-surface-sunken p-4 ${styles.result}`}
    >
      <div className="flex items-center gap-3">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface))] text-accent-ink">
          <span aria-hidden="true" className={`absolute inset-0 rounded-full ${styles.halo}`} />
          <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin motion-reduce:animate-none" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-lg font-extrabold text-ink">{t({ en: 'Judging your code…', vi: 'Đang chấm bài…' })}</p>
          <p className="text-sm text-ink">{t({ en: 'Stay on this page; the result shows up right here.', vi: 'Em cứ ở trang này, kết quả sẽ hiện ngay tại đây.' })}</p>
        </div>
        <p className="shrink-0 font-mono text-xl font-extrabold tabular-nums text-ink" aria-label={t({ en: `${seconds} seconds`, vi: `${seconds} giây` })}>
          {seconds}s
        </p>
      </div>

      <div className={`h-1.5 overflow-hidden rounded-full bg-surface`} aria-hidden="true">
        <div className={`h-full w-1/3 rounded-full bg-accent ${styles.sweep}`} />
      </div>

      <ol className="grid gap-2 sm:grid-cols-3">
        {STEPS.map((step, i) => {
          const state = i === 0 ? 'done' : i === 1 ? 'active' : 'waiting';
          const Icon = state === 'done' ? Check : step.icon;
          return (
            <li
              key={i}
              aria-current={state === 'active' ? 'step' : undefined}
              className={`flex items-start gap-2 rounded-xl px-3 py-2 ${state === 'active' ? 'bg-surface ring-2 ring-accent' : 'bg-surface'} ${state === 'waiting' ? 'opacity-70' : ''}`}
            >
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${state === 'done' ? 'bg-success-surface text-success' : state === 'active' ? 'bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface))] text-accent-ink' : 'bg-surface-sunken text-ink'}`}
              >
                {state === 'active' ? <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-bold text-ink">
                  {t(step.label)}
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
