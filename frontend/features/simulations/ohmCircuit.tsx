'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { BUTTON, NumberField, PANEL, SelectField, Slider } from './controls';
import { circuitValues } from './engines/physics';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';

const fmt = (n: number, digits = 2) => (Number.isFinite(n) ? n.toFixed(digits) : '—');

function CircuitView({ config: initial, lang }: SimulationViewProps<'ohm-circuit'>) {
  const t = pick(lang);
  const [config, setConfig] = useState(initial);
  const result = circuitValues(config);
  const series = config.layout === 'series';

  return (
    <div className={PANEL}>
      <p className="text-sm font-semibold text-ink">
        {series ? t({ en: 'Resistors in series', vi: 'Điện trở mắc nối tiếp' }) : t({ en: 'Resistors in parallel', vi: 'Điện trở mắc song song' })}
      </p>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface-sunken p-3 text-sm" aria-hidden="true">
        <span className="rounded border border-ink px-2 py-1 font-semibold text-ink">{fmt(config.voltage, 1)} V</span>
        <span className="text-ink-muted">{series ? '→' : '⇉'}</span>
        <span className={`flex gap-2 ${series ? 'flex-row flex-wrap' : 'flex-col'}`}>
          {config.resistors.map((r, i) => (
            <span key={i} className="rounded border border-accent px-2 py-1 text-ink">
              R{i + 1} = {fmt(r, 1)} Ω
            </span>
          ))}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label={t({ en: 'Voltage U', vi: 'Hiệu điện thế U' })} value={config.voltage} min={0} max={240} step={0.5} unit="V" onChange={(voltage) => setConfig({ ...config, voltage })} />
        {config.resistors.map((r, i) => (
          <Slider
            key={i}
            label={`R${i + 1}`}
            value={r}
            min={0.5}
            max={Math.max(100, Math.ceil(r))}
            step={0.5}
            unit="Ω"
            onChange={(v) => setConfig({ ...config, resistors: config.resistors.map((x, j) => (j === i ? v : x)) })}
          />
        ))}
      </div>
      <div className="overflow-x-auto">
        <table aria-live="polite" className="w-full min-w-[16rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-ink-muted">
              <th className="py-1 pr-2 font-semibold" />
              <th className="py-1 pr-2 font-semibold">R</th>
              <th className="py-1 pr-2 font-semibold">U</th>
              <th className="py-1 font-semibold">I</th>
            </tr>
          </thead>
          <tbody>
            {result.branches.map((b, i) => (
              <tr key={i} className="border-t border-line text-ink">
                <td className="py-1.5 pr-2 font-semibold">R{i + 1}</td>
                <td className="py-1.5 pr-2 tabular-nums">{fmt(b.resistance, 1)} Ω</td>
                <td className="py-1.5 pr-2 tabular-nums">{fmt(b.voltage)} V</td>
                <td className="py-1.5 tabular-nums">{fmt(b.current)} A</td>
              </tr>
            ))}
            <tr className="border-t-2 border-line font-semibold text-ink">
              <td className="py-1.5 pr-2">{t({ en: 'Total', vi: 'Toàn mạch' })}</td>
              <td className="py-1.5 pr-2 tabular-nums">{fmt(result.totalResistance)} Ω</td>
              <td className="py-1.5 pr-2 tabular-nums">{fmt(config.voltage)} V</td>
              <td className="py-1.5 tabular-nums">{fmt(result.totalCurrent)} A</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="font-mono text-xs text-ink-muted">
        I = U / R · {series ? 'R = R1 + R2 + …' : '1/R = 1/R1 + 1/R2 + …'}
      </p>
    </div>
  );
}

function CircuitEditor({ config, onChange, lang }: SimulationEditorProps<'ohm-circuit'>) {
  const t = pick(lang);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={t({ en: 'Connection', vi: 'Cách mắc' })}
          value={config.layout}
          options={[
            { value: 'series', label: t({ en: 'Series', vi: 'Nối tiếp' }) },
            { value: 'parallel', label: t({ en: 'Parallel', vi: 'Song song' }) },
          ]}
          onChange={(layout) => onChange({ ...config, layout })}
        />
        <NumberField label={t({ en: 'Voltage U', vi: 'Hiệu điện thế U' })} unit="V" value={config.voltage} min={0} max={240} step={0.5} onChange={(voltage) => onChange({ ...config, voltage })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {config.resistors.map((r, i) => (
          <div key={i} className="flex items-end gap-1">
            <div className="flex-1">
              <NumberField label={`R${i + 1}`} unit="Ω" value={r} min={0.1} max={10000} step={0.1} onChange={(v) => onChange({ ...config, resistors: config.resistors.map((x, j) => (j === i ? v : x)) })} />
            </div>
            {config.resistors.length > 1 && (
              <button type="button" className={BUTTON} aria-label={t({ en: `Remove R${i + 1}`, vi: `Bỏ R${i + 1}` })} onClick={() => onChange({ ...config, resistors: config.resistors.filter((_, j) => j !== i) })}>
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {config.resistors.length < 6 && (
        <button type="button" className={`${BUTTON} self-start`} onClick={() => onChange({ ...config, resistors: [...config.resistors, 10] })}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Add a resistor', vi: 'Thêm điện trở' })}
        </button>
      )}
    </div>
  );
}

export const ohmCircuitModule: SimulationModule<'ohm-circuit'> = {
  kind: 'ohm-circuit',
  label: { en: "Ohm's law circuit", vi: 'Mạch điện định luật Ohm' },
  subject: { en: 'Physics', vi: 'Vật lý' },
  Editor: CircuitEditor,
  Renderer: CircuitView,
};
