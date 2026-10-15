'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { ALGORITHM_NAMES, AlgorithmStage } from './algorithmStage';
import { BUTTON } from './controls';
import { algorithmSteps } from './engines/algorithm';
import { pick, type Lang } from './types';
import styles from './algorithm.module.css';

export const RACE_ALGORITHMS = ['bubble-sort', 'selection-sort', 'insertion-sort'] as const;

/** Place of each lane by the steps it needs: fewer is better, and equal lanes share a place. */
export function raceRanks(lengths: readonly number[]): number[] {
  return lengths.map((len) => 1 + lengths.filter((other) => other < len).length);
}

/** The three sorts on the same list, one step each per beat, so the quicker one visibly finishes first. */
export function AlgorithmRace({ values, target, stepMs, reduced, lang, children }: { values: number[]; target: number; stepMs: number; reduced: boolean; lang: Lang; children?: ReactNode }) {
  const t = pick(lang);
  const lanes = useMemo(() => RACE_ALGORITHMS.map((algorithm) => ({ algorithm, steps: algorithmSteps({ algorithm, values, target }) })), [values, target]);
  const ranks = raceRanks(lanes.map((lane) => lane.steps.length));
  const last = Math.max(...lanes.map((lane) => lane.steps.length)) - 1;
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (tick >= last) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setTick((k) => k + 1), stepMs);
    return () => clearTimeout(timer);
  }, [playing, tick, last, stepMs]);

  const play = () => {
    if (!playing && tick >= last) setTick(0);
    setPlaying(!playing);
  };

  return (
    <div className="flex flex-col gap-3">
      {lanes.map(({ algorithm, steps }, lane) => {
        const at = Math.min(tick, steps.length - 1);
        const step = steps[at]!;
        const finished = at === steps.length - 1;
        return (
          <section key={algorithm} role="group" aria-label={t(ALGORITHM_NAMES[algorithm])} className="flex flex-col gap-1 rounded-lg border border-line p-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-ink">{t(ALGORITHM_NAMES[algorithm])}</span>
              <span className="tabular-nums text-ink-muted">
                {t({ en: `${step.compares} comparisons · ${step.swaps} swaps`, vi: `${step.compares} so sánh · ${step.swaps} đổi chỗ` })}
              </span>
              {finished && (
                <span className={`ml-auto rounded-full border px-2.5 py-0.5 font-semibold tabular-nums text-ink ${styles.rise} ${ranks[lane] === 1 ? 'border-success bg-success-surface' : 'border-line'}`}>
                  {t({ en: `Place ${ranks[lane]} · ${steps.length} steps`, vi: `Hạng ${ranks[lane]} · ${steps.length} bước` })}
                </span>
              )}
            </div>
            <AlgorithmStage compact algorithm={algorithm} step={step} target={target} stepMs={stepMs} reduced={reduced} lang={lang} finished={finished} />
          </section>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BUTTON} aria-label={playing ? t({ en: 'Pause', vi: 'Tạm dừng' }) : t({ en: 'Play', vi: 'Chạy' })} onClick={play}>
          {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
        </button>
        <button
          type="button"
          className={BUTTON}
          aria-label={t({ en: 'Start again', vi: 'Làm lại' })}
          onClick={() => {
            setPlaying(false);
            setTick(0);
          }}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
