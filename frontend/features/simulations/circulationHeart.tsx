'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { cardiacState } from './engines/circulation';
import { HEART_PART_PLACES, type HeartGroup } from './circulationHeartParts';
import type { HeartPart } from './circulationCopy';
import type { Point3 } from './kneeReflexParts';

// The heart from real anatomy (public/models/circulation/heart.glb): the four chambers squeeze in turn,
// the leaflets of the four valves part and close with the phases, blood cells wait behind a closed
// valve, and the electrical impulse runs through the conduction system.

export type HeartPalette = Readonly<Record<'artery' | 'vein' | 'wall' | 'muscle' | 'septum' | 'valve' | 'signal' | 'white', string>>;
export type HeartLayer = 'flow' | 'conduction';
type Clock = { readonly time: RefObject<number>; readonly heartRate: number };

const decoder = new DRACOLoader().setDecoderPath('/models/draco/').setWorkerLimit(2);
/** The descending aorta and the inferior vena cava run far below the heart; they fade out here. */
const FADE = { low: -3.4, high: -1.9 };
const NL = String.fromCharCode(10);
function fadeBelow(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', ['#include <common>', 'varying float vBelow;'].join(NL))
      .replace('#include <begin_vertex>', ['#include <begin_vertex>', 'vec4 belowPoint = vec4(transformed, 1.0);', '#ifdef USE_INSTANCING', 'belowPoint = instanceMatrix * belowPoint;', '#endif', 'vBelow = (modelMatrix * belowPoint).y;'].join(NL));
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', ['#include <common>', 'varying float vBelow;'].join(NL))
      .replace('#include <dithering_fragment>', ['#include <dithering_fragment>', `gl_FragColor.a *= smoothstep(${FADE.low.toFixed(1)}, ${FADE.high.toFixed(1)}, vBelow);`].join(NL));
  };
}

const part = (name: string) => HEART_PART_PLACES[`${name}.001`] ?? HEART_PART_PLACES[name]!;
const middleOf = (group: HeartGroup): Point3 => {
  const list = Object.values(HEART_PART_PLACES).filter((p) => p.group === group);
  return [0, 1, 2].map((axis) => list.reduce((sum, p) => sum + p.at[axis]!, 0) / list.length) as unknown as Point3;
};
const mix = (a: Point3, b: Point3, amount: number): Point3 => [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount];
const clipped = (p: Point3): Point3 => [p[0], Math.max(p[1], FADE.low + 0.1), p[2]];

const BLUE: ReadonlySet<HeartGroup> = new Set<HeartGroup>(['rightAtrium', 'rightVentricle', 'pulmonaryTrunk', 'superiorVenaCava', 'inferiorVenaCava']);
const TRICUSPID = middleOf('tricuspid');
const MITRAL = middleOf('mitral');
const AORTIC = middleOf('aorticValve');
const PULMONARY = middleOf('pulmonaryValve');
const RA = part('Right atrium');
const RV = part('Right ventricle');
const LA = part('Left atrium');
const LV = part('Left ventricle');

// Where the impulse starts, pauses, and spreads (placed relative to the chambers of the model).
const SINOATRIAL: Point3 = mix(RA.at, part('Superior vena cava').at, 0.45);
const ATRIOVENTRICULAR: Point3 = (() => { const p = mix(TRICUSPID, MITRAL, 0.3); return [p[0], p[1] + 0.35, p[2]] as Point3; })();
const APEX: Point3 = [(RV.at[0] + LV.at[0]) / 2, Math.min(RV.min[1], LV.min[1]) + 0.3, (RV.at[2] + LV.at[2]) / 2];
const HIS_END: Point3 = mix(ATRIOVENTRICULAR, APEX, 0.45);
const wall = (v: typeof LV): Point3 => { const side = Math.sign(v.at[0] - HIS_END[0]); return [v.at[0] + side * (v.max[0] - v.min[0]) * 0.32, v.at[1] + (v.max[1] - v.min[1]) * 0.15, v.at[2] + (v.max[2] - v.min[2]) * 0.2]; };
const CONDUCTION: Readonly<Record<'atria' | 'his' | 'left' | 'right', readonly Point3[]>> = {
  atria: [SINOATRIAL, RA.at, mix(RA.at, LA.at, 0.5), LA.at],
  his: [ATRIOVENTRICULAR, HIS_END],
  left: [HIS_END, [APEX[0] + (LV.at[0] - APEX[0]) * 0.4, APEX[1], APEX[2]], wall(LV)],
  right: [HIS_END, [APEX[0] + (RV.at[0] - APEX[0]) * 0.4, APEX[1], APEX[2]], wall(RV)],
};

const label = (point: Point3, x: number, y: number): { point: Point3; label: Point3 } => ({ point, label: [x, y, point[2] + 0.6] });
export const HEART_ANCHORS: Record<HeartPart, { readonly point: Point3; readonly label: Point3 }> = {
  venaCava: label(part('Superior vena cava').at, -4.2, 3.2),
  sinoatrial: label(SINOATRIAL, -4.2, 2.5),
  rightAtrium: label(RA.at, -4.2, 1.4),
  tricuspid: label(TRICUSPID, -4.2, 0.3),
  atrioventricular: label(ATRIOVENTRICULAR, -4.2, 0.3),
  rightVentricle: label(RV.at, -4.2, -0.8),
  pulmonaryValve: label(PULMONARY, -4.2, -1.9),
  his: label(HIS_END, -4.2, -1.9),
  aorta: label(part('Aortic arch').at, 4.2, 3.2),
  pulmonaryArtery: label(part('Pulmonary trunk').at, 4.2, 2.3),
  pulmonaryVeins: label(part('Left superior pulmonary vein').at, 4.2, 1.4),
  leftAtrium: label(LA.at, 4.2, 0.5),
  mitral: label(MITRAL, 4.2, -0.4),
  leftVentricle: label(LV.at, 4.2, -1.3),
  aorticValve: label(AORTIC, 4.2, -2.2),
  purkinje: label(CONDUCTION.left[2]!, 4.2, -2.2),
};
export const FLOW_LABELS = ['venaCava', 'rightAtrium', 'tricuspid', 'rightVentricle', 'pulmonaryValve', 'aorta', 'pulmonaryArtery', 'pulmonaryVeins', 'leftAtrium', 'mitral', 'leftVentricle', 'aorticValve'] as const;
export const CONDUCTION_LABELS = ['sinoatrial', 'rightAtrium', 'atrioventricular', 'his', 'rightVentricle', 'leftAtrium', 'leftVentricle', 'purkinje'] as const;

type Shape = { readonly object: THREE.Object3D; readonly group: HeartGroup; readonly base: THREE.Vector3; readonly outward: THREE.Vector3 };

function Model({ palette, clock }: { readonly palette: HeartPalette; readonly clock: Clock }) {
  const gltf = useLoader(GLTFLoader, '/models/circulation/heart.glb', (loader) => { loader.setDRACOLoader(decoder); });
  const opening = useRef(new Map<HeartGroup, number>());
  const last = useRef(0);
  const { instance, shapes } = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const list: Shape[] = [];
    const centres = new Map<HeartGroup, THREE.Vector3>();
    for (const group of ['tricuspid', 'mitral', 'aorticValve', 'pulmonaryValve'] as const) centres.set(group, new THREE.Vector3(...middleOf(group)));
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const group = object.userData.group as HeartGroup;
      const blue = BLUE.has(group);
      const colour = new THREE.Color(blue ? palette.vein : palette.artery);
      let material: THREE.MeshStandardMaterial;
      if (group === 'rightAtrium' || group === 'rightVentricle' || group === 'leftAtrium' || group === 'leftVentricle') {
        material = new THREE.MeshStandardMaterial({ color: colour.lerp(new THREE.Color(palette.wall), 0.18), roughness: 0.55, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
      } else if (group === 'tricuspid' || group === 'mitral' || group === 'aorticValve' || group === 'pulmonaryValve') {
        material = new THREE.MeshStandardMaterial({ color: palette.valve, roughness: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(palette.valve), emissiveIntensity: 0.12 });
      } else if (group === 'coronary') {
        material = new THREE.MeshStandardMaterial({ color: palette.artery, roughness: 0.5, transparent: true, opacity: 0.5, depthWrite: false });
      } else {
        material = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.5, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide });
        fadeBelow(material);
      }
      object.material = material;
      const valve = centres.get(group);
      list.push({ object, group, base: object.position.clone(), outward: valve ? object.position.clone().sub(valve).normalize() : new THREE.Vector3() });
    });
    return { instance: scene, shapes: list };
  }, [gltf.scene, palette]);
  useFrame(() => {
    const now = clock.time.current;
    const dt = Math.min(0.1, Math.abs(now - last.current));
    last.current = now;
    const state = cardiacState(now, clock.heartRate);
    const follow = dt === 0 ? 1 : Math.min(1, dt * 40);
    for (const group of ['tricuspid', 'mitral', 'aorticValve', 'pulmonaryValve'] as const) {
      const open = group === 'tricuspid' || group === 'mitral' ? state.atrioventricularOpen : state.semilunarOpen;
      const before = opening.current.get(group) ?? 0;
      opening.current.set(group, before + ((open ? 1 : 0) - before) * follow);
    }
    for (const shape of shapes) {
      if (shape.group === 'rightAtrium' || shape.group === 'leftAtrium') shape.object.scale.setScalar(1 - state.atria * 0.1);
      else if (shape.group === 'rightVentricle' || shape.group === 'leftVentricle') shape.object.scale.setScalar(1 - state.ventricles * 0.14);
      else if (shape.group === 'tricuspid' || shape.group === 'mitral' || shape.group === 'aorticValve' || shape.group === 'pulmonaryValve') {
        const open = opening.current.get(shape.group) ?? 0;
        shape.object.position.copy(shape.base).addScaledVector(shape.outward, open * 0.28);
        shape.object.scale.setScalar(1 - open * 0.3);
      }
    }
  });
  useEffect(() => { decoder.dispose(); }, [gltf]);
  useEffect(() => () => {
    instance.traverse((object) => { if (object instanceof THREE.Mesh) (object.material as THREE.Material).dispose(); });
  }, [instance]);
  return <primitive object={instance} dispose={null} />;
}

// Each route runs from a vein to an artery. `enter` is the atrium, `ring` the atrioventricular valve and
// `exit` the arterial valve: blood waits behind whichever of the two valves is closed.
type RouteSpec = { readonly blood: 'artery' | 'vein'; readonly points: readonly Point3[]; readonly enter: number; readonly ring: number; readonly exit: number };
const right = (start: readonly Point3[], end: readonly Point3[]): RouteSpec => ({ blood: 'vein', points: [...start, RA.at, TRICUSPID, RV.at, PULMONARY, part('Pulmonary trunk').at, part('Bifurcation of pulmonary trunk').at, ...end], enter: start.length, ring: start.length + 1, exit: start.length + 3 });
const left = (vein: string, end: readonly Point3[]): RouteSpec => ({ blood: 'artery', points: [part(vein).tip, part(vein).at, LA.at, MITRAL, LV.at, AORTIC, part('Ascending aorta').at, part('Aortic arch').at, ...end], enter: 2, ring: 3, exit: 5 });
const ROUTES: readonly RouteSpec[] = [
  right([clipped(part('Superior vena cava').tip), part('Superior vena cava').at], [part('Left pulmonary artery').tip]),
  right([clipped(part('Inferior vena cava (thoracic part)').tip), clipped(part('Inferior vena cava (thoracic part)').at)], [part('Right pulmonary artery').tip]),
  left('Left superior pulmonary vein', [part('Aortic arch').tip]),
  left('Right superior pulmonary vein', [part('Thoracic aorta').at, clipped(part('Thoracic aorta').tip)]),
  left('Left inferior pulmonary vein', [part('Aortic arch').tip]),
  left('Right inferior pulmonary vein', [part('Thoracic aorta').at, clipped(part('Thoracic aorta').tip)]),
];

type Particle = { s: number; offset: THREE.Vector3 };
const COUNT = 24;
/** Blood cells moving along their route at the pace each phase allows. */
function Blood({ route, color, clock }: { readonly route: RouteSpec; readonly color: string; readonly clock: Clock }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(route.points.map((p) => new THREE.Vector3(...p)));
    const length = curve.getLength();
    const mark = (index: number) => {
      const target = new THREE.Vector3(...route.points[index]!);
      let best = 0;
      let distance = Infinity;
      for (let i = 0; i <= 600; i++) { const d = curve.getPointAt(i / 600).distanceTo(target); if (d < distance) { distance = d; best = i / 600; } }
      return best;
    };
    const random = (i: number) => { const x = Math.sin(i * 12.9898 + route.points.length * 78.233 + route.points[0]![1] * 31.7) * 43758.5453; return x - Math.floor(x); };
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
    const state = cardiacState(now, clock.heartRate);
    const gap = 0.012;
    for (const p of data.particles) {
      let speed: number;
      let stop = Infinity;
      if (p.s < data.ring) {
        speed = p.s < data.enter ? 1.4 : state.phase === 'atrial' ? 3.4 : 1.8;
        if (!state.atrioventricularOpen) stop = data.ring - gap;
      } else if (p.s < data.exit) {
        speed = state.semilunarOpen ? 7 : 1.4;
        if (!state.semilunarOpen) stop = data.exit - gap;
      } else speed = 3.6;
      if (p.s < stop) p.s = Math.min(stop, p.s + (speed * dt) / data.length);
      if (p.s >= 1) p.s -= 1;
    }
    data.particles.forEach((p, i) => {
      data.curve.getPointAt(Math.max(0, Math.min(1, p.s)), point);
      const spread = p.s > data.enter && p.s < data.exit ? 0.34 : 0.06;
      point.addScaledVector(p.offset, spread);
      matrix.makeTranslation(point.x, point.y, point.z);
      mesh.current?.setMatrixAt(i, matrix);
    });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  });
  const material = useMemo(() => { const m = new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: 0.8, roughness: 0.4, transparent: true }); fadeBelow(m); return m; }, [color]);
  useEffect(() => () => material.dispose(), [material]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={5}>
    <sphereGeometry args={[0.09, 12, 8]} />
    <primitive object={material} attach="material" />
  </instancedMesh>;
}

/** A conduction pathway that lights up where the impulse is, drawn over the muscle. */
function Pathway({ points, color, progress }: { readonly points: readonly Point3[]; readonly color: string; readonly progress: () => number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [points]);
  const uniforms = useMemo(() => ({ tone: { value: new THREE.Color(color) }, progress: { value: -1 } }), [color]);
  useFrame(() => { uniforms.progress.value = progress(); });
  return <mesh renderOrder={10}><tubeGeometry args={[curve, 64, 0.05, 8, false]} /><shaderMaterial uniforms={uniforms} toneMapped={false} depthTest={false} transparent
    vertexShader={'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
    fragmentShader={'uniform vec3 tone; uniform float progress; varying vec2 vUv; void main(){float lit=step(0.0,progress)*(smoothstep(progress-0.25,progress,vUv.x)*step(vUv.x,progress+0.02)+0.35*step(vUv.x,progress)); gl_FragColor=vec4(mix(tone*0.55,vec3(1.0),clamp(lit,0.0,1.0)),1.0);\n#include <colorspace_fragment>\n}'}
  /></mesh>;
}

function Node({ at, color, active }: { readonly at: Point3; readonly color: string; readonly active: () => number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => { mesh.current?.scale.setScalar(active() >= 0 ? 1.6 : 1); });
  return <mesh ref={mesh} position={[...at]} renderOrder={11}><sphereGeometry args={[0.13, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} depthTest={false} /></mesh>;
}

export function CirculationHeart({ palette, time, heartRate, layer }: { readonly palette: HeartPalette; readonly time: RefObject<number>; readonly heartRate: number; readonly layer: HeartLayer }) {
  const clock = useMemo(() => ({ time, heartRate }), [time, heartRate]);
  const conduction = () => cardiacState(time.current, heartRate).conduction;
  return <group>
    <Model palette={palette} clock={clock} />
    {layer === 'flow' && ROUTES.map((route, i) => <Blood key={i} route={route} color={route.blood === 'artery' ? palette.artery : palette.vein} clock={clock} />)}
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
