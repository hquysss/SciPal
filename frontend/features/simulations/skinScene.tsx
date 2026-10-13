'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject, type ReactNode } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Rig, usePalette } from './scene3d';
import { useReflexCamera } from './reflexCamera';
import { useReflexFrame, useReflexFullscreen } from './useReflexFrame';
import { Rod, type Point3 } from './kneeReflexParts';
import { RECEPTOR_PLACES, SkinBody } from './skinBody';
import { SkinArm, SLICE_AT } from './SkinArm';
import { REFLEX_PARTS, RECEPTORS, impulseRate, reflexState, type ReflexPart, type Stimulus } from './engines/skin';
import { REFLEX_COPY, REFLEX_FEELING, SKIN_PARTS, STIMULUS_COPY, type ReflexStimulus, type SkinPart } from './skinCopy';
import { ARM_LANDMARKS as A } from './skinArmLandmarks';
import { SKIN_LANDMARKS as L } from './skinLandmarks';
import type { SkinView } from './SkinControls';
import { pick, type Bilingual, type Lang } from './types';
import overlay from './simOverlay.module.css';
import styles from './skin.module.css';

const TOKENS = { background: '--skin-background', artery: '--skin-artery', nerve: '--skin-nerve', signal: '--skin-signal', motor: '--skin-motor', broken: '--skin-broken', tool: '--skin-tool', ice: '--skin-ice', hot: '--skin-hot', thorn: '--skin-thorn', highlight: '--skin-highlight', bone: '--skin-bone', muscle: '--skin-muscle', cord: '--skin-cord', grey: '--skin-grey', white: '--skin-white' } as const;
const HOMES = { receptors: { theta: -Math.PI / 2 + 0.35, phi: 0.18, dist: 15 }, reflex: { theta: -Math.PI / 2 + 0.45, phi: 0.08, dist: 14 } } as const;

/** `zoom` is how close the camera comes when the label is chosen. */
type Anchor = { readonly key: string; readonly text: Bilingual; readonly note: Bilingual; readonly point: Point3; readonly label: Point3; readonly zoom?: number };
// Source units → scene units, as in scripts/assets/build-skin.mjs.
const scene = (x: number, y: number, z: number): Point3 => [(x + 1320) / 300, (y + 11) / 300, (z - 215) / 300];
const PART_POINTS: Record<SkinPart, Point3> = {
  epidermis: [-2.6, 2.6, 0.9],
  hair: scene(-1600, 140, 20),
  oil: scene(-1498, 225, 0),
  dermis: [-2.6, 0.2, 0.9],
  vessels: scene(-1615, -370, -27),
  fat: [-2.6, -2.7, 0.9],
  nerve: L.trunk[5],
  sweat: scene(-1115, 160, 227),
};
const LEFT: readonly SkinPart[] = ['epidermis', 'hair', 'oil', 'dermis', 'vessels', 'fat', 'nerve'];
const LEFT_Y = [2.7, 1.9, 1.2, 0.4, -1.2, -2.4, -3.2];
const RIGHT_RECEPTORS: readonly Stimulus[] = ['touch', 'pain', 'heat', 'pressure'];
const RIGHT_Y = [2.6, 1.9, 1.2, -0.8];
const ANCHORS: readonly Anchor[] = [
  ...LEFT.map((part, i): Anchor => ({ key: part, text: SKIN_PARTS[part].title, note: SKIN_PARTS[part].note, point: PART_POINTS[part], label: [-4.3, LEFT_Y[i]!, 1.2] })),
  { key: 'cold', text: STIMULUS_COPY.cold.receptor, note: STIMULUS_COPY.cold.note, point: RECEPTOR_PLACES.cold.at, label: [-4.3, -0.4, 1.2] },
  ...RIGHT_RECEPTORS.map((s, i): Anchor => ({ key: s, text: STIMULUS_COPY[s].receptor, note: STIMULUS_COPY[s].note, point: RECEPTOR_PLACES[s].at, label: [4.3, RIGHT_Y[i]!, 1.2] })),
  { key: 'sweat', text: SKIN_PARTS.sweat.title, note: SKIN_PARTS.sweat.note, point: PART_POINTS.sweat, label: [4.3, 0.3, 1.2] },
];

const REFLEX_POINTS: Record<ReflexPart, Point3> = { receptor: A.fingertip, afferent: A.sensory[5]!.at, centre: SLICE_AT, efferent: A.motor[A.motor.length - 3]!.at, effector: A.biceps };
const REFLEX_LABELS: Record<ReflexPart, Point3> = { receptor: [-4.2, -3.0, 1.2], afferent: [-4.2, -1.4, 1.2], effector: [-4.2, 0.6, 1.2], efferent: [-4.2, 2.0, 1.2], centre: [4.4, -1.6, 1.2] };
const REFLEX_ANCHORS: readonly Anchor[] = [
  ...REFLEX_PARTS.map((part, i): Anchor => ({ key: part, text: { vi: `${i + 1}. ${REFLEX_COPY[part].title.vi}`, en: `${i + 1}. ${REFLEX_COPY[part].title.en}` }, note: REFLEX_COPY[part].here, point: REFLEX_POINTS[part], label: REFLEX_LABELS[part], zoom: part === 'centre' ? 4.2 : 6 })),
  { key: 'slice', text: { vi: 'Lát cắt tuỷ sống C7 (phóng to ×9)', en: 'Spinal cord slice at C7 (×9)' }, note: { vi: 'Mặt cắt ngang tuỷ sống ở đốt cổ thứ 7, phóng to 9 lần. Chất xám hình chữ H ở giữa: sừng sau (phía trên) nhận xung từ rễ sau và hạch gai, sừng trước (phía dưới) chứa neuron vận động, gửi xung ra rễ trước. Chất trắng bao quanh.', en: 'A cross-section of the spinal cord at the seventh neck vertebra, enlarged 9 times. The H-shaped grey matter: the posterior horn (top) receives impulses from the dorsal root and ganglion; the anterior horn (bottom) holds motor neurons that send impulses out of the ventral root. White matter surrounds it.' }, point: SLICE_AT, label: [4.6, 1.1, 1.2], zoom: 4.2 },
  { key: 'brain', text: { vi: 'Não', en: 'Brain' }, note: { vi: 'Một số neuron trung gian chuyển thông tin lên não gây cảm giác đau. Thông tin tới não sau khi tay đã rụt lại.', en: 'Some interneurons pass the news up to the brain, which then feels the pain. It arrives after the hand has already pulled back.' }, point: A.brain, label: [3.4, 4.6, 0.6] },
];

function Refresh({ stamp, deps }: { readonly stamp: number; readonly deps: string }) {
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [invalidate, stamp, deps]);
  return null;
}

function Fit({ right, bottom, fieldOfView }: { readonly right: number; readonly bottom: number; readonly fieldOfView: RefObject<number> }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const usableWidth = Math.max(100, size.width - right - 16);
      const usableHeight = Math.max(100, size.height - bottom - 76);
      camera.fov = 2 * Math.atan(Math.tan(21 * Math.PI / 180) * Math.max(size.height / usableHeight, 1.25 * size.height / usableWidth)) * 180 / Math.PI;
      fieldOfView.current = camera.fov;
      camera.setViewOffset(size.width, size.height, right / 2, (bottom - 60) / 2, size.width, size.height);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size, right, bottom, fieldOfView, invalidate]);
  return null;
}

export type SkinSceneProps = {
  readonly view: SkinView;
  readonly stimulus: Stimulus;
  readonly intensity: number;
  readonly appliedAt: number | null;
  readonly reflexStimulus: ReflexStimulus;
  readonly reflexStartedAt: number | null;
  readonly broken: ReadonlySet<ReflexPart>;
  readonly labels: boolean;
  readonly time: RefObject<number>;
  readonly running: boolean;
  readonly stamp: number;
  readonly lang: Lang;
  readonly panel: ReactNode;
};

export function SkinScene({ view, stimulus, intensity, appliedAt, reflexStimulus, reflexStartedAt, broken, labels: showLabels, time, running, stamp, lang, panel }: SkinSceneProps) {
  const t = pick(lang);
  const { host, orbit, target, fieldOfView, invalidate, handlers, reset, zoom, focus } = useReflexCamera(HOMES[view]);
  const panelHost = useRef<HTMLDivElement>(null);
  const [panelVisible, setPanelVisible] = useState(true);
  const frame = useReflexFrame(host, panelHost, panelVisible);
  const screen = useReflexFullscreen(host);
  const palette = usePalette(host, TOKENS);
  const store = useRef(new Map<string, HTMLSpanElement>());
  const [selected, setSelected] = useState<Anchor | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  useEffect(() => { setSelected(null); setHovered(null); }, [view]);
  const highlight = hovered ?? selected?.key ?? null;
  useEffect(() => { if (host.current) host.current.style.cursor = hovered ? 'pointer' : ''; }, [hovered, host]);
  const choose = (a: Anchor) => { setSelected(a); setHovered(null); setPanelVisible(true); focus(a.point, a.zoom ?? 6); };
  const pickPart = useCallback((key: string) => { const a = (view === 'reflex' ? REFLEX_ANCHORS : ANCHORS).find((anchor) => anchor.key === key); if (a) choose(a); },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- choose only reads setters and the camera
    [view]);
  const flat = view === 'reflex';
  const anchors = useMemo(() => (!showLabels ? [] : flat ? REFLEX_ANCHORS : ANCHORS), [showLabels, flat]);
  const points = useMemo(() => anchors.map((a): [string, THREE.Vector3] => [a.key, new THREE.Vector3(...a.label)]), [anchors]);
  const rate = impulseRate(stimulus, intensity);
  const reflex = reflexState(reflexStartedAt === null ? -1 : stamp - reflexStartedAt, broken);
  const feeling = REFLEX_FEELING[reflexStimulus];
  const status: Bilingual = reflexStartedAt === null ? { vi: 'Bấm "Chạm" để bắt đầu', en: 'Press "Touch" to start' }
    : reflex.blockedAt ? { vi: `Xung dừng ở ${REFLEX_COPY[reflex.blockedAt].title.vi.toLowerCase()}: tay không rụt lại${reflex.felt ? `, nhưng não vẫn thấy ${feeling.vi}` : ''}`, en: `The impulse stops at the ${REFLEX_COPY[reflex.blockedAt].title.en.toLowerCase()}: the hand stays${reflex.felt ? `, but the brain still feels ${feeling.en}` : ''}` }
    : reflex.felt ? { vi: `Tay đã rụt lại, sau đó não mới thấy ${feeling.vi}`, en: `The hand pulled back; only then does the brain feel ${feeling.en}` }
    : reflex.withdrawal > 0 ? { vi: 'Cơ hai đầu co, tay rụt lại', en: 'The biceps contracts and the hand pulls back' }
    : { vi: 'Xung thần kinh đang truyền', en: 'The impulse is travelling' };
  const card: { readonly title: Bilingual; readonly note: Bilingual; readonly readout?: string } | null = selected ? { title: selected.text, note: selected.note, readout: flat ? t(status) : undefined }
    : flat ? { title: { vi: 'Phản xạ rụt tay', en: 'Withdrawal reflex' }, note: { vi: 'Bấm nhãn số để đọc từng bộ phận. Lát cắt tuỷ sống ở đốt cổ C7 được phóng to bên cạnh.', en: 'Select a numbered label to read about each part. A slice of the spinal cord at C7 is shown enlarged beside it.' }, readout: t(status) }
    : { title: STIMULUS_COPY[stimulus].receptor, note: STIMULUS_COPY[stimulus].note, readout: `${t(STIMULUS_COPY[stimulus].kind)} · ${rate === 0 ? t({ vi: `dưới ngưỡng ${RECEPTORS[stimulus].threshold}/100`, en: `below the ${RECEPTORS[stimulus].threshold}/100 threshold` }) : `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(rate)} ${t({ vi: 'xung/giây', en: 'per second' })}`}` };
  const title = flat ? { vi: '02 / Cung phản xạ rụt tay', en: '02 / Withdrawal reflex arc' } : { vi: '01 / Thụ thể cảm giác ở da', en: '01 / Sensory receptors in the skin' };
  return <div className={styles.frame} style={screen.expanded ? { height: screen.height } : undefined}>
    <div ref={host} {...handlers} className={styles.stage} data-fullscreen={screen.expanded} data-panel-layout={frame.mode} role={screen.expanded ? 'dialog' : 'group'} aria-modal={screen.expanded || undefined} tabIndex={0} aria-label={t({ vi: 'Mô hình 3D lát cắt da', en: '3D model of a slice of skin' })}>
      {palette && <Canvas dpr={[1, 1.5]} frameloop={running ? 'always' : 'demand'} camera={{ fov: 42, near: 0.1, far: 80 }} gl={{ antialias: true }}>
        <color attach="background" args={[palette.background]} />
        <ambientLight intensity={1.1} />
        <directionalLight position={[-3, 6, 8]} intensity={1.8} />
        <directionalLight position={[4, 2, -5]} intensity={0.8} />
        {flat ? <SkinArm palette={palette} time={time} startedAt={reflexStartedAt} broken={broken} stimulus={reflexStimulus} highlight={highlight} onHover={setHovered} onPick={pickPart} /> : <SkinBody palette={palette} clock={{ time }} stimulus={stimulus} intensity={intensity} appliedAt={appliedAt} highlight={highlight} onHover={setHovered} onPick={pickPart} />}
        {anchors.map((a) => <Rod key={a.key} from={a.point} to={a.label} radius={0.008} color={palette.white} opacity={0.5} />)}
        <Fit right={frame.right} bottom={frame.bottom} fieldOfView={fieldOfView} />
        <Rig orbit={orbit} target={target} labels={store} points={points} onInvalidate={(fn) => { invalidate.current = fn; }} />
        <Refresh stamp={stamp} deps={`${highlight}-${view}-${stimulus}-${intensity}-${appliedAt}-${reflexStartedAt}-${[...broken].join()}-${reflexStimulus}`} />
      </Canvas>}
      <div className={styles.toolbar} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <span className={styles.title}>{t(title)}</span>
        <div className={overlay.tools}>
          {([
            [<Plus key="in" className="h-4 w-4" aria-hidden="true" />, t({ vi: 'Phóng to', en: 'Zoom in' }), () => zoom(0.85), undefined],
            [<Minus key="out" className="h-4 w-4" aria-hidden="true" />, t({ vi: 'Thu nhỏ', en: 'Zoom out' }), () => zoom(1 / 0.85), undefined],
            [<RotateCcw key="reset" className="h-4 w-4" aria-hidden="true" />, t({ vi: 'Góc nhìn ban đầu', en: 'Reset view' }), reset, undefined],
            [panelVisible ? <Eye key="panel" className="h-4 w-4" aria-hidden="true" /> : <EyeOff key="panel" className="h-4 w-4" aria-hidden="true" />, panelVisible ? t({ vi: 'Ẩn bảng thông tin', en: 'Hide info panels' }) : t({ vi: 'Hiện bảng thông tin', en: 'Show info panels' }), () => setPanelVisible((value) => !value), panelVisible],
            [screen.expanded ? <Minimize2 key="full" className="h-4 w-4" aria-hidden="true" /> : <Maximize2 key="full" className="h-4 w-4" aria-hidden="true" />, screen.expanded ? t({ vi: 'Thoát toàn màn hình', en: 'Exit fullscreen' }) : t({ vi: 'Toàn màn hình', en: 'Fullscreen' }), () => { void screen.toggle(); }, undefined],
          ] as const).map(([icon, label, action, expanded]) => (
            <button key={label} type="button" className={overlay.tool} aria-label={label} title={label} aria-expanded={expanded} onClick={action}>{icon}</button>
          ))}
        </div>
      </div>
      {anchors.map((a) => <span key={a.key} className={styles.label} ref={(el) => { if (el) store.current.set(a.key, el); else store.current.delete(a.key); }}><button type="button" className={`${overlay.chip} ${styles.labelButton}`} aria-pressed={selected?.key === a.key} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onPointerEnter={() => setHovered(a.key)} onPointerLeave={() => setHovered(null)} onFocus={() => setHovered(a.key)} onBlur={() => setHovered(null)} onClick={() => choose(a)}>{t(a.text)}</button></span>)}
      {panelVisible && <div ref={panelHost} className={`${overlay.card} ${styles.panel}`} role="region" aria-label={t({ vi: 'Bảng điều khiển da và cảm giác', en: 'Skin and senses controls' })} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        {panel}
      </div>}
      {panelVisible && card && <div role="status" className={`${overlay.card} ${styles.info}`} style={{ right: frame.right + 16, bottom: frame.bottom + 36 }} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-ink">{t(card.title)}</p>
          {selected && <button type="button" className={overlay.tool} aria-label={t({ vi: 'Đóng thẻ thông tin', en: 'Close info card' })} onClick={() => setSelected(null)}><X className="h-4 w-4" aria-hidden="true" /></button>}
        </div>
        {card.readout && <p className="mt-1 font-mono text-xs text-ink">{card.readout}</p>}
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t(card.note)}</p>
      </div>}
      <div className={styles.legend} aria-hidden="true" style={{ bottom: frame.bottom + 12 }}>
        <span><i style={{ background: 'var(--skin-signal)' }} />{t({ vi: 'Xung thần kinh cảm giác', en: 'Sensory impulse' })}</span>
        {flat ? <><span><i style={{ background: 'var(--skin-motor)' }} />{t({ vi: 'Xung thần kinh vận động', en: 'Motor impulse' })}</span><span><i style={{ background: 'var(--skin-broken)' }} />{t({ vi: 'Bộ phận bị hỏng', en: 'Damaged part' })}</span></>
          : <span><i style={{ background: 'var(--skin-nerve)' }} />{t({ vi: 'Dây thần kinh', en: 'Nerve' })}</span>}
      </div>
    </div>
  </div>;
}
