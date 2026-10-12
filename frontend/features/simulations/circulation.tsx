'use client';

import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckField, NumberField, SelectField } from './controls';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import { CirculationControls, CIRCULATION_VIEWS, type CirculationView } from './CirculationControls';
import { LOOPS, type LoopFocus } from './circulationCopy';
import type { HeartLayer } from './circulationHeart';
import { useCirculationClock } from './useCirculationClock';
import styles from './circulation.module.css';

const Scene = lazy(() => import('./circulationScene').then((module) => ({ default: module.CirculationScene })));
const NAME = { vi: 'Tuần hoàn máu 3D', en: 'Blood circulation 3D' };
// Body view runs in real time; the heart is slowed so the valves can be followed.
const VIEW_SPEED: Record<CirculationView, number> = { body: 1, heart: 0.25 };

class SceneBoundary extends Component<{ readonly children: ReactNode; readonly fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function CirculationView({ config, lang }: SimulationViewProps<'circulation-3d'>) {
  const t = pick(lang);
  const host = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<CirculationView>(config.view);
  const [heartRate, setHeartRate] = useState(config.heartRate);
  const [speed, setSpeed] = useState(VIEW_SPEED[config.view]);
  const [focus, setFocus] = useState<LoopFocus>(config.loop);
  const [layer, setLayer] = useState<HeartLayer>('flow');
  const [labels, setLabels] = useState(config.labels);
  const clock = useCirculationClock(speed, host);
  useEffect(() => setMounted(true), []);
  const choose = (next: CirculationView) => { setView(next); setSpeed(VIEW_SPEED[next]); };
  const panel = <CirculationControls lang={lang} view={view} onView={choose} heartRate={heartRate} onHeartRate={setHeartRate} speed={speed} onSpeed={setSpeed} focus={focus} onFocus={setFocus} layer={layer} onLayer={setLayer} labels={labels} onLabels={setLabels} clock={clock} />;
  const loading = <div className={`${styles.stage} ${styles.loading}`} aria-busy="true"><p className="absolute left-4 top-4 rounded-lg bg-surface p-3 text-sm text-ink">{t({ vi: 'Đang tải mô hình 3D…', en: 'Loading the 3D model…' })}</p><div className={styles.panel}>{panel}</div></div>;
  const fallback = <div className={`${styles.stage} ${styles.loading}`}><div className={styles.panel}><p role="note" className="mb-3 rounded-lg bg-surface-sunken p-3 text-sm text-ink">{t({ vi: 'Trình duyệt này không mở được mô hình 3D. Bạn vẫn có thể chọn từng pha của chu kì tim bên dưới.', en: 'This browser cannot display 3D. You can still go through the phases of the cardiac cycle below.' })}</p>{panel}</div></div>;
  return <div ref={host} className="flex flex-col gap-2">
    {mounted ? <SceneBoundary fallback={fallback}>
      <Suspense fallback={loading}><Scene view={view} heartRate={heartRate} focus={focus} layer={layer} labels={labels} time={clock.time} running={clock.running} stamp={clock.shownTime} lang={lang} panel={panel} /></Suspense>
    </SceneBoundary> : loading}
    <p className="text-xs leading-relaxed text-ink-muted">{t({ vi: 'Màu theo quy ước SGK: đỏ là máu giàu O₂, xanh là máu giàu CO₂. Sóng mạch và dòng máu được làm chậm để quan sát; tim ở cảnh 2 là sơ đồ, không theo tỉ lệ thực.', en: 'Textbook colours: red is oxygen-rich blood, blue is carbon dioxide-rich blood. The pulse wave and blood flow are slowed for observation; the heart in view 2 is a diagram, not to scale.' })}</p>
    <p className="text-xs text-ink-muted">{t({ vi: 'Model hệ tuần hoàn: ', en: 'Circulatory system model: ' })}<a className="underline" href="https://sketchfab.com/3d-models/circulatory-system-3584d5b2b97545cf965007c195899b7b" target="_blank" rel="noreferrer">“Circulatory System” – brianj.seely</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>{t({ vi: ' (đã chỉnh sửa)', en: ' (modified)' })}</p>
  </div>;
}

function CirculationEditor({ config, onChange, lang }: SimulationEditorProps<'circulation-3d'>) {
  const t = pick(lang);
  return <div className="flex flex-col gap-3">
    <SelectField label={t({ vi: 'Cảnh ban đầu', en: 'Initial view' })} value={config.view} options={CIRCULATION_VIEWS.map((v) => ({ value: v.value, label: t(v.label) }))} onChange={(view) => onChange({ ...config, view })} />
    <NumberField label={t({ vi: 'Nhịp tim ban đầu', en: 'Initial heart rate' })} value={config.heartRate} min={40} max={180} step={1} unit={t({ vi: 'nhịp/phút', en: 'bpm' })} onChange={(heartRate) => onChange({ ...config, heartRate })} />
    <SelectField label={t({ vi: 'Vòng tuần hoàn làm nổi', en: 'Highlighted loop' })} value={config.loop} options={(Object.keys(LOOPS) as LoopFocus[]).map((key) => ({ value: key, label: t(LOOPS[key].label) }))} onChange={(loop) => onChange({ ...config, loop })} />
    <CheckField label={t({ vi: 'Hiện nhãn ban đầu', en: 'Show labels initially' })} checked={config.labels} onChange={(labels) => onChange({ ...config, labels })} />
  </div>;
}

export const circulationModule: SimulationModule<'circulation-3d'> = { kind: 'circulation-3d', label: NAME, subject: { vi: 'Sinh học', en: 'Biology' }, Editor: CirculationEditor, Renderer: CirculationView };
