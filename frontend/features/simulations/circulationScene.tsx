'use client';

import { useEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Rig, usePalette } from './scene3d';
import { useReflexCamera } from './reflexCamera';
import { useReflexFrame, useReflexFullscreen } from './useReflexFrame';
import { Rod, type Point3 } from './kneeReflexParts';
import { CirculationBody, bodyPoint } from './circulationBody';
import { CirculationHeart, CONDUCTION_LABELS, FLOW_LABELS, HEART_ANCHORS, type HeartLayer } from './circulationHeart';
import { CIRCULATION_LANDMARKS } from './circulationLandmarks';
import { VesselChart } from './VesselChart';
import { VESSELS, bloodSpeed, type VesselKey } from './engines/vessels';
import { VESSEL_NAMES, VESSEL_NOTES } from './circulationVessels';
import { BODY_NOTES, BODY_PARTS, HEART_NOTES, HEART_PARTS, type BodyPart, type HeartPart, type LoopFocus } from './circulationCopy';
import type { CirculationView } from './CirculationControls';
import { pick, type Bilingual, type Lang } from './types';
import overlay from './simOverlay.module.css';
import styles from './circulation.module.css';

const TOKENS = { background: '--circ-background', artery: '--circ-artery', vein: '--circ-vein', wall: '--circ-wall', muscle: '--circ-muscle', septum: '--circ-septum', valve: '--circ-valve', signal: '--circ-signal', white: '--circ-white' } as const;
const HOMES = { body: { theta: -Math.PI / 2, phi: 0.05, dist: 10.6 }, heart: { theta: -Math.PI / 2, phi: 0.05, dist: 13 }, vessels: { theta: -Math.PI / 2, phi: 0.05, dist: 10.6 } } as const;

type Anchor = { readonly key: string; readonly text: Bilingual; readonly note: Bilingual; readonly point: Point3; readonly label: Point3 };
const besideBody = (part: BodyPart, label: readonly [number, number]): Anchor => {
  const point = bodyPoint(CIRCULATION_LANDMARKS[part]);
  return { key: part, text: BODY_PARTS[part], note: BODY_NOTES[part], point, label: [label[0], label[1], point[2]] };
};
const BODY_ANCHORS: readonly Anchor[] = [
  besideBody('head', [1.0, 3.55]),
  besideBody('superiorVenaCava', [-1.6, 2.9]),
  besideBody('rightLung', [-2.0, 2.15]),
  besideBody('leftLung', [2.0, 2.6]),
  besideBody('heart', [1.7, 1.85]),
  besideBody('inferiorVenaCava', [-1.6, 1.5]),
  besideBody('aorta', [1.6, 1.05]),
  besideBody('kidney', [-1.8, 0.75]),
  besideBody('hand', [-2.2, -0.95]),
];
const heartAnchor = (part: HeartPart): Anchor => ({ key: part, text: HEART_PARTS[part], note: HEART_NOTES[part], point: HEART_ANCHORS[part].point, label: HEART_ANCHORS[part].label });

/** Draws one more frame when something shown changes while the clock is paused. */
function Refresh({ stamp, heartRate, focus, layer }: { readonly stamp: number; readonly heartRate: number; readonly focus: LoopFocus; readonly layer: HeartLayer }) {
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [invalidate, stamp, heartRate, focus, layer]);
  return null;
}

function Fit({ view, right, bottom, fieldOfView }: { readonly view: CirculationView; readonly right: number; readonly bottom: number; readonly fieldOfView: RefObject<number> }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const usableWidth = Math.max(100, size.width - right - 16);
      const usableHeight = Math.max(100, size.height - bottom - 76);
      camera.fov = 2 * Math.atan(Math.tan(21 * Math.PI / 180) * Math.max(size.height / usableHeight, (view === 'body' ? 0.85 : 1.3) * size.height / usableWidth)) * 180 / Math.PI;
      fieldOfView.current = camera.fov;
      camera.setViewOffset(size.width, size.height, right / 2, (bottom - 60) / 2, size.width, size.height);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size, view, right, bottom, fieldOfView, invalidate]);
  return null;
}

export type CirculationSceneProps = {
  readonly view: CirculationView;
  readonly heartRate: number;
  readonly focus: LoopFocus;
  readonly layer: HeartLayer;
  readonly vessel: VesselKey;
  readonly onVessel: (vessel: VesselKey) => void;
  readonly labels: boolean;
  readonly time: RefObject<number>;
  readonly running: boolean;
  readonly stamp: number;
  readonly lang: Lang;
  readonly panel: ReactNode;
};

export function CirculationScene({ view, heartRate, focus, layer, vessel, onVessel, labels: showLabels, time, running, stamp, lang, panel }: CirculationSceneProps) {
  const t = pick(lang);
  const { host, orbit, target, fieldOfView, invalidate, handlers, reset, zoom } = useReflexCamera(HOMES[view]);
  const panelHost = useRef<HTMLDivElement>(null);
  const [panelVisible, setPanelVisible] = useState(true);
  const frame = useReflexFrame(host, panelHost, panelVisible);
  const screen = useReflexFullscreen(host);
  const palette = usePalette(host, TOKENS);
  const store = useRef(new Map<string, HTMLSpanElement>());
  const [selected, setSelected] = useState<Anchor | null>(null);
  useEffect(() => setSelected(null), [view]);
  const anchors = useMemo(() => !showLabels ? [] : view === 'body' ? BODY_ANCHORS : (layer === 'flow' ? FLOW_LABELS : CONDUCTION_LABELS).map(heartAnchor), [showLabels, view, layer]);
  const points = useMemo(() => anchors.map((a): [string, THREE.Vector3] => [a.key, new THREE.Vector3(...a.label)]), [anchors]);
  const chart = view === 'vessels';
  const shownVessel = VESSELS.find((v) => v.key === vessel)!;
  const card: { readonly title: Bilingual; readonly note: Bilingual; readonly readout?: string } | null = chart
    ? { title: VESSEL_NAMES[vessel], note: VESSEL_NOTES[vessel], readout: `${shownVessel.systolic === shownVessel.diastolic ? shownVessel.systolic : `${shownVessel.systolic}/${shownVessel.diastolic}`} mmHg · ${new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(bloodSpeed(shownVessel, heartRate))} cm/s · ${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(shownVessel.area)} cm²` }
    : selected ? { title: selected.text, note: selected.note } : null;
  const title = view === 'vessels' ? { vi: '03 / Huyết áp và vận tốc máu', en: '03 / Blood pressure and speed' } : view === 'body' ? { vi: '01 / Hệ tuần hoàn kép', en: '01 / Double circulation' } : { vi: '02 / Tim và chu kì tim', en: '02 / Heart and cardiac cycle' };
  return <div className={styles.frame} style={screen.expanded ? { height: screen.height } : undefined}>
    <div ref={host} {...handlers} className={styles.stage} data-fullscreen={screen.expanded} data-panel-layout={frame.mode} role={screen.expanded ? 'dialog' : 'group'} aria-modal={screen.expanded || undefined} tabIndex={0} aria-label={t({ vi: 'Mô hình 3D hệ tuần hoàn', en: '3D model of the circulatory system' })}>
      {palette && !chart && <Canvas dpr={[1, 1.5]} frameloop={running ? 'always' : 'demand'} camera={{ fov: 42, near: 0.1, far: 80 }} gl={{ antialias: true, localClippingEnabled: true }}>
        <color attach="background" args={[palette.background]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[-3, 6, 8]} intensity={1.8} />
        <directionalLight position={[4, 2, -5]} intensity={0.9} />
        {view === 'body' ? <CirculationBody time={time} heartRate={heartRate} focus={focus} /> : <CirculationHeart palette={palette} time={time} heartRate={heartRate} layer={layer} />}
        {anchors.map((a) => <Rod key={a.key} from={a.point} to={a.label} radius={0.008} color={palette.white} opacity={0.5} />)}
        <Fit view={view} right={frame.right} bottom={frame.bottom} fieldOfView={fieldOfView} />
        <Rig orbit={orbit} target={target} labels={store} points={points} onInvalidate={(fn) => { invalidate.current = fn; }} />
        <Refresh stamp={stamp} heartRate={heartRate} focus={focus} layer={layer} />
      </Canvas>}
      {chart && <div className={styles.chart} style={{ right: frame.right + 16, bottom: frame.bottom + 160 }}><VesselChart lang={lang} time={stamp} heartRate={heartRate} selected={vessel} onSelect={onVessel} /></div>}
      <div className={styles.toolbar} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <span className={styles.title}>{t(title)}</span>
        <div className={overlay.tools}>
          {([
            [<Plus key="in" className="h-4 w-4" aria-hidden="true" />, t({ vi: 'Phóng to', en: 'Zoom in' }), () => zoom(0.85), undefined],
            [<Minus key="out" className="h-4 w-4" aria-hidden="true" />, t({ vi: 'Thu nhỏ', en: 'Zoom out' }), () => zoom(1 / 0.85), undefined],
            [<RotateCcw key="reset" className="h-4 w-4" aria-hidden="true" />, t({ vi: 'Góc nhìn ban đầu', en: 'Reset view' }), reset, undefined],
            [panelVisible ? <Eye key="panel" className="h-4 w-4" aria-hidden="true" /> : <EyeOff key="panel" className="h-4 w-4" aria-hidden="true" />, panelVisible ? t({ vi: 'Ẩn bảng thông tin', en: 'Hide info panels' }) : t({ vi: 'Hiện bảng thông tin', en: 'Show info panels' }), () => setPanelVisible((value) => !value), panelVisible],
            [screen.expanded ? <Minimize2 key="full" className="h-4 w-4" aria-hidden="true" /> : <Maximize2 key="full" className="h-4 w-4" aria-hidden="true" />, screen.expanded ? t({ vi: 'Thoát toàn màn hình', en: 'Exit fullscreen' }) : t({ vi: 'Toàn màn hình', en: 'Fullscreen' }), () => { void screen.toggle(); }, undefined],
          ] as const).filter((_, index) => !chart || index > 2).map(([icon, label, action, expanded]) => (
            <button key={label} type="button" className={overlay.tool} aria-label={label} title={label} aria-expanded={expanded} onClick={action}>{icon}</button>
          ))}
        </div>
      </div>
      {anchors.map((a) => <span key={a.key} className={styles.label} ref={(el) => { if (el) store.current.set(a.key, el); else store.current.delete(a.key); }}><button type="button" className={`${overlay.chip} ${styles.labelButton}`} aria-pressed={selected?.key === a.key} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onClick={() => { setSelected(a); setPanelVisible(true); }}>{t(a.text)}</button></span>)}
      {panelVisible && <div ref={panelHost} className={`${overlay.card} ${styles.panel}`} role="region" aria-label={t({ vi: 'Bảng điều khiển tuần hoàn', en: 'Circulation controls' })} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        {panel}
      </div>}
      {panelVisible && card && <div role="status" className={`${overlay.card} ${styles.info}`} style={{ right: frame.right + 16, bottom: frame.bottom + 36 }} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-ink">{t(card.title)}</p>
          {!chart && <button type="button" className={overlay.tool} aria-label={t({ vi: 'Đóng thẻ thông tin', en: 'Close info card' })} onClick={() => setSelected(null)}><X className="h-4 w-4" aria-hidden="true" /></button>}
        </div>
        {card.readout && <p className="mt-1 font-mono text-xs text-ink">{card.readout}</p>}
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t(card.note)}</p>
      </div>}
      <div className={styles.legend} aria-hidden="true" style={{ bottom: frame.bottom + 12 }}>
        <span><i style={{ background: 'var(--circ-artery)' }} />{t({ vi: 'Máu giàu O₂', en: 'O₂-rich blood' })}</span>
        <span><i style={{ background: 'var(--circ-vein)' }} />{t({ vi: 'Máu giàu CO₂', en: 'CO₂-rich blood' })}</span>
        {view === 'vessels' && <span><i style={{ background: 'var(--circ-white)' }} />{t({ vi: 'Huyết áp lúc này', en: 'Pressure now' })}</span>}
        {view === 'body' && <span><i style={{ background: 'var(--circ-white)' }} />{t({ vi: 'Sóng mạch', en: 'Pulse wave' })}</span>}
        {view === 'heart' && layer === 'conduction' && <span><i style={{ background: 'var(--circ-signal)' }} />{t({ vi: 'Xung điện', en: 'Electrical impulse' })}</span>}
      </div>
    </div>
  </div>;
}
