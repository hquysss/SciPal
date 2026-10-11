'use client';

import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckField, NumberField, SelectField } from './controls';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import { KneeReflexControls, REFLEX_VIEWS } from './KneeReflexControls';
import { useReflexPlayback } from './useReflexPlayback';
import styles from './kneeReflex.module.css';

const Scene = lazy(() => import('./kneeReflexScene').then((module) => ({ default: module.KneeReflexScene })));
const NAME = { vi: 'Phản xạ đầu gối', en: 'Knee-jerk reflex' };

class ReflexBoundary extends Component<{ readonly children: ReactNode; readonly fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function KneeReflexView({ config, lang }: SimulationViewProps<'knee-reflex'>) {
  const t = pick(lang);
  const host = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState(config.view);
  const [labels, setLabels] = useState(config.labels);
  const playback = useReflexPlayback(config.speed, host);
  useEffect(() => setMounted(true), []);
  const panel = <KneeReflexControls lang={lang} speed={config.speed} view={view} onView={setView} labels={labels} onLabels={setLabels} playback={playback} />;
  const loading = <div className={`${styles.stage} ${styles.loading}`} aria-busy="true"><p className="absolute left-4 top-4 rounded-lg bg-surface p-3 text-sm text-ink">{t({ vi: 'Đang tải mô hình 3D…', en: 'Loading the 3D model…' })}</p><div className={styles.panel}>{panel}</div></div>;
  const fallback = <div className={`${styles.stage} ${styles.loading}`}><div className={styles.panel}><p role="note" className="mb-3 rounded-lg bg-surface-sunken p-3 text-sm text-ink">{t({ vi: 'Trình duyệt này không mở được mô hình 3D. Bạn vẫn có thể chọn từng bước bên dưới để học cung phản xạ.', en: 'This browser cannot display 3D. You can still study the reflex by selecting the steps below.' })}</p>{panel}</div></div>;
  return <div ref={host} className="flex flex-col gap-2">
    {mounted ? <ReflexBoundary fallback={fallback}>
      <Suspense fallback={loading}><Scene view={view} labels={labels} time={playback.time} running={playback.running} stamp={playback.shownTime} lang={lang} panel={panel} /></Suspense>
    </ReflexBoundary> : loading}
    <p className="text-xs leading-relaxed text-ink-muted">{t({ vi: 'Mô hình giải phẫu giản lược. Chuyển động và xung thần kinh được làm chậm để quan sát; tốc độ và kích thước không theo tỉ lệ thực.', en: 'Simplified anatomy. Motion and nerve impulses are slowed for observation; speed and dimensions are not to scale.' })}</p>
    <p className="text-xs text-ink-muted">{t({ vi: 'Model giải phẫu: ', en: 'Anatomy model: ' })}<a className="underline" href="/models/knee-reflex/README.md" target="_blank" rel="noreferrer">BodyParts3D / Z-Anatomy · CC BY-SA 4.0</a></p>
  </div>;
}

function KneeReflexEditor({ config, onChange, lang }: SimulationEditorProps<'knee-reflex'>) {
  const t = pick(lang);
  return <div className="flex flex-col gap-3">
    <SelectField label={t({ vi: 'Cảnh ban đầu', en: 'Initial view' })} value={config.view} options={REFLEX_VIEWS.map((v) => ({ value: v.value, label: t(v.label) }))} onChange={(view) => onChange({ ...config, view })} />
    <NumberField label={t({ vi: 'Tốc độ phát', en: 'Playback speed' })} value={config.speed} min={0.5} max={2} step={0.25} unit="×" onChange={(speed) => onChange({ ...config, speed })} />
    <CheckField label={t({ vi: 'Hiện nhãn ban đầu', en: 'Show labels initially' })} checked={config.labels} onChange={(labels) => onChange({ ...config, labels })} />
  </div>;
}

export const kneeReflexModule: SimulationModule<'knee-reflex'> = { kind: 'knee-reflex', label: NAME, subject: { vi: 'Sinh học', en: 'Biology' }, Editor: KneeReflexEditor, Renderer: KneeReflexView };
