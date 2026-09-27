'use client';

import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { GRAPH_PARAMETER_NAME, parseGraphExpression, undeclaredNames, type SimulationConfigByKind } from '@scipal/types';
import { sampleGraph } from './engines/functionGraph';
import { BUTTON, Field, FIELD, NumberField, PANEL, Slider } from './controls';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

type GraphConfig = SimulationConfigByKind['function-graph'];
const W = 320;
const H = 220;

function initialValues(config: GraphConfig): Record<string, number> {
  return Object.fromEntries(config.parameters.map((p) => [p.name, p.value]));
}

/** Round axis ticks: about six per axis. */
function ticks(min: number, max: number): number[] {
  const raw = (max - min) / 6;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9 && out.length < 20; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

function GraphView({ config, lang }: SimulationViewProps<'function-graph'>) {
  const t = pick(lang);
  const [values, setValues] = useState(() => initialValues(config));
  const current = { ...initialValues(config), ...values };
  const segments = useMemo(() => sampleGraph(config, current), [config, JSON.stringify(current)]); // eslint-disable-line react-hooks/exhaustive-deps
  const sx = (x: number) => ((x - config.xMin) / (config.xMax - config.xMin)) * W;
  const sy = (y: number) => H - ((y - config.yMin) / (config.yMax - config.yMin)) * H;
  const clampY = (y: number) => Math.min(Math.max(sy(y), -H), 2 * H);

  return (
    <div className={PANEL}>
      <p className="font-mono text-sm text-ink">y = {config.expression}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t({ en: `Graph of y = ${config.expression}`, vi: `Đồ thị y = ${config.expression}` })}
        className="h-auto w-full overflow-hidden rounded-md border border-line bg-surface-sunken"
      >
        {ticks(config.xMin, config.xMax).map((x) => (
          <line key={`x${x}`} x1={sx(x)} x2={sx(x)} y1={0} y2={H} stroke="var(--line)" strokeWidth={0.5} />
        ))}
        {ticks(config.yMin, config.yMax).map((y) => (
          <line key={`y${y}`} x1={0} x2={W} y1={sy(y)} y2={sy(y)} stroke="var(--line)" strokeWidth={0.5} />
        ))}
        {config.yMin < 0 && config.yMax > 0 && <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} stroke="var(--ink-muted)" strokeWidth={1} />}
        {config.xMin < 0 && config.xMax > 0 && <line x1={sx(0)} x2={sx(0)} y1={0} y2={H} stroke="var(--ink-muted)" strokeWidth={1} />}
        {segments.map((segment, i) => (
          <polyline
            key={i}
            fill="none"
            stroke="var(--accent, var(--action))"
            strokeWidth={2}
            strokeLinejoin="round"
            points={segment.map(([x, y]) => `${sx(x).toFixed(1)},${clampY(y).toFixed(1)}`).join(' ')}
          />
        ))}
      </svg>
      <p className="text-xs text-ink-muted">
        x: {config.xMin} → {config.xMax} · y: {config.yMin} → {config.yMax}
      </p>
      {config.parameters.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {config.parameters.map((p) => (
            <Slider
              key={p.name}
              label={`${p.name}`}
              value={current[p.name] ?? p.value}
              min={p.min}
              max={p.max}
              step={p.step}
              onChange={(v) => setValues((old) => ({ ...old, [p.name]: v }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GraphEditor({ config, onChange, lang }: SimulationEditorProps<'function-graph'>) {
  const t = pick(lang);
  const [expression, setExpression] = useState(config.expression);
  const names = config.parameters.map((p) => p.name);
  const parsed = parseGraphExpression(expression, names);
  // Letters the typed expression uses: declared ones cannot be removed, missing ones can be added.
  const mentioned = undeclaredNames(expression, []);
  const missing = undeclaredNames(expression, names).filter((n) => GRAPH_PARAMETER_NAME.test(n));
  const spare = 'abcdfghkmnpqrstuvwz'.split('').find((n) => !names.includes(n) && !missing.includes(n));
  const addable = (missing.length > 0 ? missing : spare ? [spare] : []).slice(0, Math.max(0, 4 - config.parameters.length));

  /** New parameters, carrying the typed expression along once it parses with them. */
  const withParameters = (parameters: GraphConfig['parameters']) => {
    const next = { ...config, parameters };
    return parseGraphExpression(expression, parameters.map((p) => p.name)).ok ? { ...next, expression } : next;
  };
  const setParameter = (i: number, patch: Partial<GraphConfig['parameters'][number]>) =>
    onChange(
      withParameters(
        config.parameters.map((p, j) => {
          if (j !== i) return p;
          const merged = { ...p, ...patch };
          // Keep the starting value inside a changed range.
          const low = Math.min(merged.min, merged.max);
          const high = Math.max(merged.min, merged.max);
          return { ...merged, value: Math.min(Math.max(merged.value, low), high) };
        }),
      ),
    );

  return (
    <div className="flex flex-col gap-4">
      <Field
        label={t({ en: 'Function y =', vi: 'Hàm số y =' })}
        hint={t({ en: 'Use x, parameters, + − * / ^, sin cos tan sqrt abs log ln exp, pi, e.', vi: 'Dùng x, tham số, + − * / ^, sin cos tan sqrt abs log ln exp, pi, e.' })}
        error={parsed.ok ? undefined : `${t(parsed.error.message)} (${t({ en: 'at character', vi: 'ở ký tự' })} ${parsed.error.at + 1})`}
      >
        {(id) => (
          <input
            id={id}
            value={expression}
            spellCheck={false}
            maxLength={200}
            aria-invalid={!parsed.ok || undefined}
            onChange={(e) => {
              setExpression(e.target.value);
              if (parseGraphExpression(e.target.value, names).ok) onChange({ ...config, expression: e.target.value });
            }}
            className={`${FIELD} font-mono`}
          />
        )}
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-ink">{t({ en: 'Parameters (learners move a slider)', vi: 'Tham số (học sinh kéo thanh trượt)' })}</legend>
        {config.parameters.map((p, i) => (
          <div key={p.name} className="grid grid-cols-2 items-end gap-2 rounded-lg border border-line p-3 sm:grid-cols-5">
            <p className="col-span-2 font-mono text-lg font-bold text-ink sm:col-span-1">{p.name}</p>
            <NumberField label={t({ en: 'From', vi: 'Từ' })} value={p.min} min={-1000} max={1000} step={p.step} onChange={(min) => setParameter(i, { min })} />
            <NumberField label={t({ en: 'To', vi: 'Đến' })} value={p.max} min={-1000} max={1000} step={p.step} onChange={(max) => setParameter(i, { max })} />
            <NumberField label={t({ en: 'Step', vi: 'Bước' })} value={p.step} min={0.001} max={1000} step={0.001} onChange={(step) => setParameter(i, { step })} />
            <NumberField label={t({ en: 'Start at', vi: 'Ban đầu' })} value={p.value} min={p.min} max={p.max} step={p.step} onChange={(value) => setParameter(i, { value })} />
            <button
              type="button"
              className={`${BUTTON} col-span-2 sm:col-span-5 sm:justify-self-end`}
              disabled={mentioned.includes(p.name)}
              title={mentioned.includes(p.name) ? t({ en: 'The function still uses it', vi: 'Hàm số vẫn đang dùng tham số này' }) : undefined}
              onClick={() => onChange(withParameters(config.parameters.filter((_, j) => j !== i)))}
            >
              <X aria-hidden="true" className="h-4 w-4" />
              {t({ en: `Remove ${p.name}`, vi: `Bỏ tham số ${p.name}` })}
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {addable.map((name) => (
            <button
              key={name}
              type="button"
              className={BUTTON}
              onClick={() => onChange(withParameters([...config.parameters, { name, min: -5, max: 5, step: 0.5, value: 1 }]))}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {t({ en: `Add parameter ${name}`, vi: `Thêm tham số ${name}` })}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField label="x min" value={config.xMin} min={-1000} max={config.xMax - 0.001} step={0.5} onChange={(xMin) => onChange({ ...config, xMin })} />
        <NumberField label="x max" value={config.xMax} min={config.xMin + 0.001} max={1000} step={0.5} onChange={(xMax) => onChange({ ...config, xMax })} />
        <NumberField label="y min" value={config.yMin} min={-1000} max={config.yMax - 0.001} step={0.5} onChange={(yMin) => onChange({ ...config, yMin })} />
        <NumberField label="y max" value={config.yMax} min={config.yMin + 0.001} max={1000} step={0.5} onChange={(yMax) => onChange({ ...config, yMax })} />
      </div>
    </div>
  );
}

export const functionGraphModule: SimulationModule<'function-graph'> = {
  kind: 'function-graph',
  label: { en: 'Function graph', vi: 'Đồ thị hàm số' },
  subject: { en: 'Mathematics', vi: 'Toán' },
  Editor: GraphEditor,
  Renderer: GraphView,
};
