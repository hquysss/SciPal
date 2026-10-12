'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cardiacState, type CardiacState } from './engines/circulation';
import type { Point3 } from './kneeReflexParts';

// A teaching diagram of the heart seen from the front, as in the textbook figure: the right heart
// (blue blood) on the viewer's left, the left heart (red blood) on the right. Chambers squeeze in
// turn, the valves open and close with the phases, blood waits behind a closed valve, and the
// electrical impulse runs through the conduction system.

export type HeartPalette = Readonly<Record<'artery' | 'vein' | 'wall' | 'muscle' | 'septum' | 'valve' | 'signal' | 'white', string>>;
export type HeartLayer = 'flow' | 'conduction';
type Clock = { readonly time: RefObject<number>; readonly heartRate: number };

const CHAMBERS = {
  rightAtrium: { at: [-0.82, 0.78, 0] as Point3, size: [0.62, 0.52, 0.48] as Point3, blood: 'vein', squeeze: 'atria' },
  leftAtrium: { at: [0.78, 0.86, -0.12] as Point3, size: [0.58, 0.48, 0.44] as Point3, blood: 'artery', squeeze: 'atria' },
  rightVentricle: { at: [-0.58, -0.55, 0.12] as Point3, size: [0.66, 0.92, 0.5] as Point3, blood: 'vein', squeeze: 'ventricles' },
  leftVentricle: { at: [0.58, -0.62, 0] as Point3, size: [0.72, 1.05, 0.56] as Point3, blood: 'artery', squeeze: 'ventricles' },
} as const;

const vectors = (points: readonly Point3[]) => points.map((p) => new THREE.Vector3(...p));
const VESSELS: ReadonlyArray<{ readonly blood: 'artery' | 'vein'; readonly radius: number; readonly points: readonly Point3[] }> = [
  { blood: 'vein', radius: 0.16, points: [[-0.98, 2.8, 0], [-0.94, 1.9, 0], [-0.86, 1.2, 0.02]] },
  { blood: 'vein', radius: 0.17, points: [[-1.05, -2.4, -0.42], [-1.02, -0.9, -0.38], [-0.96, 0.32, -0.12]] },
  { blood: 'vein', radius: 0.15, points: [[-0.12, 0.42, 0.36], [-0.06, 1.3, 0.4], [0, 1.72, 0.36]] },
  { blood: 'vein', radius: 0.11, points: [[0, 1.72, 0.36], [-0.8, 1.92, 0.26], [-2.0, 1.86, 0.1]] },
  { blood: 'vein', radius: 0.11, points: [[0, 1.72, 0.36], [0.8, 1.96, 0.26], [2.0, 1.86, 0.1]] },
  { blood: 'artery', radius: 0.17, points: [[0.16, 0.36, 0], [0.15, 1.3, -0.06], [0.36, 2.26, -0.26], [0.86, 2.1, -0.56], [0.96, 0.5, -0.72], [0.96, -2.4, -0.72]] },
  { blood: 'artery', radius: 0.1, points: [[-2.0, 1.1, -0.42], [-1.2, 1.06, -0.46], [-0.55, 1.0, -0.42], [0.35, 0.95, -0.25]] },
  { blood: 'artery', radius: 0.1, points: [[2.0, 1.12, -0.36], [1.5, 1.02, -0.26], [1.2, 0.95, -0.18]] },
];

// Each route runs from a vein to an artery. `ring` is the atrioventricular valve, `exit` the arterial
// valve; blood waits behind whichever is closed.
type RouteSpec = { readonly blood: 'artery' | 'vein'; readonly points: readonly Point3[]; readonly enter: number; readonly ring: number; readonly exit: number };
const RIGHT_TAIL: Point3[] = [[-0.68, 0.16, 0.08], [-0.62, -0.62, 0.14], [-0.44, -1.06, 0.2], [-0.22, -0.4, 0.3], [-0.12, 0.42, 0.36], [-0.06, 1.3, 0.4], [0, 1.72, 0.36]];
const LEFT_TAIL: Point3[] = [[0.64, 0.16, 0], [0.62, -0.7, 0.04], [0.42, -1.28, 0.08], [0.16, -0.42, 0.04], [0.16, 0.36, 0], [0.15, 1.3, -0.06], [0.36, 2.26, -0.26], [0.86, 2.1, -0.56], [0.96, 0.5, -0.72], [0.96, -2.4, -0.72]];
const ROUTES: readonly RouteSpec[] = [
  { blood: 'vein', points: [[-0.98, 2.8, 0], [-0.94, 1.9, 0], [-0.86, 1.2, 0.02], [-0.8, 0.72, 0.06], ...RIGHT_TAIL, [-0.8, 1.92, 0.26], [-2.0, 1.86, 0.1]], enter: 2, ring: 4, exit: 8 },
  { blood: 'vein', points: [[-1.05, -2.4, -0.42], [-1.02, -0.9, -0.38], [-0.96, 0.32, -0.12], [-0.84, 0.66, 0.02], ...RIGHT_TAIL, [0.8, 1.96, 0.26], [2.0, 1.86, 0.1]], enter: 2, ring: 4, exit: 8 },
  { blood: 'artery', points: [[-2.0, 1.1, -0.42], [-1.2, 1.06, -0.46], [-0.55, 1.0, -0.42], [0.35, 0.95, -0.25], [0.66, 0.9, -0.12], ...LEFT_TAIL], enter: 3, ring: 5, exit: 9 },
  { blood: 'artery', points: [[2.0, 1.12, -0.36], [1.5, 1.02, -0.26], [1.2, 0.95, -0.18], [0.82, 0.88, -0.1], ...LEFT_TAIL], enter: 2, ring: 4, exit: 8 },
];

const CONDUCTION: Readonly<Record<'atria' | 'his' | 'left' | 'right', readonly Point3[]>> = {
  atria: [[-0.86, 1.22, 0.32], [-0.3, 1.0, 0.34], [0.4, 1.02, 0.3], [0.9, 0.9, 0.3]],
  his: [[-0.16, 0.3, 0.3], [0, -0.05, 0.3], [0, -0.45, 0.3]],
  left: [[0, -0.45, 0.3], [0.18, -1.15, 0.36], [0.62, -1.36, 0.36], [1.02, -0.86, 0.32], [1.14, -0.2, 0.28]],
  right: [[0, -0.45, 0.3], [-0.16, -1.05, 0.4], [-0.6, -1.2, 0.42], [-1.0, -0.8, 0.38], [-1.08, -0.2, 0.32]],
};
export const SINOATRIAL: Point3 = [-0.86, 1.22, 0.32];
export const ATRIOVENTRICULAR: Point3 = [-0.16, 0.3, 0.3];

export const HEART_ANCHORS = {
  rightAtrium: { point: [-0.9, 0.82, 0.42], label: [-2.25, 0.95, 0.3] },
  rightVentricle: { point: [-0.75, -0.7, 0.5], label: [-2.2, -0.75, 0.3] },
  leftAtrium: { point: [1.0, 0.84, 0.28], label: [2.3, 0.5, 0.3] },
  leftVentricle: { point: [0.85, -0.75, 0.48], label: [2.25, -0.85, 0.3] },
  tricuspid: { point: [-0.68, 0.16, 0.3], label: [-2.2, 0.1, 0.4] },
  mitral: { point: [0.64, 0.16, 0.3], label: [2.25, -0.05, 0.4] },
  pulmonaryValve: { point: [-0.12, 0.42, 0.5], label: [-1.05, -1.75, 0.8] },
  aorticValve: { point: [0.16, 0.36, 0.18], label: [1.15, -1.95, 0.8] },
  aorta: { point: [0.6, 2.26, -0.4], label: [1.55, 2.75, 0] },
  pulmonaryArtery: { point: [-0.5, 1.86, 0.3], label: [-0.95, 2.75, 0.3] },
  venaCava: { point: [-0.97, 2.3, 0.1], label: [-2.3, 2.3, 0.2] },
  pulmonaryVeins: { point: [1.6, 1.06, -0.3], label: [2.4, 1.5, 0] },
  sinoatrial: { point: SINOATRIAL, label: [-2.25, 1.65, 0.4] },
  atrioventricular: { point: ATRIOVENTRICULAR, label: [-2.0, -0.2, 0.6] },
  his: { point: [0, -0.3, 0.3], label: [-0.2, -2.05, 0.8] },
  purkinje: { point: [1.02, -0.86, 0.32], label: [2.25, -1.45, 0.4] },
} as const satisfies Record<string, { point: Point3; label: Point3 }>;
export const FLOW_LABELS = ['rightAtrium', 'rightVentricle', 'leftAtrium', 'leftVentricle', 'tricuspid', 'mitral', 'pulmonaryValve', 'aorticValve', 'aorta', 'pulmonaryArtery', 'venaCava', 'pulmonaryVeins'] as const;
export const CONDUCTION_LABELS = ['rightAtrium', 'rightVentricle', 'leftAtrium', 'leftVentricle', 'sinoatrial', 'atrioventricular', 'his', 'purkinje'] as const;

function Chamber({ name, palette, clock }: { readonly name: keyof typeof CHAMBERS; readonly palette: HeartPalette; readonly clock: Clock }) {
  const spec = CHAMBERS[name];
  const group = useRef<THREE.Group>(null);
  const thick = name === 'leftVentricle' ? 1.18 : name === 'rightVentricle' ? 1.1 : 1.06;
  useFrame(() => {
    const squeeze = cardiacState(clock.time.current, clock.heartRate)[spec.squeeze];
    group.current?.scale.setScalar(1 - squeeze * (spec.squeeze === 'ventricles' ? 0.13 : 0.1));
  });
  return <group ref={group} position={[...spec.at]}>
    <mesh scale={[spec.size[0] * thick, spec.size[1] * thick, spec.size[2] * thick]}>
      <sphereGeometry args={[1, 40, 28]} />
      <meshStandardMaterial color={palette.wall} roughness={0.55} transparent opacity={0.26} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh scale={[...spec.size]}>
      <sphereGeometry args={[1, 40, 28]} />
      <meshStandardMaterial color={palette[spec.blood]} roughness={0.5} transparent opacity={0.3} depthWrite={false} />
    </mesh>
  </group>;
}

function Vessel({ points, radius, color }: { readonly points: readonly Point3[]; readonly radius: number; readonly color: string }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(vectors(points)), [points]);
  return <mesh><tubeGeometry args={[curve, 64, radius, 16, false]} /><meshStandardMaterial color={color} roughness={0.45} transparent opacity={0.38} depthWrite={false} /></mesh>;
}

/** A valve: leaflets hinged on a ring that swing into the flow when open and lie flat when shut. */
function Valve({ at, tilt = 0, width, palette, clock, kind }: { readonly at: Point3; readonly tilt?: number; readonly width: number; readonly palette: HeartPalette; readonly clock: Clock; readonly kind: 'atrioventricular' | 'semilunar' }) {
  const leaves = useRef<Array<THREE.Group | null>>([]);
  const angle = useRef(0);
  const last = useRef(0);
  useFrame(() => {
    const state = cardiacState(clock.time.current, clock.heartRate);
    const open = kind === 'atrioventricular' ? state.atrioventricularOpen : state.semilunarOpen;
    const dt = Math.min(0.1, Math.abs(clock.time.current - last.current));
    last.current = clock.time.current;
    const target = open ? 1 : 0;
    angle.current += (target - angle.current) * (dt === 0 ? 1 : Math.min(1, dt * 40));
    // Atrioventricular leaflets swing down into the ventricle, arterial ones up into the artery.
    const swing = angle.current * 1.25 * (kind === 'atrioventricular' ? 1 : -1);
    leaves.current.forEach((leaf, i) => { if (leaf) leaf.rotation.z = (i === 0 ? -1 : 1) * swing; });
  });
  const half = width / 2;
  return <group position={[...at]} rotation={[0, 0, tilt]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[half, 0.025, 8, 32]} /><meshStandardMaterial color={palette.valve} roughness={0.6} /></mesh>
    {[-1, 1].map((side, i) => (
      <group key={side} position={[side * half, 0, 0]} ref={(el) => { leaves.current[i] = el; }}>
        <mesh position={[-side * half / 2, 0, 0]}><boxGeometry args={[half, 0.03, width * 0.8]} /><meshStandardMaterial color={palette.valve} roughness={0.6} /></mesh>
      </group>
    ))}
  </group>;
}

type Particle = { s: number; offset: THREE.Vector3 };
const COUNT = 34;
/** Blood cells moving along their route at the pace each phase allows. */
function Blood({ route, color, clock }: { readonly route: RouteSpec; readonly color: string; readonly clock: Clock }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(vectors(route.points));
    const length = curve.getLength();
    const mark = (index: number) => {
      const target = new THREE.Vector3(...route.points[index]!);
      let best = 0;
      let distance = Infinity;
      for (let i = 0; i <= 600; i++) { const d = curve.getPointAt(i / 600).distanceTo(target); if (d < distance) { distance = d; best = i / 600; } }
      return best;
    };
    const random = (i: number) => { const x = Math.sin(i * 12.9898 + route.points.length * 78.233) * 43758.5453; return x - Math.floor(x); };
    const particles: Particle[] = Array.from({ length: COUNT }, (_, i) => ({ s: i / COUNT, offset: new THREE.Vector3(random(i) - 0.5, random(i + 40) - 0.5, random(i + 80) - 0.5).multiplyScalar(2) }));
    return { curve, length, enter: mark(route.enter), ring: mark(route.ring), exit: mark(route.exit), particles };
  }, [route]);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const last = useRef<number | null>(null);
  useFrame(() => {
    const now = clock.time.current;
    const dt = last.current === null ? 0 : Math.min(0.1, Math.max(0, now - last.current));
    last.current = now;
    const state: CardiacState = cardiacState(now, clock.heartRate);
    const gap = 0.012;
    for (const p of data.particles) {
      let speed: number;
      let stop = Infinity;
      if (p.s < data.ring) {
        speed = p.s < data.enter ? 1 : state.phase === 'atrial' ? 2.4 : 1.2;
        if (!state.atrioventricularOpen) stop = data.ring - gap;
      } else if (p.s < data.exit) {
        speed = state.semilunarOpen ? 5 : 0.9;
        if (!state.semilunarOpen) stop = data.exit - gap;
      } else speed = 2.6;
      if (p.s < stop) p.s = Math.min(stop, p.s + (speed * dt) / data.length);
      if (p.s >= 1) p.s -= 1;
    }
    data.particles.forEach((p, i) => {
      data.curve.getPointAt(Math.max(0, Math.min(1, p.s)), point);
      const spread = p.s > data.enter && p.s < data.exit ? 0.2 : 0.05;
      point.addScaledVector(p.offset, spread);
      matrix.makeTranslation(point.x, point.y, point.z);
      mesh.current?.setMatrixAt(i, matrix);
    });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
    <sphereGeometry args={[0.055, 12, 8]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.4} />
  </instancedMesh>;
}

/** A conduction pathway that lights up where the impulse is. */
function Pathway({ points, color, progress }: { readonly points: readonly Point3[]; readonly color: string; readonly progress: () => number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(vectors(points)), [points]);
  const uniforms = useMemo(() => ({ tone: { value: new THREE.Color(color) }, progress: { value: -1 } }), [color]);
  useFrame(() => { uniforms.progress.value = progress(); });
  return <mesh><tubeGeometry args={[curve, 64, 0.028, 8, false]} /><shaderMaterial uniforms={uniforms} toneMapped={false}
    vertexShader={'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
    fragmentShader={'uniform vec3 tone; uniform float progress; varying vec2 vUv; void main(){float lit=step(0.0,progress)*(smoothstep(progress-0.25,progress,vUv.x)*step(vUv.x,progress+0.02)+0.35*step(vUv.x,progress)); gl_FragColor=vec4(mix(tone*0.4,vec3(1.0),clamp(lit,0.0,1.0)),1.0);\n#include <colorspace_fragment>\n}'}
  /></mesh>;
}

function Node({ at, color, active }: { readonly at: Point3; readonly color: string; readonly active: () => number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const value = active();
    if (mesh.current) mesh.current.scale.setScalar(value >= 0 ? 1.5 : 1);
  });
  return <mesh ref={mesh} position={[...at]}><sphereGeometry args={[0.07, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>;
}

export function CirculationHeart({ palette, time, heartRate, layer }: { readonly palette: HeartPalette; readonly time: RefObject<number>; readonly heartRate: number; readonly layer: HeartLayer }) {
  const clock = useMemo(() => ({ time, heartRate }), [time, heartRate]);
  const conduction = () => cardiacState(time.current, heartRate).conduction;
  return <group>
    {(Object.keys(CHAMBERS) as Array<keyof typeof CHAMBERS>).map((name) => <Chamber key={name} name={name} palette={palette} clock={clock} />)}
    <mesh position={[0, -0.25, 0.04]} rotation={[0, 0, 0.06]}><boxGeometry args={[0.12, 2.5, 0.8]} /><meshStandardMaterial color={palette.septum} roughness={0.7} transparent opacity={0.55} /></mesh>
    {VESSELS.map((vessel, i) => <Vessel key={i} points={vessel.points} radius={vessel.radius} color={palette[vessel.blood]} />)}
    <Valve at={[-0.68, 0.16, 0.08]} width={0.5} palette={palette} clock={clock} kind="atrioventricular" />
    <Valve at={[0.64, 0.16, 0]} width={0.48} palette={palette} clock={clock} kind="atrioventricular" />
    <Valve at={[-0.12, 0.42, 0.36]} width={0.3} palette={palette} clock={clock} kind="semilunar" />
    <Valve at={[0.16, 0.36, 0]} width={0.32} palette={palette} clock={clock} kind="semilunar" />
    {layer === 'flow' && ROUTES.map((route, i) => <Blood key={i} route={route} color={palette[route.blood]} clock={clock} />)}
    {layer === 'conduction' && <group>
      <Pathway points={CONDUCTION.atria} color={palette.signal} progress={() => conduction().atria} />
      <Pathway points={CONDUCTION.his} color={palette.signal} progress={() => conduction().his} />
      <Pathway points={CONDUCTION.left} color={palette.signal} progress={() => conduction().purkinje} />
      <Pathway points={CONDUCTION.right} color={palette.signal} progress={() => conduction().purkinje} />
      <Node at={SINOATRIAL} color={palette.signal} active={() => conduction().sinoatrial} />
      <Node at={ATRIOVENTRICULAR} color={palette.signal} active={() => conduction().atrioventricular} />
    </group>}
  </group>;
}
