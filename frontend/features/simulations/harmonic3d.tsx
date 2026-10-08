'use client';

import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { BUTTON, CheckField, NumberField, PANEL, Slider } from './controls';
import { harmonicDisplayRadius, harmonicState } from './engines/harmonic';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import { useHarmonicPlayback } from './useHarmonicPlayback';
import styles from './harmonic3d.module.css';

const HarmonicScene = lazy(() => import('./harmonic3dScene'));
type Props = SimulationViewProps<'harmonic-3d'>;

class SceneBoundary extends Component<{ readonly fallback: ReactNode; readonly children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function HarmonicExperiment({ config, lang }: Props) {
  const t = pick(lang);
  const host = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState(config);
  const { amplitude, period } = settings;
  const clock = useHarmonicPlayback(period, config.autoplay, host);
  useEffect(() => setMounted(true), []);
  const s = harmonicState({ amplitude, period, phase: config.phase }, clock.shownTime);
  const radius = harmonicDisplayRadius(amplitude);
  const format = (value: number) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 3 }).format(Math.abs(value) < 0.0005 ? 0 : value);
  const description = t({ vi: 'M chuyển động tròn đều. P là hình chiếu của M lên Ox, dao động điều hòa.', en: 'M moves uniformly around the circle. Its projection P on Ox performs harmonic motion.' });
  const fallback = (message: string) => (
    <div className={styles.stage}>
      <svg viewBox="-4 -3 8 6" role="img" aria-label={description} className={styles.fallback}>
        <rect x="-3.8" y="-2.7" width="7.6" height="5.4" fill="var(--harmonic-board)" />
        <circle cx="0" cy="0" r={radius} fill="none" stroke="var(--harmonic-chalk)" strokeWidth="0.03" />
        <path d="M-2.4 0H2.4" stroke="var(--harmonic-x)" strokeWidth="0.035" />
        <path d="M0 -2.2V2.2" stroke="var(--harmonic-y)" strokeWidth="0.025" strokeDasharray="0.12" />
        <path d={`M0 0L${radius * Math.cos(s.angle)} ${-radius * Math.sin(s.angle)}`} stroke="var(--harmonic-chalk)" strokeWidth="0.025" />
        <circle cx={radius * Math.cos(s.angle)} cy={-radius * Math.sin(s.angle)} r="0.12" fill="var(--harmonic-velocity)" />
        <circle cx={radius * Math.cos(s.angle)} cy="0" r="0.12" fill="var(--harmonic-projection)" />
        <text x="0" y="-2.25" textAnchor="middle" fontSize="0.25" fill="var(--harmonic-chalk)">{message}</text>
        <text x="0" y="2.3" textAnchor="middle" fontSize="0.22" fill="var(--harmonic-chalk)">{t({ vi: 'Bản 2D · Công thức và điều khiển vẫn dùng được', en: '2D view · Formulas and controls remain available' })}</text>
      </svg>
    </div>
  );
  const setPhysical = (key: 'amplitude' | 'period', value: number) => {
    clock.seek(0);
    setSettings((c) => ({ ...c, [key]: value }));
  };
  return (
    <div ref={host} className={PANEL}>
      {mounted ? <SceneBoundary fallback={fallback(t({ vi: 'Trình duyệt này không hiển thị được 3D.', en: 'This browser cannot display 3D.' }))}>
        <Suspense fallback={fallback(t({ vi: 'Đang tải hình 3D…', en: 'Loading the 3D view…' }))}>
          <HarmonicScene config={settings} time={clock.time} running={clock.running} stamp={clock.shownTime} lang={lang} />
        </Suspense>
      </SceneBoundary> : fallback(t({ vi: 'Đang tải hình 3D…', en: 'Loading the 3D view…' }))}
      <p className="text-sm text-ink-muted">{description}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} onClick={clock.toggle}>{clock.playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}{t(clock.playing ? { vi: 'Tạm dừng', en: 'Pause' } : { vi: 'Phát', en: 'Play' })}</button>
        <button type="button" className={BUTTON} onClick={() => clock.seek(0)}><RotateCcw aria-hidden="true" className="h-4 w-4" />{t({ vi: 'Về thời điểm đầu', en: 'Restart' })}</button>
      </div>
      <Slider label={t({ vi: 'Thời gian t', en: 'Time t' })} value={clock.shownTime} min={0} max={period} step={0.01} unit="s" onChange={clock.seek} />
      <dl className="grid grid-cols-1 gap-2 rounded-md bg-surface-sunken p-3 text-sm tabular-nums sm:grid-cols-3">
        {([['x', s.x, 'm'], ['v', s.v, 'm/s'], ['a', s.a, 'm/s²']] as const).map(([key, value, unit]) => <div key={key}><dt className="text-ink-muted">{key === 'x' ? t({ vi: 'Li độ x', en: 'Displacement x' }) : key === 'v' ? t({ vi: 'Vận tốc v', en: 'Velocity v' }) : t({ vi: 'Gia tốc a', en: 'Acceleration a' })}</dt><dd className="font-semibold text-ink">{format(value)} {unit}</dd></div>)}
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider label={t({ vi: 'Biên độ A', en: 'Amplitude A' })} value={amplitude} min={0.1} max={5} step={0.1} unit="m" onChange={(v) => setPhysical('amplitude', v)} />
        <Slider label={t({ vi: 'Chu kì T', en: 'Period T' })} value={period} min={1} max={20} step={0.5} unit="s" onChange={(v) => setPhysical('period', v)} />
      </div>
      <p className="rounded-md border border-line p-3 text-sm text-ink">x = A cos(ωt + φ) · v = −Aω sin(ωt + φ) · a = −ω²x · ω = 2π/T</p>
      <p className="text-xs text-ink-muted">{t({ vi: 'Mũi tên vàng: vận tốc. Mũi tên xanh: gia tốc. Bán kính được thu phóng để vừa bảng; độ dài mỗi vectơ được thu phóng riêng để dễ quan sát.', en: 'Yellow arrow: velocity. Green arrow: acceleration. The radius is scaled to fit the board; each vector is scaled separately for visibility.' })}</p>
    </div>
  );
}

function HarmonicView(props: Props) { return <HarmonicExperiment key={JSON.stringify(props.config)} {...props} />; }

function HarmonicEditor({ config, onChange, lang }: SimulationEditorProps<'harmonic-3d'>) {
  const t = pick(lang);
  return <div className="grid gap-3 sm:grid-cols-2">
    <NumberField label={t({ vi: 'Biên độ A', en: 'Amplitude A' })} value={config.amplitude} min={0.1} max={5} step={0.1} unit="m" onChange={(amplitude) => onChange({ ...config, amplitude })} />
    <NumberField label={t({ vi: 'Chu kì T', en: 'Period T' })} value={config.period} min={1} max={20} step={0.5} unit="s" onChange={(period) => onChange({ ...config, period })} />
    <NumberField label={t({ vi: 'Pha ban đầu φ', en: 'Initial phase φ' })} value={config.phase} min={0} max={360} step={5} unit="°" onChange={(phase) => onChange({ ...config, phase })} />
    <CheckField label={t({ vi: 'Tự chạy khi mở', en: 'Play on opening' })} checked={config.autoplay} onChange={(autoplay) => onChange({ ...config, autoplay })} />
  </div>;
}

export const harmonic3dModule: SimulationModule<'harmonic-3d'> = {
  kind: 'harmonic-3d',
  label: { vi: 'Dao động điều hòa 3D', en: 'Harmonic motion 3D' },
  subject: { vi: 'Vật lí', en: 'Physics' },
  Renderer: HarmonicView,
  Editor: HarmonicEditor,
};
