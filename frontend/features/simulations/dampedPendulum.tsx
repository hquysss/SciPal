'use client';

import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { BUTTON, CheckField, NumberField, PANEL, SelectField, Slider } from './controls';
import { DAMPED_DURATION, dampedState, type DampingMedium } from './engines/dampedPendulum';
import { pick, type Lang, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import type { DampedConfig } from './dampedPendulumScene';
import { useHarmonicPlayback } from './useHarmonicPlayback';
import styles from './dampedPendulum.module.css';

const DampedScene = lazy(() => import('./dampedPendulumScene'));
type Props = SimulationViewProps<'damped-pendulum'>;

class SceneBoundary extends Component<{ readonly fallback: ReactNode; readonly children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const mediumOptions = (t: ReturnType<typeof pick>) => [
  { value: 'air' as DampingMedium, label: t({ vi: 'Không khí (cản nhỏ)', en: 'Air (light damping)' }) },
  { value: 'water' as DampingMedium, label: t({ vi: 'Nước (cản vừa)', en: 'Water (medium damping)' }) },
  { value: 'oil' as DampingMedium, label: t({ vi: 'Dầu (cản lớn)', en: 'Oil (heavy damping)' }) },
];

/** A flat drawing of the same curve, shown while the 3D view loads or when WebGL is missing. */
function Flat({ config, time, message, lang }: { readonly config: DampedConfig; readonly time: number; readonly message: string; readonly lang: Lang }) {
  const t = pick(lang);
  const W = 12;
  const sx = (s: number) => (s / DAMPED_DURATION) * W;
  const sy = (deg: number) => -(deg / config.amplitude) * 1.6;
  const steps = Array.from({ length: Math.floor((time / DAMPED_DURATION) * 240) + 1 }, (_, i) => (i / 240) * DAMPED_DURATION);
  const curve = steps.map((s) => `${sx(s).toFixed(3)},${sy(dampedState(config, s).theta).toFixed(3)}`).join(' ');
  const edge = (sign: number) => Array.from({ length: 49 }, (_, i) => `${sx((i / 48) * DAMPED_DURATION).toFixed(3)},${(sign * sy(dampedState(config, (i / 48) * DAMPED_DURATION).envelope)).toFixed(3)}`).join(' ');
  return (
    <div className={styles.stage}>
      <svg viewBox="-0.6 -2.6 13.2 5.2" role="img" aria-label={t({ vi: 'Đồ thị li độ theo thời gian, biên độ giảm dần.', en: 'Displacement against time with a shrinking amplitude.' })} className={styles.fallback}>
        <rect x="-0.4" y="-2.2" width="12.8" height="4.4" fill="var(--damped-plate)" />
        <path d={`M0 0H${W}`} stroke="var(--damped-grid)" strokeWidth="0.03" />
        <polyline points={edge(1)} fill="none" stroke="var(--damped-envelope)" strokeWidth="0.04" strokeDasharray="0.15 0.1" />
        <polyline points={edge(-1)} fill="none" stroke="var(--damped-envelope)" strokeWidth="0.04" strokeDasharray="0.15 0.1" />
        <polyline points={curve} fill="none" stroke="var(--damped-trace)" strokeWidth="0.05" />
        <text x="6" y="-2.35" textAnchor="middle" fontSize="0.3" fill="var(--damped-string)">{message}</text>
      </svg>
    </div>
  );
}

function DampedExperiment({ config, lang }: Props) {
  const t = pick(lang);
  const host = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<DampedConfig>(config);
  const clock = useHarmonicPlayback(DAMPED_DURATION, config.autoplay, host);
  useEffect(() => setMounted(true), []);
  const s = dampedState(settings, clock.shownTime);
  const format = (value: number, digits = 2) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: digits }).format(Math.abs(value) < 0.005 ? 0 : value);
  const setPhysical = <K extends 'length' | 'amplitude' | 'plateSpeed' | 'medium'>(key: K, value: Props['config'][K]) => {
    const wasPlaying = clock.playing;
    clock.seek(0);
    setSettings((c) => ({ ...c, [key]: value }));
    if (wasPlaying) clock.play();
  };
  /** The learner let go of the bob: that angle is the new starting amplitude, and the plate starts moving. */
  const release = (degrees: number) => {
    setSettings((c) => ({ ...c, amplitude: Math.max(3, Math.round(Math.abs(degrees))), direction: degrees < 0 ? -1 : 1 }));
    clock.seek(0);
    clock.play();
  };
  const loading = t({ vi: 'Đang tải hình 3D…', en: 'Loading the 3D view…' });
  const flat = (message: string) => <Flat config={settings} time={clock.shownTime} message={message} lang={lang} />;
  const reference = format(2 * Math.PI * Math.sqrt(settings.length / 9.8));
  return (
    <div ref={host} className={PANEL}>
      {mounted ? <SceneBoundary fallback={flat(t({ vi: 'Trình duyệt này không hiển thị được 3D.', en: 'This browser cannot display 3D.' }))}>
        <Suspense fallback={flat(loading)}>
          <DampedScene config={settings} time={clock.time} running={clock.running} stamp={clock.shownTime} lang={lang} onGrab={() => clock.seek(0)} onRelease={release} />
        </Suspense>
      </SceneBoundary> : flat(loading)}
      <p className="text-sm text-ink-muted">{t({ vi: 'Kéo vật nặng sang một bên rồi thả: tấm nhựa chạy đều và bút dạ gắn ở vật nặng vẽ lại li độ của con lắc lên tấm nhựa chuyển động đều. Nét đỏ là đồ thị li độ – thời gian, nét đứt xanh là đường bao biên độ.', en: 'Drag the bob aside and let go: the plate moves steadily and a felt pen on the bob draws the pendulum’s displacement on a plate moving at constant speed. The red line is the displacement–time graph; the dashed blue lines are the amplitude envelope.' })}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} onClick={clock.toggle}>{clock.playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}{t(clock.playing ? { vi: 'Tạm dừng', en: 'Pause' } : { vi: 'Phát', en: 'Play' })}</button>
        <button type="button" className={BUTTON} onClick={() => clock.seek(0)}><RotateCcw aria-hidden="true" className="h-4 w-4" />{t({ vi: 'Làm lại', en: 'Restart' })}</button>
      </div>
      <Slider label={t({ vi: 'Thời gian t', en: 'Time t' })} value={clock.shownTime} min={0} max={DAMPED_DURATION} step={0.05} unit="s" onChange={clock.seek} />
      <dl className="grid grid-cols-2 gap-2 rounded-md bg-surface-sunken p-3 text-sm tabular-nums sm:grid-cols-4">
        {([
          [t({ vi: 'Góc lệch', en: 'Angle' }), `${format(s.theta)}°`],
          [t({ vi: 'Biên độ lúc này', en: 'Amplitude now' }), `${format(s.envelope)}°`],
          [t({ vi: 'Chu kì T', en: 'Period T' }), `${format(s.period)} s`],
          [t({ vi: 'Tần số f', en: 'Frequency f' }), `${format(s.frequency)} Hz`],
        ] as const).map(([name, value]) => <div key={name}><dt className="text-ink-muted">{name}</dt><dd className="font-semibold text-ink">{value}</dd></div>)}
      </dl>
      <p role="status" className="rounded-md border border-line p-3 text-sm text-ink">
        {t({ vi: `Nhận xét: sau mỗi chu kì biên độ chỉ còn ${format(s.ratio * 100, 1)}% (giảm dần), còn chu kì T = ${format(s.period)} s gần như không đổi so với 2π√(ℓ/g) = ${reference} s.`, en: `Observation: each period the amplitude falls to ${format(s.ratio * 100, 1)}% of the last (it decays), while the period T = ${format(s.period)} s stays almost equal to 2π√(ℓ/g) = ${reference} s.` })}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label={t({ vi: 'Chiều dài ℓ', en: 'Length ℓ' })} value={settings.length} min={0.25} max={2} step={0.05} unit="m" onChange={(v) => setPhysical('length', v)} />
        <Slider label={t({ vi: 'Góc lệch ban đầu', en: 'Starting angle' })} value={settings.amplitude} min={3} max={20} step={1} unit="°" onChange={(v) => setPhysical('amplitude', v)} />
        <Slider label={t({ vi: 'Tốc độ tấm nhựa', en: 'Plate speed' })} value={settings.plateSpeed} min={2} max={8} step={0.5} unit="cm/s" onChange={(v) => setPhysical('plateSpeed', v)} />
        <SelectField label={t({ vi: 'Môi trường', en: 'Medium' })} value={settings.medium} options={mediumOptions(t)} onChange={(v) => setPhysical('medium', v)} />
      </div>
      <p className="rounded-md border border-line p-3 text-sm text-ink">θ = θ₀ e<sup>−γt</sup> cos(ω′t) · ω′ = √(ω₀² − γ²) · ω₀ = √(g/ℓ) · γ = {format(s.gamma)} s⁻¹</p>
      <p className="text-xs text-ink-muted">{t({ vi: 'Mô hình góc nhỏ. Dây được vẽ dài theo ℓ nhưng không đúng tỉ lệ thật so với tấm nhựa.', en: 'Small-angle model. The string length follows ℓ but is not drawn to scale against the plate.' })}</p>
    </div>
  );
}

function DampedView(props: Props) { return <DampedExperiment key={JSON.stringify(props.config)} {...props} />; }

function DampedEditor({ config, onChange, lang }: SimulationEditorProps<'damped-pendulum'>) {
  const t = pick(lang);
  return <div className="grid gap-3 sm:grid-cols-2">
    <NumberField label={t({ vi: 'Chiều dài ℓ', en: 'Length ℓ' })} value={config.length} min={0.25} max={2} step={0.05} unit="m" onChange={(length) => onChange({ ...config, length })} />
    <NumberField label={t({ vi: 'Góc lệch ban đầu', en: 'Starting angle' })} value={config.amplitude} min={3} max={20} step={1} unit="°" onChange={(amplitude) => onChange({ ...config, amplitude })} />
    <NumberField label={t({ vi: 'Tốc độ tấm nhựa', en: 'Plate speed' })} value={config.plateSpeed} min={2} max={8} step={0.5} unit="cm/s" onChange={(plateSpeed) => onChange({ ...config, plateSpeed })} />
    <SelectField label={t({ vi: 'Môi trường', en: 'Medium' })} value={config.medium} options={mediumOptions(t)} onChange={(medium) => onChange({ ...config, medium })} />
    <CheckField label={t({ vi: 'Tự chạy khi mở', en: 'Play on opening' })} checked={config.autoplay} onChange={(autoplay) => onChange({ ...config, autoplay })} />
  </div>;
}

export const dampedPendulumModule: SimulationModule<'damped-pendulum'> = {
  kind: 'damped-pendulum',
  label: { vi: 'Dao động tắt dần của con lắc đơn 3D', en: 'Damped pendulum 3D' },
  subject: { vi: 'Vật lí', en: 'Physics' },
  Renderer: DampedView,
  Editor: DampedEditor,
};
