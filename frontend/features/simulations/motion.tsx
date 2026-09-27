'use client';

import { useMemo } from 'react';
import { Pause, Play } from 'lucide-react';
import { BUTTON, NumberField, PANEL, SelectField, Slider } from './controls';
import { motionAt, motionDuration } from './engines/physics';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import { useClock } from './useClock';

const MODES = {
  uniform: { en: 'Uniform motion', vi: 'Chuyển động thẳng đều' },
  accelerated: { en: 'Uniformly accelerated motion', vi: 'Chuyển động thẳng biến đổi đều' },
  projectile: { en: 'Projectile', vi: 'Ném xiên' },
} as const;

const W = 320;
const H = 180;
const PAD = 12;

function MotionView({ config, lang }: SimulationViewProps<'motion'>) {
  const t = pick(lang);
  const duration = motionDuration(config);
  const clock = useClock(duration);
  const state = motionAt(config, clock.time);

  // Scale the whole run into the box once, so the path does not jump while playing.
  const { path, scale, maxX, maxY } = useMemo(() => {
    const points = Array.from({ length: 61 }, (_, i) => motionAt(config, (duration * i) / 60));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(0, ...xs);
    const spanX = Math.max(...xs) - minX || 1;
    const topY = Math.max(...ys, 1);
    const s = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / topY);
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${(PAD + (p.x - minX) * s).toFixed(1)},${(H - PAD - p.y * s).toFixed(1)}`).join(' ');
    return { path: d, scale: { s, minX }, maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }, [config, duration]);

  const cx = PAD + (state.x - scale.minX) * scale.s;
  const cy = H - PAD - state.y * scale.s;
  const speed = Math.hypot(state.vx, state.vy);

  return (
    <div className={PANEL}>
      <p className="text-sm font-semibold text-ink">{t(MODES[config.mode])}</p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t({ en: 'Path of the object', vi: 'Quỹ đạo của vật' })} className="h-auto w-full rounded-md border border-line bg-surface-sunken">
        <line x1={0} x2={W} y1={H - PAD} y2={H - PAD} stroke="var(--ink-muted)" strokeWidth={1} />
        <path d={path} fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} strokeDasharray="4 4" />
        <circle cx={cx} cy={cy} r={6} fill="var(--accent, var(--action))" />
      </svg>
      <div className="flex items-end gap-3">
        <button type="button" className={BUTTON} aria-label={clock.playing ? t({ en: 'Pause', vi: 'Tạm dừng' }) : t({ en: 'Play', vi: 'Chạy' })} onClick={clock.playing ? clock.pause : clock.play}>
          {clock.playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
        </button>
        <div className="flex-1">
          <Slider label={t({ en: 'Time', vi: 'Thời gian' })} value={clock.time} min={0} max={duration} step={0.01} unit="s" onChange={clock.seek} />
        </div>
      </div>
      <p aria-live="polite" className="sr-only">
        {clock.playing ? '' : `t = ${clock.time.toFixed(2)} s, x = ${state.x.toFixed(2)} m, y = ${state.y.toFixed(2)} m, ${speed.toFixed(2)} m/s`}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        {[
          ['x', `${state.x.toFixed(2)} m`],
          ['y', `${state.y.toFixed(2)} m`],
          [t({ en: 'speed', vi: 'tốc độ' }), `${speed.toFixed(2)} m/s`],
          ['t', `${clock.time.toFixed(2)} s`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 border-b border-line py-1">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="tabular-nums text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-muted">
        {config.mode === 'uniform' && 'x = v₀·t'}
        {config.mode === 'accelerated' && 'x = v₀·t + ½·a·t², v = v₀ + a·t'}
        {config.mode === 'projectile' &&
          `x = v₀·cosα·t, y = v₀·sinα·t − ½·g·t² · ${t({ en: 'range', vi: 'tầm xa' })} ${maxX.toFixed(1)} m, ${t({ en: 'height', vi: 'độ cao' })} ${maxY.toFixed(1)} m`}
      </p>
    </div>
  );
}

function MotionEditor({ config, onChange, lang }: SimulationEditorProps<'motion'>) {
  const t = pick(lang);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <SelectField
          label={t({ en: 'Kind of motion', vi: 'Loại chuyển động' })}
          value={config.mode}
          options={(Object.keys(MODES) as Array<keyof typeof MODES>).map((m) => ({ value: m, label: t(MODES[m]) }))}
          onChange={(mode) => onChange({ ...config, mode })}
        />
      </div>
      <NumberField label={t({ en: 'Initial speed v₀', vi: 'Vận tốc đầu v₀' })} unit="m/s" value={config.v0} min={0} max={100} step={0.5} onChange={(v0) => onChange({ ...config, v0 })} />
      {config.mode === 'projectile' ? (
        <>
          <NumberField label={t({ en: 'Angle α', vi: 'Góc ném α' })} unit="°" value={config.angle} min={0} max={90} onChange={(angle) => onChange({ ...config, angle })} />
          <NumberField label="g" unit="m/s²" value={config.g} min={1} max={25} step={0.1} onChange={(g) => onChange({ ...config, g })} />
        </>
      ) : (
        <>
          {config.mode === 'accelerated' && (
            <NumberField label={t({ en: 'Acceleration a', vi: 'Gia tốc a' })} unit="m/s²" value={config.a} min={-20} max={20} step={0.1} onChange={(a) => onChange({ ...config, a })} />
          )}
          <NumberField label={t({ en: 'Duration', vi: 'Thời gian' })} unit="s" value={config.duration} min={1} max={30} onChange={(duration) => onChange({ ...config, duration })} />
        </>
      )}
    </div>
  );
}

export const motionModule: SimulationModule<'motion'> = {
  kind: 'motion',
  label: { en: 'Motion', vi: 'Chuyển động' },
  subject: { en: 'Physics', vi: 'Vật lý' },
  Editor: MotionEditor,
  Renderer: MotionView,
};
