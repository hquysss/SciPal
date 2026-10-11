'use client';

import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Hand, Pause, Play, RotateCcw, X, Zap } from 'lucide-react';
import { BUTTON, CheckField, NumberField, PANEL, SelectField, Slider } from './controls';
import { ABSORBER_START, autoSource, damping, loopTime, SourceHistory, TANK_LENGTH, wavelength, type WaveSettings } from './engines/wave';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import { useHarmonicPlayback } from './useHarmonicPlayback';
import { WAVE_PARTS, type WavePart } from './wave3dParts';
import type { CrankState } from './wave3dScene';
import styles from './wave3d.module.css';

const WaveScene = lazy(() => import('./wave3dScene'));
type Props = SimulationViewProps<'wave-3d'>;
type Mode = 'auto' | 'manual';
const MAX_FLOATS = 5;
const GRAPH_A = 3; // cm: the graphs keep one scale so a bigger amplitude looks bigger
const SLOWEST = 0.2; // m/s, the schema minimum: the history must outlast the trip down the tank

class SceneBoundary extends Component<{ readonly fallback: ReactNode; readonly children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function WaveExperiment({ config, lang }: Props) {
  const t = pick(lang);
  const host = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<WaveSettings>({ frequency: config.frequency, amplitude: config.amplitude, speed: config.speed });
  const [mode, setMode] = useState<Mode>(config.mode);
  const [floats, setFloats] = useState<number[]>([0.35, 0.65]);
  const [selected, setSelected] = useState(0);
  const [showMeasure, setShowMeasure] = useState(true);
  const [part, setPart] = useState<WavePart | null>(null);
  const history = useMemo(() => new SourceHistory(TANK_LENGTH / SLOWEST + 5), []);
  const crank = useRef<CrankState>({ angle: 0, rate: 0 });
  const loopEnd = TANK_LENGTH / settings.speed + 1 / settings.frequency;
  const clock = useHarmonicPlayback(mode === 'auto' ? loopEnd : Infinity, config.autoplay || config.mode === 'manual', host, mode === 'auto' ? (time) => loopTime(settings, time) : (time) => time);
  const [readout, setReadout] = useState({ angle: 0, rate: 0 });
  useEffect(() => {
    setMounted(true);
    // On a phone the measure tags crowd the part labels; they stay one tick away.
    if (window.innerWidth > 0 && window.matchMedia?.('(max-width: 520px)').matches) setShowMeasure(false);
  }, []);
  useEffect(() => setReadout({ angle: crank.current.angle, rate: crank.current.rate }), [clock.shownTime]);

  const source = mode === 'auto' ? autoSource(settings) : (tau: number) => history.at(tau);
  const now = clock.shownTime;
  const frequency = mode === 'auto' ? settings.frequency : Math.abs(readout.rate);
  const turning = frequency >= 0.05;
  const lambda = turning ? settings.speed / frequency : null;
  const format = (value: number, digits = 2) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: digits }).format(value);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    history.clear();
    crank.current.angle = 0;
    crank.current.rate = 0;
    clock.seek(0);
    if (next === 'manual' || !reducedMotion()) clock.play();
  };
  const restart = () => {
    history.clear();
    clock.seek(0);
    if (mode === 'manual') clock.play();
  };
  const setPhysical = (key: keyof WaveSettings, value: number) => setSettings((s) => ({ ...s, [key]: value }));
  const addFloat = (x: number) => {
    if (x < 0.03 || x > ABSORBER_START - 0.02) return;
    setFloats((list) => [...list, x].slice(-MAX_FLOATS));
    setSelected(Math.min(floats.length, MAX_FLOATS - 1));
  };
  const setAngle = (degrees: number) => {
    const current = ((crank.current.angle * 180) / Math.PI) % 360;
    let delta = degrees - (current < 0 ? current + 360 : current);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    crank.current.angle += (delta * Math.PI) / 180;
    setReadout((r) => ({ ...r, angle: crank.current.angle }));
  };
  const shownDegrees = (((readout.angle * 180) / Math.PI) % 360 + 360) % 360;

  const description = t({
    vi: 'Bánh xe quay làm vật tạo sóng dao động lên xuống. Sóng truyền dọc máng với tốc độ v; mỗi vòng quay tạo một bước sóng λ = v/f. Miếng xốp chỉ dao động tại chỗ.',
    en: 'The turning wheel moves the wave source up and down. The wave travels along the tank at speed v; each turn makes one wavelength λ = v/f. The floats only bob in place.',
  });
  const readouts = (
    <dl className={`${styles.readouts} ${styles.card}`}>
      <dt>{t({ vi: 'Tần số f', en: 'Frequency f' })}</dt><dd>{turning ? `${format(frequency)} Hz` : '—'}</dd>
      <dt>{t({ vi: 'Chu kì T', en: 'Period T' })}</dt><dd>{turning ? `${format(1 / frequency)} s` : '—'}</dd>
      <dt>{t({ vi: 'Bước sóng λ', en: 'Wavelength λ' })}</dt><dd>{lambda !== null ? `${format(lambda, 3)} m` : '—'}</dd>
      <dt>{t({ vi: 'Tốc độ truyền v', en: 'Wave speed v' })}</dt><dd>{format(settings.speed)} m/s</dd>
    </dl>
  );
  const modeSwitch = (
    <div role="group" aria-label={t({ vi: 'Chế độ', en: 'Mode' })} className="flex flex-wrap gap-2">
      {([['auto', Zap, { vi: 'Motor tự quay', en: 'Motor drive' }], ['manual', Hand, { vi: 'Tự quay tay', en: 'Turn by hand' }]] as const).map(([value, Icon, label]) => (
        <button key={value} type="button" aria-pressed={mode === value} onClick={() => switchMode(value)} className={`${BUTTON} ${mode === value ? 'border-action bg-action text-action-ink hover:bg-action-hover' : ''}`}>
          <Icon aria-hidden="true" className="h-4 w-4" />
          {t(label)}
        </button>
      ))}
    </div>
  );
  const transport = (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={BUTTON} onClick={clock.toggle}>
        {clock.playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
        {t(clock.playing ? { vi: 'Tạm dừng', en: 'Pause' } : { vi: 'Phát', en: 'Play' })}
      </button>
      <button type="button" className={BUTTON} onClick={restart}>
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
        {t(mode === 'auto' ? { vi: 'Về thời điểm đầu', en: 'Restart' } : { vi: 'Làm phẳng mặt nước', en: 'Calm the water' })}
      </button>
    </div>
  );
  const sliders = (
    <>
      {mode === 'auto' && <Slider label={t({ vi: 'Tần số f', en: 'Frequency f' })} value={settings.frequency} min={0.5} max={4} step={0.1} unit="Hz" onChange={(v) => setPhysical('frequency', v)} />}
      <Slider label={t({ vi: 'Biên độ A', en: 'Amplitude A' })} value={settings.amplitude} min={0.5} max={3} step={0.1} unit="cm" onChange={(v) => setPhysical('amplitude', v)} />
      <Slider label={t({ vi: 'Tốc độ truyền v', en: 'Wave speed v' })} value={settings.speed} min={0.2} max={1.2} step={0.05} unit="m/s" onChange={(v) => setPhysical('speed', v)} />
    </>
  );
  // Drawn over the 3D view, so the numbers and the explanation stay in sight (and in full screen).
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const hud = (expanded: boolean) => (
    <>
      {readouts}
      <div className={styles.bottom}>
        {part && (
          <div aria-live="polite" className={`${styles.card} ${styles.part} ${styles.interactive}`} onPointerDown={stop}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t(WAVE_PARTS[part].name)}</p>
              <p className="mt-0.5 text-ink-muted">{t(WAVE_PARTS[part].about)}</p>
            </div>
            <button type="button" className={styles.tool} aria-label={t({ vi: 'Đóng', en: 'Close' })} onClick={() => setPart(null)}><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
        )}
        {expanded && (
          <div className={`${styles.card} ${styles.dock} ${styles.interactive}`} onPointerDown={stop}>
            {modeSwitch}
            {transport}
            <div className="flex min-w-0 flex-[3_1_420px] flex-wrap gap-x-4 gap-y-2 [&>*]:min-w-[140px] [&>*]:flex-1">{sliders}</div>
          </div>
        )}
      </div>
    </>
  );

  const fallback = (message: string) => (
    <div className={`${styles.stage} flex flex-col items-center justify-center gap-3 rounded-md border border-line p-6 text-center text-sm text-ink`}>
      <p>{message} {t({ vi: 'Số liệu, đồ thị, công thức và điều khiển vẫn dùng được.', en: 'The readouts, graphs, formulas and controls still work.' })}</p>
      {readouts}
    </div>
  );

  return (
    <div ref={host} className={PANEL}>
      {modeSwitch}
      {mounted ? (
        <SceneBoundary fallback={fallback(t({ vi: 'Trình duyệt này không hiển thị được 3D.', en: 'This browser cannot display 3D.' }))}>
          <Suspense fallback={fallback(t({ vi: 'Đang tải hình 3D…', en: 'Loading the 3D view…' }))}>
            <WaveScene
              settings={settings}
              mode={mode}
              time={clock.time}
              running={clock.running}
              stamp={clock.shownTime}
              lang={lang}
              history={history}
              crank={crank}
              floats={floats}
              selectedFloat={selected}
              onAddFloat={addFloat}
              onSelectFloat={setSelected}
              showMeasure={showMeasure}
              part={part}
              onPart={setPart}
              hud={hud}
            />
          </Suspense>
        </SceneBoundary>
      ) : fallback(t({ vi: 'Đang tải hình 3D…', en: 'Loading the 3D view…' }))}

      <p className="text-sm text-ink-muted">{description}</p>
      {transport}
      {mode === 'auto' ? (
        <Slider label={t({ vi: 'Thời gian t', en: 'Time t' })} value={Math.min(now, loopEnd)} min={0} max={Number(loopEnd.toFixed(2))} step={0.01} unit="s" onChange={clock.seek} />
      ) : (
        <div className="flex flex-col gap-1">
          <Slider label={t({ vi: 'Góc tay quay θ', en: 'Crank angle θ' })} value={Math.round(shownDegrees)} min={0} max={359} step={1} unit="°" onChange={setAngle} />
          <p className="text-xs text-ink-muted">{t({ vi: 'Kéo vòng quanh bánh xe trong hình 3D, hoặc kéo thanh này qua lại. Quay nhanh hơn thì tần số tăng và bước sóng ngắn lại.', en: 'Drag around the wheel in the 3D view, or slide this back and forth. Turn faster and the frequency rises while the wavelength shrinks.' })}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">{sliders}</div>

      <WaveGraphs source={source} settings={settings} time={now} floats={floats} selected={selected} lang={lang} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <CheckField label={t({ vi: 'Hiện số đo λ, A, v', en: 'Show λ, A, v measures' })} checked={showMeasure} onChange={setShowMeasure} />
        <button type="button" className={BUTTON} onClick={() => { setFloats([0.35, 0.65]); setSelected(0); }}>{t({ vi: 'Đặt lại miếng xốp', en: 'Reset floats' })}</button>
      </div>
      <p className="rounded-md border border-line p-3 text-sm text-ink">λ = v·T = v/f · u(x, t) = A sin(ωt − 2πx/λ) · ω = 2πf</p>
      <p className="text-xs text-ink-muted">{t({ vi: `Bấm lên mặt nước để thả thêm miếng xốp (tối đa ${MAX_FLOATS}). Chiều cao sóng trong hình 3D được phóng đại để dễ quan sát; số đo giữ đúng đơn vị.`, en: `Click the water to drop more floats (up to ${MAX_FLOATS}). Wave heights in the 3D view are exaggerated for visibility; the readouts keep true units.` })}</p>
    </div>
  );
}

/** u(x) along the tank now, and u(t) of the chosen float over the last four seconds. */
function WaveGraphs({ source, settings, time, floats, selected, lang }: { readonly source: (tau: number) => number; readonly settings: WaveSettings; readonly time: number; readonly floats: readonly number[]; readonly selected: number; readonly lang: 'vi' | 'en' }) {
  const t = pick(lang);
  const W = 600;
  const H = 120;
  const y = (u: number) => H / 2 - (u / GRAPH_A) * (H / 2 - 8);
  const u = (x: number, at: number) => source(at - x / settings.speed) * damping(x);
  const space = Array.from({ length: 241 }, (_, i) => {
    const x = (i / 240) * TANK_LENGTH;
    return `${i ? 'L' : 'M'}${((x / TANK_LENGTH) * W).toFixed(1)} ${y(u(x, time)).toFixed(1)}`;
  }).join('');
  const float = floats[selected] ?? floats[0];
  const span = 4;
  const trace = float === undefined ? '' : Array.from({ length: 161 }, (_, i) => {
    const at = time - span + (i / 160) * span;
    return `${i ? 'L' : 'M'}${((i / 160) * W).toFixed(1)} ${y(u(float, at)).toFixed(1)}`;
  }).join('');
  const l = wavelength(settings);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <figure className="m-0 flex flex-col gap-1">
        <figcaption className="text-sm font-semibold text-ink">{t({ vi: 'Hình dạng sóng u(x) lúc này', en: 'Wave shape u(x) now' })}</figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-line bg-surface" role="img" aria-label={t({ vi: 'Đồ thị li độ theo vị trí dọc máng', en: 'Displacement against position along the tank' })}>
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="currentColor" className="text-line" strokeWidth="1" />
          <rect x={(ABSORBER_START / TANK_LENGTH) * W} y="0" width={W - (ABSORBER_START / TANK_LENGTH) * W} height={H} fill="currentColor" className="text-surface-sunken" />
          <path d={space} fill="none" stroke="var(--accent, currentColor)" strokeWidth="2.5" strokeLinejoin="round" />
          {floats.map((x, i) => <circle key={`${i}-${x}`} cx={(x / TANK_LENGTH) * W} cy={y(u(x, time))} r={i === selected ? 6 : 4} fill={i === selected ? 'var(--accent, currentColor)' : 'currentColor'} className="text-ink" />)}
          <text x="6" y="14" fontSize="12" fill="currentColor" className="text-ink-muted">u (cm)</text>
          <text x={W - 6} y={H - 6} fontSize="12" textAnchor="end" fill="currentColor" className="text-ink-muted">x (m) · λ = {l.toFixed(2)} m</text>
        </svg>
      </figure>
      <figure className="m-0 flex flex-col gap-1">
        <figcaption className="text-sm font-semibold text-ink">{t({ vi: 'Miếng xốp đang chọn: u(t) trong 4 s gần nhất', en: 'Chosen float: u(t) over the last 4 s' })}</figcaption>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-line bg-surface" role="img" aria-label={t({ vi: 'Đồ thị li độ của miếng xốp theo thời gian', en: 'The float’s displacement against time' })}>
          <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="currentColor" className="text-line" strokeWidth="1" />
          {trace && <path d={trace} fill="none" stroke="var(--accent, currentColor)" strokeWidth="2.5" strokeLinejoin="round" />}
          <text x="6" y="14" fontSize="12" fill="currentColor" className="text-ink-muted">u (cm)</text>
          <text x={W - 6} y={H - 6} fontSize="12" textAnchor="end" fill="currentColor" className="text-ink-muted">t (s){float !== undefined ? ` · x = ${float.toFixed(2)} m` : ''}</text>
        </svg>
      </figure>
    </div>
  );
}

function WaveView(props: Props) { return <WaveExperiment key={JSON.stringify(props.config)} {...props} />; }

function WaveEditor({ config, onChange, lang }: SimulationEditorProps<'wave-3d'>) {
  const t = pick(lang);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SelectField label={t({ vi: 'Chế độ khi mở', en: 'Opening mode' })} value={config.mode} options={[{ value: 'auto', label: t({ vi: 'Motor tự quay', en: 'Motor drive' }) }, { value: 'manual', label: t({ vi: 'Học sinh tự quay tay', en: 'Learner turns the crank' }) }]} onChange={(mode) => onChange({ ...config, mode })} />
      <NumberField label={t({ vi: 'Tần số f', en: 'Frequency f' })} value={config.frequency} min={0.5} max={4} step={0.1} unit="Hz" onChange={(frequency) => onChange({ ...config, frequency })} />
      <NumberField label={t({ vi: 'Biên độ A', en: 'Amplitude A' })} value={config.amplitude} min={0.5} max={3} step={0.1} unit="cm" onChange={(amplitude) => onChange({ ...config, amplitude })} />
      <NumberField label={t({ vi: 'Tốc độ truyền v', en: 'Wave speed v' })} value={config.speed} min={0.2} max={1.2} step={0.05} unit="m/s" onChange={(speed) => onChange({ ...config, speed })} />
      <CheckField label={t({ vi: 'Tự chạy khi mở', en: 'Play on opening' })} checked={config.autoplay} onChange={(autoplay) => onChange({ ...config, autoplay })} />
    </div>
  );
}

export const wave3dModule: SimulationModule<'wave-3d'> = {
  kind: 'wave-3d',
  label: { vi: 'Sóng trên mặt nước 3D', en: 'Water waves 3D' },
  subject: { vi: 'Vật lí', en: 'Physics' },
  Renderer: WaveView,
  Editor: WaveEditor,
};
