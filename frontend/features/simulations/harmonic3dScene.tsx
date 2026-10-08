'use client';

import { memo, useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SimulationConfigByKind } from '@scipal/types';
import { harmonicDisplayRadius, harmonicState } from './engines/harmonic';
import { Arrow, Ball, ChalkText, RadialRod } from './harmonic3dMeshes';
import { Rig, useOrbit, usePalette, ViewButtons, VIEW_CLASS } from './scene3d';
import { pick, type Lang } from './types';
import styles from './harmonic3d.module.css';

const TOKENS = { background: '--harmonic-background', board: '--harmonic-board', frame: '--harmonic-frame', chalk: '--harmonic-chalk', velocity: '--harmonic-velocity', projection: '--harmonic-projection', acceleration: '--harmonic-acceleration', x: '--harmonic-x', y: '--harmonic-y', label: '--harmonic-label', rotation: '--harmonic-rotation' } as const;
type Palette = Record<keyof typeof TOKENS, string>;
type Config = SimulationConfigByKind['harmonic-3d'];
const HOME = { theta: -Math.PI / 2 - 0.06, phi: 0.055, dist: 10.2 };
const LIMITS = { min: 6.8, max: 19 };
const TARGET = new THREE.Vector3(0, 0.35, 0);
const EMPTY_POINTS: Array<[string, THREE.Vector3]> = [];

function Diagram({ config, time, palette, lang }: { readonly config: Config; readonly time: RefObject<number>; readonly palette: Palette; readonly lang: Lang }) {
  const radius = harmonicDisplayRadius(config.amplitude);
  const m = useRef<THREE.Group>(null);
  const p = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const label = useRef<THREE.Group>(null);
  const projection = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const s = harmonicState(config, time.current);
    angle.current = s.angle;
    const x = radius * Math.cos(s.angle);
    const y = radius * Math.sin(s.angle);
    m.current?.position.set(x, y, 0.25);
    p.current?.position.set(x, 0, 0.26);
    label.current?.position.set(x + 0.25, y + 0.3, 0);
    if (projection.current) {
      projection.current.position.set(x, y / 2, 0.2);
      projection.current.scale.y = Math.max(Math.abs(y), 0.001);
    }
  }, -1);
  const t = pick(lang);
  const vector = (which: 'v' | 'a') => {
    const s = harmonicState(config, time.current);
    return { x: radius * Math.cos(s.angle), y: 0, dx: which === 'v' ? -1.05 * Math.sin(s.angle) : -0.8 * Math.cos(s.angle), dy: 0 };
  };
  return (
    <group position={[0, -0.15, 0]}>
      <mesh castShadow position={[0, 0, 0.16]}><torusGeometry args={[radius, 0.023, 12, 160]} /><meshStandardMaterial color={palette.chalk} /></mesh>
      <RadialRod angle={angle} color={palette.chalk} radius={radius} />
      <mesh ref={projection}><cylinderGeometry args={[0.007, 0.007, 1, 8]} /><meshBasicMaterial color={palette.chalk} transparent opacity={0.45} /></mesh>
      <group ref={m}><Ball color={palette.velocity} /></group>
      <group ref={p}><Ball color={palette.projection} /></group>
      <group ref={label}><ChalkText text="M" color={palette.label} size={0.32} position={[0, 0, 0.28]} /></group>
      <Arrow color={palette.x} depth={0.18} sample={() => ({ x: -2.25, y: 0, dx: 4.65, dy: 0 })} />
      <Arrow color={palette.velocity} depth={0.43} sample={() => vector('v')} />
      <Arrow color={palette.acceleration} depth={0.48} sample={() => vector('a')} />
      {Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[0, -2 + i * 0.23, 0.13]}><boxGeometry args={[0.027, 0.12, 0.035]} /><meshBasicMaterial color={palette.y} /></mesh>)}
      <Arrow color={palette.y} sample={() => ({ x: 0, y: 1.8, dx: 0, dy: 0.32 })} />
      <ChalkText text="O" color={palette.label} position={[-0.25, -0.32, 0.26]} />
      <MovingProjectionLabel time={time} config={config} color={palette.label} />
      <ChalkText text="x" color={palette.x} size={0.32} position={[2.4, -0.3, 0.2]} />
      <ChalkText text="y" color={palette.y} position={[0.25, 2.06, 0.2]} />
      <mesh position={[0, 0, 0.19]}><torusGeometry args={[radius + 0.4, 0.025, 8, 48, Math.PI / 3]} /><meshBasicMaterial color={palette.rotation} /></mesh>
      <Arrow color={palette.rotation} sample={() => ({ x: (radius + 0.4) / 2, y: (radius + 0.4) * Math.sin(Math.PI / 3), dx: -0.22, dy: 0.13 })} />
      <ChalkText text="+" color={palette.x} size={0.3} position={[1.75, 1.4, 0.23]} />
      <Arrow color={palette.velocity} sample={() => ({ x: 1.65, y: -1.75, dx: 0.6, dy: 0 })} />
      <Arrow color={palette.acceleration} sample={() => ({ x: 1.65, y: -2.08, dx: 0.6, dy: 0 })} />
      <ChalkText text={t({ vi: 'vectơ vận tốc', en: 'velocity vector' })} color={palette.chalk} size={0.15} position={[3.03, -1.75, 0.3]} />
      <ChalkText text={t({ vi: 'vectơ gia tốc', en: 'acceleration vector' })} color={palette.chalk} size={0.15} position={[3.03, -2.08, 0.3]} />
    </group>
  );
}

function MovingProjectionLabel({ time, config, color }: { readonly time: RefObject<number>; readonly config: Config; readonly color: string }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => { group.current?.position.set(harmonicDisplayRadius(config.amplitude) * Math.cos(harmonicState(config, time.current).angle), -0.42, 0); });
  return <group ref={group}><ChalkText text="P" color={color} position={[0, 0, 0.26]} /></group>;
}

function Refresh({ stamp }: { readonly stamp: number }) {
  const { invalidate } = useThree();
  useEffect(() => invalidate(), [stamp, invalidate]);
  return null;
}

function FitBoard() {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(size.height, 1);
    camera.fov = 2 * Math.atan(Math.tan(21 * Math.PI / 180) * Math.max(1, 1.25 / aspect)) * 180 / Math.PI;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, invalidate]);
  return null;
}

export type HarmonicSceneProps = { readonly config: Config; readonly time: RefObject<number>; readonly running: boolean; readonly stamp: number; readonly lang: Lang };

function HarmonicScene({ config, time, running, stamp, lang }: HarmonicSceneProps) {
  const t = pick(lang);
  const { host, orbit, invalidate, handlers, reset, zoom } = useOrbit(HOME, LIMITS);
  const palette = usePalette(host, TOKENS);
  const labels = useMemo(() => ({ current: new Map<string, HTMLSpanElement>() }), []);
  const description = t({ vi: 'Bảng 3D: M chuyển động tròn, P là hình chiếu lên Ox. Vectơ vận tốc màu vàng, gia tốc màu xanh.', en: '3D board: M moves in a circle, P is its projection on Ox. Velocity is yellow; acceleration is green.' });
  return (
    <div className="flex flex-col gap-3">
      <div ref={host} {...handlers} role="img" aria-label={description} tabIndex={0} className={`${VIEW_CLASS} ${styles.stage}`}>
        {palette && <Canvas shadows dpr={[1, 1.5]} frameloop={running ? 'always' : 'demand'} camera={{ fov: 42, near: 0.1, far: 60 }} gl={{ antialias: true }}>
          <color attach="background" args={[palette.background]} />
          <ambientLight intensity={1.4} />
          <directionalLight position={[-3, 6, 8]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-0.001} />
          <mesh receiveShadow position={[0, 0, -0.13]}><boxGeometry args={[8.4, 5.1, 0.22]} /><meshStandardMaterial color={palette.board} roughness={0.9} /></mesh>
          {[-2.6, 2.6].map((y) => <mesh key={y} castShadow position={[0, y, 0.02]}><boxGeometry args={[8.7, 0.15, 0.24]} /><meshStandardMaterial color={palette.frame} metalness={0.45} roughness={0.5} /></mesh>)}
          <ChalkText text={t({ vi: 'MÔ PHỎNG HƯỚNG CỦA GIA TỐC VÀ VẬN TỐC', en: 'ACCELERATION AND VELOCITY DIRECTIONS' })} color={palette.chalk} size={0.29} position={[0, 3.35, 0]} />
          <Diagram config={config} time={time} palette={palette} lang={lang} />
          <FitBoard />
          <Rig orbit={orbit} target={TARGET} labels={labels} points={EMPTY_POINTS} onInvalidate={(fn) => { invalidate.current = fn; }} />
          <Refresh stamp={stamp} />
        </Canvas>}
      </div>
      <ViewButtons lang={lang} onReset={reset} onZoom={zoom} />
      <p className="text-xs text-ink-muted">{t({ vi: 'Kéo ngang để xoay · Chụm hai ngón hoặc Ctrl + cuộn để zoom · Phím mũi tên, + / −, Home khi chọn bảng.', en: 'Drag sideways to rotate · Pinch or Ctrl + wheel to zoom · Arrow keys, + / −, Home while the board is focused.' })}</p>
    </div>
  );
}

export default memo(HarmonicScene);
