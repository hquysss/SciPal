'use client';

import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckField, SelectField } from './controls';
import { pick, type SimulationEditorProps, type SimulationModule, type SimulationViewProps } from './types';
import { SkinControls, SKIN_VIEWS, type SkinView } from './SkinControls';
import { STIMULI, type ReflexPart, type Stimulus } from './engines/skin';
import { STIMULUS_COPY, type ReflexStimulus } from './skinCopy';
import { useCirculationClock } from './useCirculationClock';
import styles from './skin.module.css';

const Scene = lazy(() => import('./skinScene').then((module) => ({ default: module.SkinScene })));
const NAME = { vi: 'Da và cảm giác', en: 'Skin and senses' };

class SceneBoundary extends Component<{ readonly children: ReactNode; readonly fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function SkinView({ config, lang }: SimulationViewProps<'skin-senses'>) {
  const t = pick(lang);
  const host = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<SkinView>(config.view);
  const [speed, setSpeed] = useState(1);
  const [stimulus, setStimulus] = useState<Stimulus>(config.stimulus);
  const [intensity, setIntensity] = useState(60);
  const [appliedAt, setAppliedAt] = useState<number | null>(null);
  const [reflexStimulus, setReflexStimulus] = useState<ReflexStimulus>(config.stimulus === 'heat' ? 'heat' : 'pain');
  const [reflexStartedAt, setReflexStartedAt] = useState<number | null>(null);
  const [broken, setBroken] = useState<ReadonlySet<ReflexPart>>(new Set());
  const [labels, setLabels] = useState(config.labels);
  const clock = useCirculationClock(speed, host);
  useEffect(() => setMounted(true), []);
  /** Starts the clock if it is held, so what the learner just did plays out. */
  const play = () => { if (!clock.playing) clock.toggle(); };
  const panel = <SkinControls lang={lang} view={view} onView={setView} speed={speed} onSpeed={setSpeed} clock={clock}
    stimulus={stimulus} onStimulus={(next) => { setStimulus(next); setAppliedAt(null); }} intensity={intensity} onIntensity={setIntensity}
    applied={appliedAt !== null} onApply={() => { if (appliedAt === null) { setAppliedAt(clock.time.current); play(); } else setAppliedAt(null); }}
    reflexStimulus={reflexStimulus} onReflexStimulus={(next) => { setReflexStimulus(next); setReflexStartedAt(null); }}
    broken={broken} onBroken={(part, value) => { setBroken((before) => { const next = new Set(before); if (value) next.add(part); else next.delete(part); return next; }); setReflexStartedAt(null); }}
    onTouch={() => { setReflexStartedAt(clock.time.current); play(); }}
    labels={labels} onLabels={setLabels} />;
  const loading = <div className={`${styles.stage} ${styles.loading}`} aria-busy="true"><p className="absolute left-4 top-4 rounded-lg bg-surface p-3 text-sm text-ink">{t({ vi: 'Đang tải mô hình 3D…', en: 'Loading the 3D model…' })}</p><div className={styles.panel}>{panel}</div></div>;
  const fallback = <div className={`${styles.stage} ${styles.loading}`}><div className={styles.panel}><p role="note" className="mb-3 rounded-lg bg-surface-sunken p-3 text-sm text-ink">{t({ vi: 'Trình duyệt này không mở được mô hình 3D. Bạn vẫn có thể xem từng loại thụ thể và cung phản xạ bên dưới.', en: 'This browser cannot display 3D. You can still go through the receptors and the reflex arc below.' })}</p>{panel}</div></div>;
  return <div ref={host} className="flex flex-col gap-2">
    {mounted ? <SceneBoundary fallback={fallback}>
      <Suspense fallback={loading}><Scene view={view} stimulus={stimulus} intensity={intensity} appliedAt={appliedAt} reflexStimulus={reflexStimulus} reflexStartedAt={reflexStartedAt} broken={broken} labels={labels} time={clock.time} running={clock.running} stamp={clock.shownTime} lang={lang} panel={panel} /></Suspense>
    </SceneBoundary> : loading}
    <p className="text-xs text-ink-muted">{t({ vi: 'Model da: ', en: 'Skin model: ' })}<a className="underline" href="https://sketchfab.com/3d-models/skin-cross-section-model-2e28bcb97e0148eda7665c45b0131a39" target="_blank" rel="noreferrer">“Skin Cross Section Model” – iqcenter</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>{t({ vi: ' (đã chỉnh sửa; thêm thụ thể đau, nhiệt, áp lực)', en: ' (modified; pain, temperature and pressure receptors added)' })}</p>
    <p className="text-xs text-ink-muted">{t({ vi: 'Model cánh tay và tuỷ sống: ', en: 'Arm and spinal cord model: ' })}<a className="underline" href="/models/skin/README.md" target="_blank" rel="noreferrer">BodyParts3D / Z-Anatomy · CC BY-SA 4.0</a>{t({ vi: ' (đã chỉnh sửa) · Lát cắt tuỷ: ', en: ' (modified) · Cord section: ' })}<a className="underline" href="https://sketchfab.com/3d-models/spinothalamic-tract-101321-9754d81f54df426aafa25b3799b5ce65" target="_blank" rel="noreferrer">“Spinothalamic Tract 10/13/21” – aandp</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>{t({ vi: ' (đã chỉnh sửa)', en: ' (modified)' })}</p>
  </div>;
}

function SkinEditor({ config, onChange, lang }: SimulationEditorProps<'skin-senses'>) {
  const t = pick(lang);
  return <div className="flex flex-col gap-3">
    <SelectField label={t({ vi: 'Cảnh ban đầu', en: 'Initial view' })} value={config.view} options={SKIN_VIEWS.map((v) => ({ value: v.value, label: t(v.label) }))} onChange={(view) => onChange({ ...config, view })} />
    <SelectField label={t({ vi: 'Kích thích ban đầu', en: 'Initial stimulus' })} value={config.stimulus} options={STIMULI.map((s) => ({ value: s, label: t(STIMULUS_COPY[s].label) }))} onChange={(stimulus) => onChange({ ...config, stimulus })} />
    <CheckField label={t({ vi: 'Hiện nhãn ban đầu', en: 'Show labels initially' })} checked={config.labels} onChange={(labels) => onChange({ ...config, labels })} />
  </div>;
}

export const skinModule: SimulationModule<'skin-senses'> = { kind: 'skin-senses', label: NAME, subject: { vi: 'Sinh học', en: 'Biology' }, Editor: SkinEditor, Renderer: SkinView };
