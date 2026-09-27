'use client';

import { useId, useState, type ReactNode } from 'react';

// Small form controls shared by the simulation editors and views (theme tokens only).

export const FIELD =
  'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-[invalid=true]:border-danger';
export const BUTTON =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-sunken disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
export const PRIMARY_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-action px-4 text-sm font-semibold text-action-ink transition-colors hover:bg-action-hover disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
export const PANEL = 'flex flex-col gap-4 rounded-lg border border-line bg-surface p-4';

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * A number input that keeps its own text while typing and reports only values inside [min, max],
 * so an extreme or half-typed value never reaches the simulation.
 */
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(String(value));
  }
  const parsed = Number(text.replace(',', '.'));
  const invalid = text.trim() === '' || !Number.isFinite(parsed) || parsed < min || parsed > max;
  return (
    <Field label={unit ? `${label} (${unit})` : label} error={invalid ? `${min} – ${max}` : undefined}>
      {(id) => (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={text}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setText(e.target.value);
            const next = Number(e.target.value.replace(',', '.'));
            if (e.target.value.trim() !== '' && Number.isFinite(next) && next >= min && next <= max) onChange(next);
          }}
          className={FIELD}
        />
      )}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={FIELD}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** A labelled slider showing its value, for learners. */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-semibold text-ink">
        <span>{label}</span>
        <output htmlFor={id} className="tabular-nums text-ink-muted">
          {value.toFixed(decimals)}
          {unit ? ` ${unit}` : ''}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-[var(--accent,var(--action))]"
      />
    </div>
  );
}
