'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { impulseTimes, type Stimulus } from './engines/skin';
import { SKIN_LANDMARKS as L } from './skinLandmarks';
import type { Point3 } from './kneeReflexParts';

// The skin block (public/models/skin/skin.glb) with the receptors the model lacks, the stimulus that
// presses on it, and impulses that run from the receptor along the sensory nerve toward the spinal cord.

export type SkinPalette = Readonly<Record<'background' | 'artery' | 'nerve' | 'signal' | 'tool' | 'ice' | 'hot' | 'thorn' | 'white', string>>;
type Clock = { readonly time: RefObject<number> };

const decoder = new DRACOLoader().setDecoderPath('/models/draco/').setWorkerLimit(2);
/** Seconds the tool takes to come down onto the skin. */
export const LOWER = 0.5;
/** Seconds an impulse takes from the receptor to the edge of the block. */
const TRAVEL = 2.6;

const TOUCH: Point3 = L.touchNerve[0];
const PAIN: Point3 = L.painNerve[0];
const COLD: Point3 = L.tuftNerve[0];
const HEAT: Point3 = [-0.9, 1.25, 0.45];
const PRESSURE: Point3 = [0.85, -1.15, 0.35];
const trunkFrom = (index: number): Point3[] => [...L.trunk.slice(index), [-3.9, -2.42, -1.29]];

/** Where each receptor sits and the way its impulses run to the spinal cord (off the left edge). */
export const RECEPTOR_PLACES: Record<Stimulus, { readonly at: Point3; readonly path: readonly Point3[]; readonly drawn: boolean }> = {
  touch: { at: TOUCH, path: [...L.touchNerve, [1.66, -1.3, -1.0], ...trunkFrom(2)], drawn: false },
  pain: { at: PAIN, path: [...L.painNerve, ...trunkFrom(2)], drawn: false },
  cold: { at: COLD, path: [...L.tuftNerve, [-2.1, -1.4, -0.7], ...trunkFrom(8)], drawn: false },
  heat: { at: HEAT, path: [HEAT, [-0.92, 0.2, 0.1], [-0.95, -1.3, -0.7], ...trunkFrom(6)], drawn: true },
  pressure: { at: PRESSURE, path: [PRESSURE, [0.6, -1.8, -0.5], ...trunkFrom(4)], drawn: true },
};
/** Where the tool meets the skin above each receptor. */
export const CONTACT: Record<Stimulus, Point3> = Object.fromEntries(
  (Object.keys(RECEPTOR_PLACES) as Stimulus[]).map((s) => [s, [RECEPTOR_PLACES[s].at[0], L.surface, Math.min(0.6, Math.max(-0.6, RECEPTOR_PLACES[s].at[2] + 0.4))] as Point3]),
) as Record<Stimulus, Point3>;

const TRANSLUCENT: Readonly<Record<string, number>> = { dermis: 0.22, epidermis: 0.35, fibres: 0.35, surface: 0.85 };

function Model() {
  const gltf = useLoader(GLTFLoader, '/models/skin/skin.glb', (loader) => { loader.setDRACOLoader(decoder); });
  const instance = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return;
      const material = object.material.clone();
      const part = object.userData.part as string | undefined;
      const opacity = part ? TRANSLUCENT[part] : undefined;
      if (opacity !== undefined) { material.transparent = true; material.opacity = Math.min(material.opacity, opacity); material.depthWrite = false; }
      object.material = material;
      object.renderOrder = opacity !== undefined ? 2 : 0;
    });
    return scene;
  }, [gltf.scene]);
  useEffect(() => { decoder.dispose(); }, [gltf]);
  useEffect(() => () => {
    instance.traverse((object) => { if (object instanceof THREE.Mesh) (object.material as THREE.Material).dispose(); });
  }, [instance]);
  return <primitive object={instance} dispose={null} />;
}

const curveOf = (points: readonly Point3[]) => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));

/** A receptor the source model does not have, drawn here; `glow` lights while it fires. */
function Receptor({ stimulus, palette, glow }: { readonly stimulus: Stimulus; readonly palette: SkinPalette; readonly glow: RefObject<number> }) {
  const halo = useRef<THREE.Mesh>(null);
  const at = RECEPTOR_PLACES[stimulus].at;
  useFrame(() => {
    if (!halo.current) return;
    const lit = glow.current;
    halo.current.visible = lit > 0.01;
    halo.current.scale.setScalar(1 + lit * 0.5);
    (halo.current.material as THREE.MeshBasicMaterial).opacity = lit * 0.55;
  });
  const shape = (() => {
    if (stimulus === 'pressure') return <group>{[0.34, 0.27, 0.2, 0.12].map((r, i) => <mesh key={r} scale={[r, r * 1.6, r]}><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color={i === 3 ? palette.nerve : palette.white} transparent opacity={i === 3 ? 0.9 : 0.28} depthWrite={false} roughness={0.4} /></mesh>)}</group>;
    if (stimulus === 'heat') return <mesh scale={[0.1, 0.24, 0.1]}><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color={palette.hot} roughness={0.5} /></mesh>;
    if (stimulus === 'pain') {
      const endings: Point3[] = [[-0.25, 0.8, 0.1], [-0.08, 0.95, -0.05], [0.1, 0.85, 0.12], [0.26, 0.7, -0.08]];
      return <group>{endings.map((tip) => <mesh key={tip.join()}><tubeGeometry args={[curveOf([[0, 0, 0], [tip[0] * 0.4, tip[1] * 0.45, tip[2] * 0.4], tip]), 16, 0.022, 6, false]} /><meshStandardMaterial color={palette.nerve} roughness={0.5} /></mesh>)}</group>;
    }
    if (stimulus === 'cold') return <mesh scale={[0.13, 0.13, 0.13]}><sphereGeometry args={[1, 20, 14]} /><meshStandardMaterial color={palette.ice} roughness={0.4} /></mesh>;
    return null; // touch: the coiled corpuscle is part of the model
  })();
  return <group position={[...at]}>
    {shape}
    <mesh ref={halo} visible={false} renderOrder={6}><sphereGeometry args={[0.3, 20, 14]} /><meshBasicMaterial color={palette.signal} transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>
  </group>;
}

/** The thing that presses on the skin. */
function Tool({ stimulus, palette }: { readonly stimulus: Stimulus; readonly palette: SkinPalette }) {
  if (stimulus === 'pain') return <group><mesh position={[0, 0.45, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.13, 0.9, 16]} /><meshStandardMaterial color={palette.thorn} roughness={0.6} /></mesh><mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.09, 0.09, 0.8, 12]} /><meshStandardMaterial color={palette.thorn} roughness={0.7} /></mesh></group>;
  if (stimulus === 'cold') return <mesh position={[0, 0.42, 0]}><boxGeometry args={[0.85, 0.8, 0.85]} /><meshStandardMaterial color={palette.ice} transparent opacity={0.6} roughness={0.1} /></mesh>;
  if (stimulus === 'heat') return <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.55, 0.55, 0.22, 32]} /><meshStandardMaterial color={palette.hot} emissive={palette.hot} emissiveIntensity={0.7} roughness={0.4} /></mesh>;
  const press = stimulus === 'pressure';
  return <mesh position={[0, 0.42, 0]} scale={press ? [0.62, 0.48, 0.62] : [0.45, 0.42, 0.45]}><sphereGeometry args={[1, 24, 16]} /><meshStandardMaterial color={palette.tool} roughness={0.6} /></mesh>;
}

type Props = { readonly palette: SkinPalette; readonly clock: Clock; readonly stimulus: Stimulus; readonly intensity: number; readonly appliedAt: number | null };

const COUNT = 40;

export function SkinBody({ palette, clock, stimulus, intensity, appliedAt }: Props) {
  const tool = useRef<THREE.Group>(null);
  const impulses = useRef<THREE.InstancedMesh>(null);
  const glow = useRef(0);
  const curves = useMemo(() => Object.fromEntries((Object.keys(RECEPTOR_PLACES) as Stimulus[]).map((s) => [s, curveOf(RECEPTOR_PLACES[s].path)])) as Record<Stimulus, THREE.CatmullRomCurve3>, []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const contact = CONTACT[stimulus];
  useFrame(() => {
    const now = clock.time.current;
    const since = appliedAt === null ? -1 : now - appliedAt;
    const down = appliedAt === null ? 0 : Math.min(1, since / LOWER);
    const depth = stimulus === 'pressure' ? 0.12 : stimulus === 'pain' ? 0.25 : 0;
    tool.current?.position.set(contact[0], contact[1] + (1 - down) * 1.6 - down * depth, contact[2]);
    const touching = since - LOWER;
    const times = appliedAt === null ? [] : impulseTimes(stimulus, intensity, touching);
    const latest = times.length ? touching - times[times.length - 1]! : Infinity;
    glow.current = Math.max(0, 1 - latest / 0.25);
    let shown = 0;
    if (impulses.current) {
      for (let i = times.length - 1; i >= 0 && shown < COUNT; i--) {
        const along = (touching - times[i]!) / TRAVEL;
        if (along > 1) break;
        curves[stimulus].getPointAt(along, point);
        impulses.current.setMatrixAt(shown++, matrix.makeTranslation(point.x, point.y, point.z));
      }
      impulses.current.count = shown;
      impulses.current.instanceMatrix.needsUpdate = true;
    }
  });
  return <group>
    <Model />
    {(Object.keys(RECEPTOR_PLACES) as Stimulus[]).map((s) => <group key={s}>
      <Receptor stimulus={s} palette={palette} glow={s === stimulus ? glow : ZERO} />
      {RECEPTOR_PLACES[s].drawn && <mesh><tubeGeometry args={[curves[s], 120, 0.028, 8, false]} /><meshStandardMaterial color={palette.nerve} roughness={0.5} /></mesh>}
    </group>)}
    <mesh renderOrder={4}><tubeGeometry args={[curves[stimulus], 200, 0.06, 8, false]} /><meshBasicMaterial color={palette.signal} transparent opacity={0.28} depthWrite={false} toneMapped={false} /></mesh>
    <instancedMesh ref={impulses} args={[undefined, undefined, COUNT]} frustumCulled={false} renderOrder={7}>
      <sphereGeometry args={[0.13, 14, 10]} />
      <meshBasicMaterial color={palette.signal} toneMapped={false} depthTest={false} />
    </instancedMesh>
    <group ref={tool}><Tool stimulus={stimulus} palette={palette} /></group>
  </group>;
}
const ZERO = { current: 0 };
