'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Flag, Pause, Play, RotateCcw, SearchX, SkipBack, SkipForward } from 'lucide-react';
import { ALGORITHMS } from '@scipal/types';
import { AlgorithmRace } from './algorithmRace';
import { ALGORITHM_NAMES, AlgorithmStage } from './algorithmStage';
import { useReducedMotion } from './animation';
import { algorithmSteps } from './engines/algorithm';
import { BUTTON, Field, FIELD, NumberField, PANEL, SelectField } from './controls';
import { pick, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import styles from './algorithm.module.css';

type Bilingual = { en: string; vi: string };

const isSearch = (a: string) => a.endsWith('search');

/** Milliseconds per step at each playing speed. */
export const SPEEDS = { slow: 1100, medium: 650, fast: 220 } as const;
type Speed = keyof typeof SPEEDS;
const SPEED_NAMES: Record<Speed, Bilingual> = {
  slow: { en: 'Slow', vi: 'Chậm' },
  medium: { en: 'Medium', vi: 'Vừa' },
  fast: { en: 'Fast', vi: 'Nhanh' },
};

/** A count that bumps each time it changes. */
function Tally({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line px-3 text-sm text-ink-muted">
      {label}
      <span key={value} className={`inline-block font-semibold tabular-nums text-ink ${styles.bump}`}>
        {value}
      </span>
    </span>
  );
}

function SpeedPicker({ speed, onChange, lang }: { speed: Speed; onChange: (speed: Speed) => void; lang: Lang }) {
  const t = pick(lang);
  return (
    <div role="group" aria-label={t({ en: 'Speed', vi: 'Tốc độ' })} className="ml-auto inline-flex rounded-lg border border-line p-0.5">
      {(Object.keys(SPEEDS) as Speed[]).map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={speed === s}
          onClick={() => onChange(s)}
          className={`min-h-11 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            speed === s ? 'bg-[color-mix(in_oklch,var(--accent,var(--action))_16%,transparent)] text-ink' : 'text-ink-muted hover:bg-surface-sunken'
          }`}
        >
          {t(SPEED_NAMES[s])}
        </button>
      ))}
    </div>
  );
}

function AlgorithmView({ config, lang }: SimulationViewProps<'algorithm-sim'>) {
  const t = pick(lang);
  const reduced = useReducedMotion();
  const steps = useMemo(() => algorithmSteps(config), [config]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>('medium');
  const [race, setRace] = useState(false);
  const at = Math.min(index, steps.length - 1);
  const step = steps[at]!;
  const finished = at === steps.length - 1;
  const search = isSearch(config.algorithm);
  const racing = race && !search;

  useEffect(() => {
    if (!playing) return;
    if (at >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), SPEEDS[speed]);
    return () => clearTimeout(timer);
  }, [playing, at, steps.length, speed]);

  const missing = search && step.found == null;
  const summary: Bilingual | null = !finished
    ? null
    : !search
      ? { vi: `Xong: ${step.compares} phép so sánh, ${step.swaps} lần đổi chỗ với ${step.values.length} số.`, en: `Done: ${step.compares} comparisons and ${step.swaps} swaps on ${step.values.length} numbers.` }
      : missing
        ? { vi: `Không có ${config.target}; đã so sánh ${step.compares} lần.`, en: `${config.target} is not there; ${step.compares} comparisons made.` }
        : { vi: `Tìm thấy ${config.target} sau ${step.compares} lần so sánh.`, en: `Found ${config.target} after ${step.compares} comparisons.` };
  const speedPicker = <SpeedPicker speed={speed} onChange={setSpeed} lang={lang} />;

  return (
    <div className={PANEL}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-ink">
          {racing ? t({ en: 'Three sorts, one list', vi: 'Ba cách sắp xếp, cùng một dãy' }) : t(ALGORITHM_NAMES[config.algorithm])}
          {search && <span className="font-normal text-ink-muted"> · {t({ en: 'target', vi: 'cần tìm' })}: {config.target}</span>}
        </p>
        {!search && (
          <button
            type="button"
            aria-pressed={racing}
            onClick={() => {
              setPlaying(false);
              setRace(!race);
            }}
            className={`${BUTTON} ml-auto ${racing ? 'border-[var(--accent,var(--action))] bg-[color-mix(in_oklch,var(--accent,var(--action))_12%,transparent)]' : ''}`}
          >
            <Flag aria-hidden="true" className="h-4 w-4" />
            {t({ en: 'Race the three sorts', vi: 'Đua 3 cách sắp xếp' })}
          </button>
        )}
      </div>
      {racing ? (
        <AlgorithmRace key={config.values.join(',')} values={config.values} target={config.target} stepMs={SPEEDS[speed]} reduced={reduced} lang={lang}>
          {speedPicker}
        </AlgorithmRace>
      ) : (
        <>
          <AlgorithmStage algorithm={config.algorithm} step={step} target={config.target} stepMs={SPEEDS[speed]} reduced={reduced} lang={lang} finished={finished} />
          <p aria-live="polite" className="min-h-10 text-sm text-ink">
            {t(step.note)}
          </p>
          {summary && (
            <p className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-ink ${styles.rise} ${missing ? 'border-warning bg-warning-surface' : 'border-success bg-success-surface'}`}>
              {missing ? <SearchX aria-hidden="true" className="h-4 w-4 shrink-0" /> : <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
              {t(summary)}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={BUTTON} aria-label={t({ en: 'Previous step', vi: 'Bước trước' })} disabled={at === 0} onClick={() => setIndex(at - 1)}>
              <SkipBack aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={BUTTON}
              aria-label={playing ? t({ en: 'Pause', vi: 'Tạm dừng' }) : t({ en: 'Play', vi: 'Chạy' })}
              disabled={at >= steps.length - 1}
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
            </button>
            <button type="button" className={BUTTON} aria-label={t({ en: 'Next step', vi: 'Bước tiếp' })} disabled={at >= steps.length - 1} onClick={() => setIndex(at + 1)}>
              <SkipForward aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={BUTTON}
              aria-label={t({ en: 'Start again', vi: 'Làm lại' })}
              onClick={() => {
                setPlaying(false);
                setIndex(0);
              }}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
            </button>
            {speedPicker}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tally label={t({ en: 'Comparisons', vi: 'So sánh' })} value={step.compares} />
            {!search && <Tally label={t({ en: 'Swaps', vi: 'Đổi chỗ' })} value={step.swaps} />}
            <span className="text-sm tabular-nums text-ink-muted">
              {t({ en: 'Step', vi: 'Bước' })} {at + 1}/{steps.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/** "5, 2, 9" → [5, 2, 9]; null when a value is not a whole number in range or the count is wrong. */
export function parseValues(text: string): number[] | null {
  const parts = text.split(/[,;\s]+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 32) return null;
  const values = parts.map(Number);
  return values.every((v) => Number.isInteger(v) && v >= -999 && v <= 999) ? values : null;
}

function AlgorithmEditor({ config, onChange, lang }: SimulationEditorProps<'algorithm-sim'>) {
  const t = pick(lang);
  const [text, setText] = useState(config.values.join(', '));
  const valid = parseValues(text);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField
        label={t({ en: 'Algorithm', vi: 'Thuật toán' })}
        value={config.algorithm}
        options={ALGORITHMS.map((a) => ({ value: a, label: t(ALGORITHM_NAMES[a]) }))}
        onChange={(algorithm) => onChange({ ...config, algorithm })}
      />
      {isSearch(config.algorithm) && (
        <NumberField label={t({ en: 'Value to find', vi: 'Giá trị cần tìm' })} value={config.target} min={-999} max={999} onChange={(target) => onChange({ ...config, target })} />
      )}
      <div className="sm:col-span-2">
        <Field
          label={t({ en: 'Values', vi: 'Dãy số' })}
          hint={t({ en: '2–32 whole numbers from −999 to 999, separated by commas.', vi: '2–32 số nguyên từ −999 đến 999, cách nhau bằng dấu phẩy.' })}
          error={valid ? undefined : t({ en: '2–32 whole numbers from −999 to 999.', vi: 'Cần 2–32 số nguyên từ −999 đến 999.' })}
        >
          {(id) => (
            <input
              id={id}
              value={text}
              aria-invalid={!valid || undefined}
              onChange={(e) => {
                setText(e.target.value);
                const values = parseValues(e.target.value);
                if (values) onChange({ ...config, values });
              }}
              className={FIELD}
            />
          )}
        </Field>
      </div>
    </div>
  );
}

export const algorithmModule: SimulationModule<'algorithm-sim'> = {
  kind: 'algorithm-sim',
  label: { en: 'Algorithm steps', vi: 'Thuật toán từng bước' },
  subject: { en: 'Informatics', vi: 'Tin học' },
  Editor: AlgorithmEditor,
  Renderer: AlgorithmView,
};
