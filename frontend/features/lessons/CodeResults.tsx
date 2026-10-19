'use client';

import { forwardRef, useState, type CSSProperties } from 'react';
import { CircleAlert, CircleCheck, CircleX, Clock, Lock, Sparkles, Trophy } from 'lucide-react';
import type { CodeResult, CodeVerdict } from '@scipal/types';
import styles from './practice.module.css';

type Bilingual = { en: string; vi: string };

export const VERDICT_TEXT: Record<CodeVerdict, Bilingual> = {
  AC: { en: 'Passed', vi: 'Đạt' },
  WA: { en: 'Wrong answer', vi: 'Sai kết quả' },
  TLE: { en: 'Time limit exceeded', vi: 'Quá thời gian' },
  MLE: { en: 'Memory limit exceeded', vi: 'Quá bộ nhớ' },
  RE: { en: 'Runtime error', vi: 'Lỗi khi chạy' },
  CE: { en: 'Compile error', vi: 'Lỗi biên dịch' },
};

/** A friendly hint per verdict, in the voice of a teacher. */
const VERDICT_HINT: Record<CodeVerdict, Bilingual> = {
  AC: { en: 'Every test passed. Great work!', vi: 'Mọi test đều đạt. Làm tốt lắm!' },
  WA: { en: 'The program runs but prints something else. Compare with an example.', vi: 'Chương trình chạy được nhưng in ra chưa đúng. Thử so với ví dụ mẫu nhé.' },
  TLE: { en: 'Too slow: look for a loop that runs too many times.', vi: 'Chạy quá lâu: xem lại vòng lặp nào chạy quá nhiều lần.' },
  MLE: { en: 'Uses too much memory: a list may be larger than it needs to be.', vi: 'Dùng quá nhiều bộ nhớ: có thể một danh sách đang lớn hơn cần thiết.' },
  RE: { en: 'The program stopped with an error. Check indexes, division by zero and the input format.', vi: 'Chương trình dừng vì lỗi. Kiểm tra chỉ số mảng, phép chia cho 0 và cách đọc dữ liệu.' },
  CE: { en: 'The code does not compile. Read the first error message below.', vi: 'Code chưa biên dịch được. Đọc lỗi đầu tiên bên dưới nhé.' },
};

/** Tile and banner colours per verdict (theme tokens; the verdict is always written too). */
const TONE: Record<CodeVerdict, { tile: string; ink: string }> = {
  AC: { tile: 'bg-success-surface', ink: 'text-success' },
  WA: { tile: 'bg-danger-surface', ink: 'text-danger' },
  RE: { tile: 'bg-danger-surface', ink: 'text-danger' },
  TLE: { tile: 'bg-warning-surface', ink: 'text-warning' },
  MLE: { tile: 'bg-warning-surface', ink: 'text-warning' },
  CE: { tile: 'bg-warning-surface', ink: 'text-warning' },
};

const PRE = 'mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface px-3 py-2 font-mono text-sm text-ink';

function VerdictIcon({ verdict, className }: { verdict: CodeVerdict; className: string }) {
  if (verdict === 'AC') return <CircleCheck aria-hidden="true" className={className} />;
  if (verdict === 'TLE') return <Clock aria-hidden="true" className={className} />;
  if (verdict === 'CE' || verdict === 'MLE') return <CircleAlert aria-hidden="true" className={className} />;
  return <CircleX aria-hidden="true" className={className} />;
}

/** The judge's answer: a verdict banner, a bar of passed tests, and one tile per test. Only example tests open to show output. */
/** `ref` is the summary heading, focused when a fresh verdict arrives so it is read out and in view. */
export const CodeResults = forwardRef<HTMLHeadingElement, { result: CodeResult; xpEarned?: number; t: (text: Bilingual) => string }>(function CodeResults({ result, xpEarned, t }, ref) {
  const total = result.tests.length;
  const passed = result.tests.filter((test) => test.verdict === 'AC').length;
  const firstOpen = result.tests.findIndex((test) => test.stdout !== undefined && test.verdict !== 'AC');
  const [open, setOpen] = useState<number | null>(firstOpen >= 0 ? firstOpen : null);
  const shown = open !== null ? result.tests[open] : undefined;
  const tone = TONE[result.status];

  return (
    <section aria-label={t({ en: 'Judge result', vi: 'Kết quả chấm' })} className={`flex flex-col gap-4 ${styles.result}`}>
      <div className={`flex items-start gap-3 rounded-2xl p-4 ${tone.tile} ${styles.verdict}`}>
        {result.status === 'AC' ? <Trophy aria-hidden="true" className={`h-8 w-8 shrink-0 ${tone.ink} ${styles.trophy}`} /> : <VerdictIcon verdict={result.status} className={`h-8 w-8 shrink-0 ${tone.ink}`} />}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h4 ref={ref} tabIndex={-1} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            <span className="sr-only">{t({ en: 'Judged: ', vi: 'Đã chấm xong: ' })}</span>
            <span className={`text-lg font-extrabold ${tone.ink}`}>{t(VERDICT_TEXT[result.status])}</span>
            <span className="font-mono text-sm font-bold text-ink">{result.status}</span>
            <span className="sr-only">, {t({ en: `${passed} of ${total} tests passed`, vi: `${passed}/${total} test đạt` })}</span>
          </h4>
          <p className="text-sm text-ink">{t(VERDICT_HINT[result.status])}</p>
          {!!xpEarned && xpEarned > 0 && (
            <p className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-surface px-3 py-1 text-sm font-extrabold text-ink">
              <Sparkles aria-hidden="true" className="h-4 w-4 text-accent" />
              {t({ en: `+${xpEarned} XP`, vi: `+${xpEarned} XP` })}
            </p>
          )}
        </div>
        <p className="shrink-0 text-right">
          <span className="block font-mono text-2xl font-extrabold tabular-nums text-ink">
            {passed}/{total}
          </span>
          <span className="text-xs font-semibold text-ink">{t({ en: `${passed}/${total} tests passed`, vi: `${passed}/${total} test đạt` })}</span>
        </p>
      </div>

      <div className="flex h-2.5 gap-1 overflow-hidden rounded-full" aria-hidden="true">
        {result.tests.map((test, i) => (
          <span key={i} style={{ '--i': i } as CSSProperties} className={`flex-1 ${styles.segment} ${test.verdict === 'AC' ? 'bg-success' : TONE[test.verdict].ink === 'text-warning' ? 'bg-warning' : 'bg-danger'}`} />
        ))}
      </div>

      {result.compile_message && (
        <div>
          <p className="text-sm font-bold text-ink">{t({ en: 'Compiler message', vi: 'Thông báo của trình biên dịch' })}</p>
          <pre className={PRE}>{result.compile_message}</pre>
        </div>
      )}

      <ol className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
        {result.tests.map((test, i) => {
          const visible = test.stdout !== undefined;
          const body = (
            <>
              <span className="flex items-center justify-between gap-2 text-xs font-bold text-ink">
                <span>
                  Test {i + 1}
                  {visible ? '' : t({ en: ' (hidden)', vi: ' (ẩn)' })}
                </span>
                {!visible && <Lock aria-hidden="true" className="h-3.5 w-3.5" />}
              </span>
              <span className={`flex items-center gap-1.5 font-mono text-base font-extrabold ${TONE[test.verdict].ink}`}>
                <VerdictIcon verdict={test.verdict} className="h-4 w-4" />
                {test.verdict}
              </span>
              <span className="text-xs font-semibold text-ink">{t(VERDICT_TEXT[test.verdict])}</span>
              <span className="font-mono text-xs tabular-nums text-ink">
                {test.time_ms} ms · {(test.memory_kb / 1024).toFixed(1)} MB
              </span>
            </>
          );
          const tile = `flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left ${TONE[test.verdict].tile}`;
          return (
            <li key={i} style={{ '--i': i } as CSSProperties} className={styles.tile}>
              {visible ? (
                <button
                  type="button"
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? null : i)}
                  className={`${tile} min-h-11 transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${open === i ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
                >
                  {body}
                </button>
              ) : (
                <div className={tile}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>

      {shown && open !== null && (
        <div className="grid gap-3 rounded-2xl bg-surface-sunken p-3 sm:grid-cols-2">
          <p className="text-sm font-bold text-ink sm:col-span-2">
            Test {open + 1}: {t(VERDICT_TEXT[shown.verdict])}
          </p>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink">{t({ en: 'Your output', vi: 'Output của em' })}</p>
            <pre className={PRE}>{shown.stdout || ' '}</pre>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink">{t({ en: 'Expected output', vi: 'Kết quả đúng' })}</p>
            <pre className={PRE}>{shown.expected || ' '}</pre>
          </div>
        </div>
      )}
    </section>
  );
});
