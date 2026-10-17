'use client';

import { memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { SimulationConfigByKind } from '@scipal/types';
import { DAMPED_DURATION, dampedState } from './engines/dampedPendulum';
import { Cable, PowerBox, RBox, Stand, usePlateTexture, useWoodTexture, type Palette } from './dampedPendulumParts';
import { LabelLayer, Rig, useOrbit, usePalette, ViewButtons, VIEW_CLASS } from './scene3d';
import { pick, type Lang } from './types';
import styles from './dampedPendulum.module.css';

const TOKENS = { background: '--damped-background', bench: '--damped-bench', benchDark: '--damped-bench-dark', track: '--damped-track', plate: '--damped-plate', grid: '--damped-grid', ink: '--damped-ink', trace: '--damped-trace', envelope: '--damped-envelope', steel: '--damped-steel', brass: '--damped-brass', string: '--damped-string', case: '--damped-case', led: '--damped-led' } as const;
/** The config plus the side the learner released the bob from (not stored in the lesson). */
export type DampedConfig = SimulationConfigByKind['damped-pendulum'] & { readonly direction?: 1 | -1 };
type Config = DampedConfig;
const MAX_ANGLE = 20;
const HOME = { theta: -Math.PI / 2, phi: 0.95, dist: 13.5 };
const LIMITS = { min: 5, max: 26 };
const PLATE_Y = 0.12;
const BENCH_Y = -0.25;
const STEP = 0.04;
const RAD = Math.PI / 180;
const POINTS = Math.round(DAMPED_DURATION / STEP) + 1;

/** Scene units: the string is drawn longer for a longer pendulum; the plate moves `plateSpeed` × 0.06 units/s. */
const layout = (config: Config) => {
  const ld = 2 + 1.5 * config.length;
  const speed = config.plateSpeed * 0.06;
  const halfWidth = ld * Math.sin(MAX_ANGLE * RAD) + 0.7;
  const span = speed * DAMPED_DURATION;
  return { ld, speed, halfWidth, span, pivotY: PLATE_Y + ld + 0.5, postZ: -(halfWidth + 1.3), powerX: -(span / 2 + 3.6) };
};

/** The pen's track on the plate as a flat ribbon, so it keeps its width from any camera angle. */
function useTrace(config: Config) {
  const geometry = useMemo(() => {
    const { ld, speed } = layout(config);
    const pos = new Float32Array(POINTS * 6);
    const xs: number[] = [];
    const zs: number[] = [];
    for (let i = 0; i < POINTS; i++) {
      xs.push(speed * i * STEP);
      zs.push(ld * Math.sin(dampedState(config, i * STEP).theta * RAD));
    }
    for (let i = 0; i < POINTS; i++) {
      const dx = xs[Math.min(i + 1, POINTS - 1)]! - xs[Math.max(i - 1, 0)]!;
      const dz = zs[Math.min(i + 1, POINTS - 1)]! - zs[Math.max(i - 1, 0)]!;
      const n = Math.hypot(dx, dz) || 1;
      const w = 0.035;
      pos.set([xs[i]! - (dz / n) * w, PLATE_Y + 0.015, zs[i]! + (dx / n) * w, xs[i]! + (dz / n) * w, PLATE_Y + 0.015, zs[i]! - (dx / n) * w], i * 6);
    }
    const index: number[] = [];
    for (let i = 0; i < POINTS - 1; i++) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(index);
    g.setDrawRange(0, 0);
    return g;
  }, [config]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/** The decay envelope ±θ₀e^(−γt) as dashed lines on the plate. */
function useEnvelope(config: Config, color: string) {
  const lines = useMemo(() => {
    const { ld, speed } = layout(config);
    const material = new THREE.LineDashedMaterial({ color, dashSize: 0.14, gapSize: 0.1 });
    return [1, -1].map((sign) => {
      const points = Array.from({ length: POINTS }, (_, i) => new THREE.Vector3(speed * i * STEP, PLATE_Y + 0.03, sign * ld * Math.sin(dampedState(config, i * STEP).envelope * RAD)));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
      line.computeLineDistances();
      return line;
    });
  }, [config, color]);
  useEffect(() => () => {
    for (const line of lines) line.geometry.dispose();
    (lines[0]?.material as THREE.Material | undefined)?.dispose();
  }, [lines]);
  return lines;
}

type Interaction = { readonly onGrab: () => void; readonly onRelease: (degrees: number) => void };

const Experiment = memo(function Experiment({ config, time, palette, onGrab, onRelease }: { readonly config: Config; readonly time: RefObject<number>; readonly palette: Palette } & Interaction) {
  const { invalidate } = useThree();
  const drag = useRef<number | null>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const { ld, speed, halfWidth, span, pivotY, postZ, powerX } = layout(config);
  const trace = useTrace(config);
  const envelope = useEnvelope(config, palette.envelope);
  const paper = usePlateTexture(palette, span, halfWidth, speed, DAMPED_DURATION);
  const wood = useWoodTexture({ base: palette.bench, dark: palette.benchDark });
  useEffect(() => {
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
    wood.repeat.set(6, 2);
    wood.needsUpdate = true;
  }, [wood]);
  const swing = useRef<THREE.Group>(null);
  const pen = useRef<THREE.Mesh>(null);
  const nib = useRef<THREE.Mesh>(null);
  const collar = useRef<THREE.Mesh>(null);
  const plate = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = time.current;
    const theta = (drag.current ?? dampedState(config, t).theta) * RAD;
    swing.current?.rotation.set(-theta, 0, 0);
    const bobY = pivotY - ld * Math.cos(theta);
    const z = ld * Math.sin(theta);
    pen.current?.position.set(0, (bobY - 0.2 + PLATE_Y) / 2, z);
    if (pen.current) pen.current.scale.y = Math.max(bobY - 0.2 - PLATE_Y, 0.01);
    collar.current?.position.set(0, bobY - 0.3, z);
    nib.current?.position.set(0, PLATE_Y + 0.025, z);
    plate.current?.position.set(-speed * t, 0, 0);
    trace.setDrawRange(0, Math.min(Math.floor(t / STEP), POINTS - 1) * 6);
  }, -1);
  /** The bob's angle for a pointer ray, in degrees: where the ray crosses the swing plane, as seen from the pivot. */
  const angleOf = (ray: THREE.Ray) => {
    if (!ray.intersectPlane(plane, hit)) return null;
    return Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.atan2(hit.z, pivotY - hit.y) / RAD));
  };
  const grab = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    e.nativeEvent.stopPropagation(); // the camera must not orbit while the bob is held
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    onGrab();
    drag.current = angleOf(e.ray) ?? 0;
    invalidate();
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (drag.current === null) return;
    drag.current = angleOf(e.ray) ?? drag.current;
    invalidate();
  };
  const release = (e: ThreeEvent<PointerEvent>) => {
    if (drag.current === null) return;
    const angle = drag.current;
    drag.current = null;
    (e.target as unknown as Element).releasePointerCapture?.(e.pointerId);
    onRelease(angle);
  };
  const trackLength = 2 * span + 6;
  const motorX = -(span + 3) - 0.45;
  const dial = ((config.plateSpeed - 2) / 6) * Math.PI * 1.5 - Math.PI * 0.75;
  const cable = useMemo<Array<[number, number, number]>>(() => [
    [powerX - 0.8, BENCH_Y + 0.1, postZ + 0.1],
    [powerX - 1.4, BENCH_Y + 0.04, postZ * 0.7],
    [(powerX + motorX) / 2 - 0.5, BENCH_Y + 0.03, postZ * 0.4],
    [motorX + 0.2, BENCH_Y + 0.03, -0.5],
    [motorX + 0.1, 0.12, -0.2],
  ], [powerX, motorX, postZ]);
  return (
    <>
      <mesh receiveShadow position={[0, BENCH_Y - 0.25, 0]}><boxGeometry args={[trackLength + 18, 0.5, 2 * halfWidth + 11]} /><meshStandardMaterial map={wood} roughness={0.62} /></mesh>
      <RBox size={[trackLength, 0.25, 2 * halfWidth + 0.7]} radius={0.05} position={[0, -0.125, 0]}><meshStandardMaterial color={palette.track} roughness={0.7} metalness={0.2} /></RBox>
      {[1, -1].map((side) => <RBox key={side} size={[trackLength, 0.2, 0.14]} radius={0.05} position={[0, 0.1, side * (halfWidth + 0.17)]}><meshStandardMaterial color={palette.steel} metalness={0.55} roughness={0.42} /></RBox>)}
      {[1, -1].map((side) => <RBox key={side} size={[0.35, 0.34, 2 * halfWidth + 0.95]} radius={0.06} position={[side * (trackLength / 2), 0.05, 0]}><meshStandardMaterial color={palette.case} metalness={0.4} roughness={0.5} /></RBox>)}
      <group ref={plate}>
        <RBox size={[span + 3, PLATE_Y, 2 * halfWidth]} radius={0.03} position={[span / 2, PLATE_Y / 2, 0]}><meshStandardMaterial map={paper} roughness={0.4} /></RBox>
        {envelope.map((line, i) => <primitive key={i} object={line} />)}
        <mesh geometry={trace} frustumCulled={false}><meshBasicMaterial color={palette.trace} side={THREE.DoubleSide} /></mesh>
      </group>
      <Stand palette={palette} z={postZ} pivotY={pivotY} benchY={BENCH_Y} />
      <group ref={swing} position={[0, pivotY, 0]}>
        <mesh castShadow position={[0, -ld / 2, 0]}><cylinderGeometry args={[0.012, 0.012, ld, 8]} /><meshStandardMaterial color={palette.string} roughness={0.9} /></mesh>
        <mesh castShadow position={[0, -ld + 0.27, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.05, 0.014, 8, 16]} /><meshStandardMaterial color={palette.brass} metalness={0.55} roughness={0.42} /></mesh>
        <mesh castShadow position={[0, -ld, 0]}><sphereGeometry args={[0.26, 32, 20]} /><meshStandardMaterial color={palette.brass} metalness={0.55} roughness={0.35} /></mesh>
        <mesh position={[0, -ld, 0]} onPointerDown={grab} onPointerMove={move} onPointerUp={release} onPointerCancel={release}><sphereGeometry args={[0.65, 12, 8]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      </group>
      <mesh ref={collar} castShadow><cylinderGeometry args={[0.075, 0.075, 0.14, 20]} /><meshStandardMaterial color={palette.steel} metalness={0.55} roughness={0.42} /></mesh>
      <mesh ref={pen} castShadow><cylinderGeometry args={[0.032, 0.032, 1, 12]} /><meshStandardMaterial color={palette.trace} roughness={0.5} /></mesh>
      <mesh ref={nib} castShadow><sphereGeometry args={[0.045, 12, 8]} /><meshStandardMaterial color={palette.trace} /></mesh>
      <RBox size={[0.7, 0.5, 0.9]} radius={0.06} position={[motorX, 0.15, 0]}><meshStandardMaterial color={palette.case} metalness={0.3} roughness={0.5} /></RBox>
      <PowerBox palette={palette} position={[powerX, BENCH_Y + 0.375, postZ]} speedLabel={`${config.plateSpeed.toFixed(1)} cm/s`} dial={dial} />
      <Cable points={cable} color={palette.case} />
    </>
  );
});

function Refresh({ stamp }: { readonly stamp: number }) {
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [stamp, invalidate]);
  return null;
}

export type DampedSceneProps = Interaction & { readonly config: Config; readonly time: RefObject<number>; readonly running: boolean; readonly stamp: number; readonly lang: Lang };

function DampedScene({ config, time, running, stamp, lang, onGrab, onRelease }: DampedSceneProps) {
  const t = pick(lang);
  const { host, orbit, invalidate, handlers, reset, zoom } = useOrbit(HOME, LIMITS);
  const palette = usePalette(host, TOKENS);
  const labelEls = useMemo(() => ({ current: new Map<string, HTMLSpanElement>() }), []);
  const { ld, halfWidth, pivotY, span, postZ, powerX } = layout(config);
  const target = useMemo(() => new THREE.Vector3(-span * 0.3, pivotY * 0.42, 0), [pivotY, span]);
  const points = useMemo<Array<[string, THREE.Vector3]>>(() => [
    ['bob', new THREE.Vector3(0.9, pivotY - ld + 0.7, 0)],
    ['plate', new THREE.Vector3(-2.6, 0.3, halfWidth + 0.5)],
    ['power', new THREE.Vector3(powerX, 1.05, postZ)],
  ], [pivotY, ld, halfWidth, powerX, postZ]);
  const labels = [
    { key: 'bob', text: t({ vi: 'Vật nặng có bút dạ · kéo để thả', en: 'Bob with a felt pen · drag to release' }) },
    { key: 'plate', text: t({ vi: 'Tấm nhựa chuyển động đều', en: 'Plate moving at constant speed' }), tone: 'muted' as const },
    { key: 'power', text: t({ vi: 'Nguồn điện', en: 'Power supply' }), tone: 'muted' as const },
  ];
  const description = t({ vi: 'Bộ thí nghiệm 3D: con lắc đơn có bút dạ ở vật nặng vẽ đồ thị dao động tắt dần trên tấm nhựa chuyển động đều; nét đứt là đường bao biên độ.', en: '3D setup: a simple pendulum with a felt pen on the bob draws its damped oscillation on a plate moving at constant speed; the dashed lines mark the amplitude envelope.' });
  return (
    <div className="flex flex-col gap-3">
      <div ref={host} {...handlers} role="img" aria-label={description} tabIndex={0} className={`${VIEW_CLASS} ${styles.stage}`}>
        {palette && <Canvas shadows="basic" dpr={[1, 1.5]} frameloop={running ? 'always' : 'demand'} camera={{ fov: 42, near: 0.1, far: 90 }} gl={{ antialias: true }}>
          <color attach="background" args={[palette.background]} />
          <hemisphereLight args={[palette.string, palette.benchDark, 1.1]} />
          <directionalLight position={[-5, 11, 7]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={11} shadow-camera-bottom={-11} shadow-bias={-0.0006} shadow-normalBias={0.03} />
          <Experiment config={config} time={time} palette={palette} onGrab={onGrab} onRelease={onRelease} />
          <Rig orbit={orbit} target={target} labels={labelEls} points={points} onInvalidate={(fn) => { invalidate.current = fn; }} />
          <Refresh stamp={stamp} />
        </Canvas>}
        <LabelLayer labels={labels} store={labelEls} />
      </div>
      <ViewButtons lang={lang} onReset={reset} onZoom={zoom} />
      <p className="text-xs text-ink-muted">{t({ vi: 'Kéo để xoay · Chụm hai ngón hoặc Ctrl + cuộn để zoom · Phím mũi tên, + / −, Home khi chọn khung 3D.', en: 'Drag to rotate · Pinch or Ctrl + wheel to zoom · Arrow keys, + / −, Home while the 3D view is focused.' })}</p>
    </div>
  );
}

export default memo(DampedScene);
