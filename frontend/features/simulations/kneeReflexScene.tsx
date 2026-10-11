'use client';

import { memo, useEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Rig, usePalette } from './scene3d';
import { useReflexCamera } from './reflexCamera';
import { useReflexFrame, useReflexFullscreen } from './useReflexFrame';
import { KNEE_REFLEX_LANDMARKS } from './kneeReflexLandmarks';
import { ReflexBody } from './kneeReflexBody';
import { ReflexCircuit } from './kneeReflexCircuit';
import { REFLEX_LABELS, REFLEX_NOTES, type ReflexLabel } from './kneeReflexCopy';
import { Rod, type Point3 } from './kneeReflexParts';
import { pick, type Lang } from './types';
import overlay from './simOverlay.module.css';
import styles from './kneeReflex.module.css';

const TOKENS = { background: '--reflex-background', bone: '--reflex-bone', muscle: '--reflex-muscle', stripe: '--reflex-stripe', skin: '--reflex-skin', sensory: '--reflex-sensory', motor: '--reflex-motor', inhibition: '--reflex-inhibition', metal: '--reflex-metal', seat: '--reflex-seat', white: '--reflex-white', gray: '--reflex-gray' } as const;
const BODY_HOME = { theta: -Math.PI / 2 - 0.16, phi: 0.06, dist: 10.4 };
const CIRCUIT_HOME = { theta: -Math.PI / 2, phi: 0.05, dist: 8.7 };
const world = (p: Point3): Point3 => [p[0], p[1] - 0.2, p[2]];
type Anchor = { readonly key: ReflexLabel; readonly point: Point3; readonly label: Point3 };
const BODY_LABELS: readonly Anchor[] = [
  { key: 'brain', point: world(KNEE_REFLEX_LANDMARKS.brainCenter), label: [-2.35, 3.1, 0.2] },
  { key: 'cord', point: world(KNEE_REFLEX_LANDMARKS.cordLabelPoint), label: [0.2, 1.7, 0.2] },
  { key: 'quadriceps', point: [-0.25, -0.45, 0.3], label: [-2.15, 0.1, 0.3] },
  { key: 'spindle', point: [0.43, -0.44, 0.4], label: [1.8, 0.5, 0.3] },
  { key: 'tendon', point: [1.17, -0.9, 0.3], label: [2.15, -0.65, 0.3] },
];
const CIRCUIT_LABELS: readonly Anchor[] = [
  { key: 'cord', point: [-2.45, 0.3, 0.2], label: [-2.65, 1.6, 0.3] },
  { key: 'sensory', point: [-0.3, 1.5, 0.3], label: [-0.3, 2, 0.3] },
  { key: 'motor', point: [0.25, 0.42, 0.3], label: [0.1, 0.05, 0.3] },
  { key: 'inhibitory', point: [-2.1, 0.08, 0.3], label: [-2.4, -1.9, 0.3] },
  { key: 'quadriceps', point: [2.25, 1.1, 0.3], label: [2.8, 1.95, 0.3] },
  { key: 'hamstrings', point: [2.25, -1.2, 0.3], label: [2.6, -2.1, 0.3] },
];

function Refresh({ stamp }: { readonly stamp: number }) {
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [invalidate, stamp]);
  return null;
}

function Fit({ view, right, bottom, fieldOfView }: { readonly view: 'body' | 'circuit'; readonly right: number; readonly bottom: number; readonly fieldOfView: RefObject<number> }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const usableWidth = Math.max(100, size.width - right - 16);
      const usableHeight = Math.max(100, size.height - bottom - 76);
      camera.fov = 2 * Math.atan(Math.tan(21 * Math.PI / 180) * Math.max(size.height / usableHeight, (view === 'body' ? 0.8 : 1.5) * size.height / usableWidth)) * 180 / Math.PI;
      fieldOfView.current = camera.fov;
      camera.setViewOffset(size.width, size.height, right / 2, (bottom - 60) / 2, size.width, size.height);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size, view, right, bottom, fieldOfView, invalidate]);
  return null;
}

export type ReflexSceneProps = { readonly view: 'body' | 'circuit'; readonly labels: boolean; readonly time: RefObject<number>; readonly running: boolean; readonly stamp: number; readonly lang: Lang; readonly panel: ReactNode };

export function KneeReflexScene({ view, labels: showLabels, time, running, stamp, lang, panel }: ReflexSceneProps) {
  const t = pick(lang);
  const { host, orbit, target, fieldOfView, invalidate, handlers, reset, zoom } = useReflexCamera(view === 'body' ? BODY_HOME : CIRCUIT_HOME);
  const panelHost = useRef<HTMLDivElement>(null);
  const [panelVisible, setPanelVisible] = useState(true);
  const frame = useReflexFrame(host, panelHost, panelVisible);
  const screen = useReflexFullscreen(host);
  const palette = usePalette(host, TOKENS);
  const store = useRef(new Map<string, HTMLSpanElement>());
  const [selected, setSelected] = useState<ReflexLabel | null>(null);
  const anchors = showLabels ? (view === 'body' ? BODY_LABELS : CIRCUIT_LABELS) : [];
  const points = useMemo(() => anchors.map((a): [string, THREE.Vector3] => [a.key, new THREE.Vector3(...a.label)]), [anchors]);
  const Models = view === 'body' ? BodyModel : CircuitModel;
  return <div className={styles.frame} style={screen.expanded ? { height: screen.height } : undefined}>
    <div ref={host} {...handlers} className={styles.stage} data-fullscreen={screen.expanded} data-panel-layout={frame.mode} role={screen.expanded ? 'dialog' : 'group'} aria-modal={screen.expanded || undefined} tabIndex={0} aria-label={t({ vi: 'Mô hình 3D phản xạ đầu gối', en: '3D knee reflex model' })}>
      {palette && <Canvas dpr={[1, 1.5]} frameloop={running ? 'always' : 'demand'} camera={{ fov: 42, near: 0.1, far: 60 }} gl={{ antialias: true }}>
        <color attach="background" args={[palette.background]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[-3, 6, 8]} intensity={1.9} />
        <directionalLight position={[4, 2, -3]} intensity={1} />
        <Models palette={palette} time={time} />
        {anchors.map((a) => <Rod key={a.key} from={a.point} to={a.label} radius={0.006} color={palette.white} opacity={0.5} />)}
        <Fit view={view} right={frame.right} bottom={frame.bottom} fieldOfView={fieldOfView} />
        <Rig orbit={orbit} target={target} labels={store} points={points} onInvalidate={(fn) => { invalidate.current = fn; }} />
        <Refresh stamp={stamp} />
      </Canvas>}
      <div className={styles.toolbar} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <span className={styles.title}>{t(view === 'body' ? { vi: '01 / Phản xạ đầu gối', en: '01 / Knee-jerk reflex' } : { vi: '02 / Cung phản xạ', en: '02 / Reflex circuit' })}</span>
        <div className={overlay.tools}>
          {([
            [<Plus key="in" className="h-4 w-4" aria-hidden="true" />, t({ vi: 'Phóng to', en: 'Zoom in' }), () => zoom(0.85)],
            [<Minus key="out" className="h-4 w-4" aria-hidden="true" />, t({ vi: 'Thu nhỏ', en: 'Zoom out' }), () => zoom(1 / 0.85)],
            [<RotateCcw key="reset" className="h-4 w-4" aria-hidden="true" />, t({ vi: 'Góc nhìn ban đầu', en: 'Reset view' }), reset],
            [panelVisible ? <Eye key="panel" className="h-4 w-4" aria-hidden="true" /> : <EyeOff key="panel" className="h-4 w-4" aria-hidden="true" />, panelVisible ? t({ vi: 'Ẩn bảng thông tin', en: 'Hide info panels' }) : t({ vi: 'Hiện bảng thông tin', en: 'Show info panels' }), () => setPanelVisible((value) => !value)],
            [screen.expanded ? <Minimize2 key="full" className="h-4 w-4" aria-hidden="true" /> : <Maximize2 key="full" className="h-4 w-4" aria-hidden="true" />, screen.expanded ? t({ vi: 'Thoát toàn màn hình', en: 'Exit fullscreen' }) : t({ vi: 'Toàn màn hình', en: 'Fullscreen' }), () => { void screen.toggle(); }],
          ] as const).map(([icon, label, action]) => (
            <button key={label} type="button" className={overlay.tool} aria-label={label} title={label} aria-expanded={label.includes('bảng') || label.includes('panels') ? panelVisible : undefined} onClick={action}>{icon}</button>
          ))}
        </div>
      </div>
      {anchors.map((a) => <span key={a.key} className={styles.label} ref={(el) => { if (el) store.current.set(a.key, el); else store.current.delete(a.key); }}><button type="button" className={`${overlay.chip} ${styles.labelButton}`} aria-pressed={selected === a.key} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onClick={() => { setSelected(a.key); setPanelVisible(true); }}>{t(REFLEX_LABELS[a.key])}</button></span>)}
      {panelVisible && <div ref={panelHost} className={`${overlay.card} ${styles.panel}`} data-reflex-panel="" role="region" aria-label={t({ vi: 'Bảng quan sát phản xạ', en: 'Reflex observation panel' })} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        {selected && <div role="status" className="mb-3 rounded-lg bg-surface-sunken p-3 text-sm leading-relaxed text-ink"><strong>{t(REFLEX_LABELS[selected])}: </strong>{t(REFLEX_NOTES[selected])}</div>}
        {panel}
      </div>}
      <div className={styles.legend} aria-hidden="true" style={{ bottom: frame.bottom + 12 }}>
        <span><i style={{ background: 'var(--reflex-sensory)' }} />{t({ vi: 'Cảm giác', en: 'Sensory' })}</span>
        <span><i style={{ background: 'var(--reflex-motor)' }} />{t({ vi: 'Vận động', en: 'Motor' })}</span>
        <span><i style={{ background: 'var(--reflex-inhibition)' }} />{t({ vi: 'Ức chế', en: 'Inhibitory' })}</span>
      </div>
    </div>
  </div>;
}

const BodyModel = memo(ReflexBody);
const CircuitModel = memo(ReflexCircuit);
