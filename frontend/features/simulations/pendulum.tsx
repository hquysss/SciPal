'use client';

import { useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { BUTTON, NumberField, PANEL, SelectField, Slider } from './controls';
import { pendulumAt, pendulumPeriod } from './engines/physics';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import { useClock } from './useClock';

const W = 320;
const H = 200;

function PendulumView({ config: initial, lang }: SimulationViewProps<'pendulum'>) {
  const t = pick(lang);
  // Learners change the main quantity; the teacher's values are the starting point.
  const [config, setConfig] = useState(initial);
  const period = pendulumPeriod(config);
  const clock = useClock(period * 4, true, true);
  const position = pendulumAt(config, clock.time);

  // The trace is drawn as the oscillator moves: it grows from the left, then scrolls once two
  // periods are on screen, so the curve always ends at the moving dot.
  const span = period * 2;
  const windowStart = Math.max(0, clock.time - span);
  const headX = ((clock.time - windowStart) / span) * W;
  const plot = useMemo(() => {
    const steps = Math.max(1, Math.ceil(((clock.time - windowStart) / span) * 120));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const time = windowStart + ((clock.time - windowStart) * i) / steps;
      const x = ((time - windowStart) / span) * W;
      const y = 40 - (pendulumAt(config, time) / config.amplitude) * 30;
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [config, clock.time, windowStart, span]);
  const headY = 40 - (position / config.amplitude) * 30;

  const isPendulum = config.mode === 'pendulum';
  const angle = (position * Math.PI) / 180;
  const rodPx = 110;
  const bob = isPendulum ? { x: W / 2 + rodPx * Math.sin(angle), y: 20 + rodPx * Math.cos(angle) } : { x: W / 2 + (position / config.amplitude) * 60, y: 70 };

  return (
    <div className={PANEL}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={isPendulum ? t({ en: 'Swinging pendulum', vi: 'Con lắc đang dao động' }) : t({ en: 'Oscillating spring', vi: 'Lò xo đang dao động' })} className="h-auto w-full rounded-md border border-line bg-surface-sunken">
        {isPendulum ? (
          <>
            <line x1={W / 2 - 30} x2={W / 2 + 30} y1={20} y2={20} stroke="var(--ink-muted)" strokeWidth={2} />
            <line x1={W / 2} y1={20} x2={bob.x} y2={bob.y} stroke="var(--ink)" strokeWidth={1.5} />
          </>
        ) : (
          <>
            <line x1={20} x2={20} y1={50} y2={90} stroke="var(--ink-muted)" strokeWidth={2} />
            <polyline
              fill="none"
              stroke="var(--ink)"
              strokeWidth={1.5}
              points={Array.from({ length: 13 }, (_, i) => `${20 + ((bob.x - 34) * i) / 12},${i === 0 || i === 12 ? 70 : i % 2 ? 62 : 78}`).join(' ')}
            />
          </>
        )}
        <circle cx={bob.x} cy={bob.y} r={isPendulum ? 10 : 14} fill="var(--accent, var(--action))" />
        <g transform={`translate(0 ${H - 80})`}>
          <line x1={0} x2={W} y1={40} y2={40} stroke="var(--line)" />
          <path d={plot} fill="none" stroke="var(--accent, var(--action))" strokeWidth={1.5} />
          <line x1={headX} x2={headX} y1={5} y2={75} stroke="var(--ink-muted)" strokeDasharray="3 3" />
          <circle cx={headX} cy={headY} r={4} fill="var(--accent, var(--action))" />
        </g>
      </svg>
      <div className="flex items-end gap-3">
        <button type="button" className={BUTTON} aria-label={clock.playing ? t({ en: 'Pause', vi: 'Tạm dừng' }) : t({ en: 'Play', vi: 'Chạy' })} onClick={clock.playing ? clock.pause : clock.play}>
          {clock.playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
        </button>
        <div className="flex-1">
          {isPendulum ? (
            <Slider label={t({ en: 'Length L', vi: 'Chiều dài L' })} value={config.length} min={0.1} max={10} step={0.1} unit="m" onChange={(length) => setConfig({ ...config, length })} />
          ) : (
            <Slider label={t({ en: 'Mass m', vi: 'Khối lượng m' })} value={config.mass} min={0.1} max={10} step={0.1} unit="kg" onChange={(mass) => setConfig({ ...config, mass })} />
          )}
        </div>
      </div>
      <p aria-live="polite" className="text-sm text-ink">
        <span className="font-mono">{isPendulum ? 'T = 2π√(L/g)' : 'T = 2π√(m/k)'}</span> = <span className="font-semibold tabular-nums">{period.toFixed(2)} s</span>
        <span className="text-ink-muted">
          {' '}
          · {isPendulum ? `g = ${config.g} m/s²` : `k = ${config.k} N/m`}
        </span>
      </p>
    </div>
  );
}

function PendulumEditor({ config, onChange, lang }: SimulationEditorProps<'pendulum'>) {
  const t = pick(lang);
  const isPendulum = config.mode === 'pendulum';
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <SelectField
          label={t({ en: 'Oscillator', vi: 'Vật dao động' })}
          value={config.mode}
          options={[
            { value: 'pendulum', label: t({ en: 'Simple pendulum', vi: 'Con lắc đơn' }) },
            { value: 'spring', label: t({ en: 'Spring', vi: 'Con lắc lò xo' }) },
          ]}
          onChange={(mode) => onChange({ ...config, mode })}
        />
      </div>
      {isPendulum ? (
        <>
          <NumberField label={t({ en: 'Length L', vi: 'Chiều dài L' })} unit="m" value={config.length} min={0.1} max={10} step={0.1} onChange={(length) => onChange({ ...config, length })} />
          <NumberField label="g" unit="m/s²" value={config.g} min={1} max={25} step={0.1} onChange={(g) => onChange({ ...config, g })} />
        </>
      ) : (
        <>
          <NumberField label={t({ en: 'Mass m', vi: 'Khối lượng m' })} unit="kg" value={config.mass} min={0.1} max={10} step={0.1} onChange={(mass) => onChange({ ...config, mass })} />
          <NumberField label={t({ en: 'Stiffness k', vi: 'Độ cứng k' })} unit="N/m" value={config.k} min={1} max={1000} onChange={(k) => onChange({ ...config, k })} />
        </>
      )}
      <NumberField label={t({ en: 'Amplitude', vi: 'Biên độ' })} unit={isPendulum ? '°' : 'cm'} value={config.amplitude} min={1} max={30} onChange={(amplitude) => onChange({ ...config, amplitude })} />
    </div>
  );
}

export const pendulumModule: SimulationModule<'pendulum'> = {
  kind: 'pendulum',
  label: { en: 'Pendulum / spring', vi: 'Con lắc / lò xo' },
  subject: { en: 'Physics', vi: 'Vật lý' },
  Editor: PendulumEditor,
  Renderer: PendulumView,
};
