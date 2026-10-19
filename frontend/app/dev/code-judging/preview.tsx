'use client';

import { useEffect, useState } from 'react';
import type { CodeResult, CodeVerdict } from '@scipal/types';
import { SubjectProvider } from '@scipal/ui';
import { useLanguage } from '@scipal/hooks';
import { CodeJudging, type JudgingProgress } from '@/features/lessons/CodeJudging';
import { CodeResults } from '@/features/lessons/CodeResults';

const passed: CodeResult = {
  status: 'AC',
  tests: [
    { verdict: 'AC', time_ms: 3, memory_kb: 1024, stdout: '3\n', expected: '3\n' },
    { verdict: 'AC', time_ms: 4, memory_kb: 1228, stdout: '7\n', expected: '7\n' },
    { verdict: 'AC', time_ms: 3, memory_kb: 1024 },
    { verdict: 'AC', time_ms: 3, memory_kb: 1024 },
    { verdict: 'AC', time_ms: 3, memory_kb: 1024 },
  ],
};
const wrong: CodeResult = {
  status: 'WA',
  tests: [
    { verdict: 'AC', time_ms: 3, memory_kb: 1024, stdout: '3\n', expected: '3\n' },
    { verdict: 'WA', time_ms: 4, memory_kb: 1228, stdout: '8\n', expected: '7\n' },
    { verdict: 'AC', time_ms: 3, memory_kb: 1024 },
    { verdict: 'TLE', time_ms: 2000, memory_kb: 1024 },
    { verdict: 'AC', time_ms: 3, memory_kb: 1024 },
  ],
};

/** Replays a judge that answers in 0.8 s, then finishes the 8 tests out of order, one every 0.6 s. */
function useFakeProgress(run: number, on: boolean): JudgingProgress | null {
  const [progress, setProgress] = useState<JudgingProgress | null>(null);
  useEffect(() => {
    setProgress(null);
    if (!on) return;
    const order = [2, 0, 1, 5, 3, 4, 7, 6];
    const verdicts: CodeVerdict[] = ['AC', 'AC', 'AC', 'WA', 'AC', 'TLE', 'AC', 'AC'];
    const timers = [window.setTimeout(() => setProgress({ total: 8, tests: Array.from({ length: 8 }, () => undefined) }), 800)];
    order.forEach((index, k) =>
      timers.push(window.setTimeout(() => setProgress((p) => p && { ...p, tests: p.tests.map((x, i) => (i === index ? { verdict: verdicts[i]!, time_ms: 3 + i } : x)) }), 1400 + k * 600)),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [run, on]);
  return progress;
}

/** Dev-only: the judging panel and both verdicts, replayable, to check the motion. */
export function CodeJudgingPreview() {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'judging' | 'ac' | 'wa'>('judging');
  const [run, setRun] = useState(0);
  const progress = useFakeProgress(run, phase === 'judging');
  const button = 'min-h-11 rounded-lg border border-edge bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface-sunken';
  return (
    <SubjectProvider slug="informatics">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {(['judging', 'ac', 'wa'] as const).map((p) => (
            <button key={p} type="button" className={button} aria-pressed={phase === p} onClick={() => { setPhase(p); setRun((r) => r + 1); }}>
              {p === 'judging' ? 'Đang chấm' : p === 'ac' ? 'Kết quả AC' : 'Kết quả sai'}
            </button>
          ))}
        </div>
        {phase === 'judging' ? <CodeJudging key={run} t={t} progress={progress} /> : <CodeResults key={run} result={phase === 'ac' ? passed : wrong} xpEarned={phase === 'ac' ? 20 : 0} t={t} />}
      </div>
    </SubjectProvider>
  );
}
