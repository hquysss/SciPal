'use client';

import { CircleCheck, CircleX } from 'lucide-react';
import type { CodeResult, CodeVerdict } from '@scipal/types';

type Bilingual = { en: string; vi: string };

export const VERDICT_TEXT: Record<CodeVerdict, Bilingual> = {
  AC: { en: 'Passed', vi: 'Đạt' },
  WA: { en: 'Wrong answer', vi: 'Sai kết quả' },
  TLE: { en: 'Time limit exceeded', vi: 'Quá thời gian' },
  MLE: { en: 'Memory limit exceeded', vi: 'Quá bộ nhớ' },
  RE: { en: 'Runtime error', vi: 'Lỗi khi chạy' },
  CE: { en: 'Compile error', vi: 'Lỗi biên dịch' },
};

const PRE = 'mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface-sunken px-3 py-2 font-mono text-sm text-ink';

/** The verdict of every test: in words and an icon (never colour alone). Only example tests show output. */
export function CodeResults({ result, t }: { result: CodeResult; t: (text: Bilingual) => string }) {
  const passed = result.tests.filter((test) => test.verdict === 'AC').length;
  return (
    <section aria-label={t({ en: 'Results', vi: 'Kết quả' })} className="mt-4 flex flex-col gap-3">
      <p className="text-base font-semibold tabular-nums text-ink">
        {t({ en: `${passed}/${result.tests.length} tests passed`, vi: `${passed}/${result.tests.length} test đạt` })}
      </p>
      {result.compile_message && (
        <div>
          <p className="text-sm font-semibold text-danger">{t(VERDICT_TEXT.CE)}</p>
          <pre className={PRE}>{result.compile_message}</pre>
        </div>
      )}
      <ol className="flex flex-col gap-2">
        {result.tests.map((test, i) => {
          const ok = test.verdict === 'AC';
          const shown = test.stdout !== undefined;
          return (
            <li key={i} className="rounded-lg border border-line px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className={`inline-flex items-center gap-1.5 font-semibold ${ok ? 'text-success' : 'text-danger'}`}>
                  {ok ? <CircleCheck aria-hidden="true" className="h-5 w-5" /> : <CircleX aria-hidden="true" className="h-5 w-5" />}
                  {t(VERDICT_TEXT[test.verdict])}
                </span>
                <span className="text-ink">
                  Test {i + 1}
                  {shown ? '' : t({ en: ' (hidden)', vi: ' (ẩn)' })}
                </span>
                <span className="tabular-nums text-ink-muted">
                  {test.time_ms} ms · {Math.round(test.memory_kb / 1024)} MB
                </span>
              </div>
              {shown && !ok && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-ink-muted">{t({ en: 'Your output', vi: 'Output của em' })}</p>
                    <pre className={PRE}>{test.stdout || ' '}</pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-muted">{t({ en: 'Expected output', vi: 'Kết quả đúng' })}</p>
                    <pre className={PRE}>{test.expected || ' '}</pre>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
