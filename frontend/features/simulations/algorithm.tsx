'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { ALGORITHMS } from '@scipal/types';
import { algorithmSteps } from './engines/algorithm';
import { BUTTON, Field, FIELD, NumberField, PANEL, SelectField } from './controls';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

const NAMES: Record<(typeof ALGORITHMS)[number], { en: string; vi: string }> = {
  'bubble-sort': { en: 'Bubble sort', vi: 'Sắp xếp nổi bọt' },
  'selection-sort': { en: 'Selection sort', vi: 'Sắp xếp chọn' },
  'insertion-sort': { en: 'Insertion sort', vi: 'Sắp xếp chèn' },
  'linear-search': { en: 'Linear search', vi: 'Tìm kiếm tuần tự' },
  'binary-search': { en: 'Binary search', vi: 'Tìm kiếm nhị phân' },
};
const isSearch = (a: string) => a.endsWith('search');
const STEP_MS = 700;

function AlgorithmView({ config, lang }: SimulationViewProps<'algorithm-sim'>) {
  const t = pick(lang);
  const steps = useMemo(() => algorithmSteps(config), [config]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const at = Math.min(index, steps.length - 1);
  const step = steps[at]!;
  const max = Math.max(...step.values.map(Math.abs), 1);

  useEffect(() => {
    if (!playing) return;
    if (at >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, at, steps.length]);

  const highlight = (i: number) => {
    if (step.found === i) return 'bg-success';
    if (step.swap?.includes(i)) return 'bg-warning';
    if (step.compare?.includes(i)) return 'bg-action';
    if (step.done.includes(i)) return 'bg-success-surface border border-success';
    if (step.range && (i < step.range[0] || i > step.range[1])) return 'bg-line';
    return 'bg-accent';
  };

  return (
    <div className={PANEL}>
      <p className="text-sm font-semibold text-ink">
        {t(NAMES[config.algorithm])}
        {isSearch(config.algorithm) && <span className="font-normal text-ink-muted"> · {t({ en: 'target', vi: 'cần tìm' })}: {config.target}</span>}
      </p>
      <ol className="flex h-40 items-end gap-1" aria-label={t({ en: 'Values', vi: 'Dãy giá trị' })}>
        {step.values.map((value, i) => (
          <li key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span
              aria-hidden="true"
              className={`w-full rounded-t transition-all ${highlight(i)}`}
              style={{ height: `${Math.max(6, (Math.abs(value) / max) * 120)}px` }}
            />
            <span className="text-xs tabular-nums text-ink">{value}</span>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="min-h-10 text-sm text-ink">
        {t(step.note)}
      </p>
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
        <span className="ml-auto text-sm tabular-nums text-ink-muted">
          {t({ en: 'Step', vi: 'Bước' })} {at + 1}/{steps.length}
        </span>
      </div>
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
        options={ALGORITHMS.map((a) => ({ value: a, label: t(NAMES[a]) }))}
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
