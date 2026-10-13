'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { reflexState, type ReflexPart } from './engines/skin';
import { paintHighlight, pickHandlers, type Picking } from './skinHighlight';
import { ARM_LANDMARKS as A } from './skinArmLandmarks';
import type { ReflexStimulus } from './skinCopy';
import type { Point3 } from './kneeReflexParts';

// The withdrawal reflex on a real arm (public/models/skin/arm.glb): the impulse runs from the fingertip up
// the median nerve to the spinal cord, crosses to a motor neuron and comes back down the musculocutaneous
// nerve to the biceps, which bends the elbow. The cord is cut at C7 to show its cross-section (white matter
// around the H-shaped grey matter), where the impulse crosses from the posterior to the anterior horn.

export type ArmPalette = Readonly<Record<'bone' | 'muscle' | 'nerve' | 'signal' | 'motor' | 'broken' | 'cord' | 'grey' | 'thorn' | 'hot' | 'highlight' | 'white', string>>;

const decoder = new DRACOLoader().setDecoderPath('/models/draco/').setWorkerLimit(2);
/** Elbow flexion at the end of the withdrawal, radians (negative turns the forearm forward). */
const FLEX = -1.15;
const ELBOW = new THREE.Vector3(...A.elbow);

type Uniforms = { readonly uBendAngle: { value: number }; readonly uElbow: { value: THREE.Vector3 } };
/** Turns everything weighted by `_bend` about the elbow (the axis runs across the body). */
function bendable(material: THREE.Material, uniforms: Uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const NL = String.fromCharCode(10);
    const head = ['attribute float _bend;', 'uniform float uBendAngle;', 'uniform vec3 uElbow;', 'mat3 bendMatrix() { float a = uBendAngle * _bend; return mat3(1.0, 0.0, 0.0, 0.0, cos(a), sin(a), 0.0, -sin(a), cos(a)); }'];
    shader.vertexShader = [...head, shader.vertexShader].join(NL)
      .replace('#include <beginnormal_vertex>', ['#include <beginnormal_vertex>', 'objectNormal = bendMatrix() * objectNormal;'].join(NL))
      .replace('#include <begin_vertex>', ['#include <begin_vertex>', 'transformed = uElbow + bendMatrix() * (transformed - uElbow);'].join(NL));
  };
  material.customProgramCacheKey = () => 'scipal-arm-bend';
}
const bendPoint = (p: Point3, weight: number, angle: number, out: THREE.Vector3) => {
  out.set(...p).sub(ELBOW).applyAxisAngle(new THREE.Vector3(1, 0, 0), angle * weight).add(ELBOW);
  return out;
};
const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const weightAt = (y: number) => 1 - smoothstep(A.elbow[1] - 0.12, A.elbow[1] + 0.12, y);

const COLOURS: Record<string, keyof ArmPalette> = { bone: 'bone', spine: 'bone', biceps: 'muscle', flexor: 'muscle', sensory: 'nerve', motor: 'motor', plexus: 'nerve', dorsalRoot: 'nerve', ventralRoot: 'motor', cord: 'cord', posteriorHorn: 'grey', anteriorHorn: 'grey', section: 'cord', sectionGrey: 'grey' };
/** The reflex part (the scene's label key) each part of the model belongs to; bones, the plexus and the vertebrae have none. */
const keyOf = (part: string, name: string): string | undefined => {
  if (part === 'sensory') return /digital/i.test(name) ? 'receptor' : 'afferent';
  return ({ dorsalRoot: 'afferent', posteriorHorn: 'centre', anteriorHorn: 'centre', cord: 'centre', section: 'centre', sectionGrey: 'centre', motor: 'efferent', ventralRoot: 'efferent', biceps: 'effector' } as Record<string, string>)[part];
};
const BEHIND: ReadonlySet<string> = new Set(['centre']);
const OPACITY: Record<string, number> = { spine: 0.35, cord: 0.45, flexor: 0.55, biceps: 0.85 };

function useArm(palette: ArmPalette, uniforms: Uniforms) {
  const gltf = useLoader(GLTFLoader, '/models/skin/arm.glb', (loader) => { loader.setDRACOLoader(decoder); });
  const built = useMemo(() => {
    const main = new THREE.Group();
    const biceps: THREE.MeshStandardMaterial[] = [];
    for (const child of [...gltf.scene.children]) {
      if (!(child instanceof THREE.Mesh)) continue;
      const part = String(child.userData.part ?? '');
      const opacity = OPACITY[part];
      const material = new THREE.MeshStandardMaterial({ color: palette[COLOURS[part] ?? 'white'], roughness: 0.55, transparent: opacity !== undefined, opacity: opacity ?? 1, depthWrite: opacity === undefined, side: THREE.DoubleSide });
      bendable(material, uniforms);
      if (part === 'biceps') biceps.push(material);
      const mesh = new THREE.Mesh(child.geometry, material);
      const key = keyOf(part, child.name);
      if (key) mesh.userData.key = key;
      mesh.renderOrder = opacity !== undefined ? 2 : 0;
      main.add(mesh);
    }
    return { main, biceps };
  }, [gltf.scene, palette, uniforms]);
  useEffect(() => { decoder.dispose(); }, [gltf]);
  useEffect(() => () => {
    built.main.traverse((object) => { if (object instanceof THREE.Mesh) (object.material as THREE.Material).dispose(); });
  }, [built]);
  return built;
}

type PathKey = 'sensory' | 'centre' | 'motor' | 'ascending';
const PATHS: Record<PathKey, readonly { readonly at: Point3; readonly bend: number }[]> = { sensory: A.sensory, centre: A.centre, motor: A.motor, ascending: A.ascending };

function tubeWithBend(points: readonly THREE.Vector3[], radius: number) {
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...points]), Math.max(24, points.length * 12), radius, 8, false);
  const position = geometry.getAttribute('position');
  const weights = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) weights[i] = weightAt(position.getY(i));
  geometry.setAttribute('_bend', new THREE.BufferAttribute(weights, 1));
  return geometry;
}

type Props = Picking & { readonly palette: ArmPalette; readonly time: RefObject<number>; readonly startedAt: number | null; readonly broken: ReadonlySet<ReflexPart>; readonly stimulus: ReflexStimulus };

export function SkinArm({ palette, time, startedAt, broken, stimulus, highlight, onHover, onPick }: Props) {
  const lit = useMemo(() => new THREE.Color(palette.highlight), [palette.highlight]);
  const handlers = useMemo(() => pickHandlers({ highlight, onHover, onPick }, BEHIND), [highlight, onHover, onPick]);
  const uniforms = useMemo<Uniforms>(() => ({ uBendAngle: { value: 0 }, uElbow: { value: ELBOW.clone() } }), []);
  const arm = useArm(palette, uniforms);
  const tubes = useMemo(() => {
    const colour = (key: PathKey, part: ReflexPart) => (broken.has(part) ? palette.broken : key === 'motor' ? palette.motor : key === 'ascending' ? palette.white : palette.signal);
    const make = (geometry: THREE.BufferGeometry, color: string, bend: boolean) => {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false });
      if (bend) bendable(material, uniforms);
      return new THREE.Mesh(geometry, material);
    };
    const tube = (points: readonly { readonly at: Point3 }[], radius: number, color: string) => make(tubeWithBend(points.map((p) => new THREE.Vector3(...p.at)), radius), color, true);
    // Thick along the arm; thin from the roots on, so the horns on the cut face stay visible.
    return [
      tube(A.sensory.slice(0, -1), 0.035, colour('sensory', 'afferent')),
      tube(A.sensory.slice(-2), 0.006, colour('sensory', 'afferent')),
      tube(A.centre, 0.006, colour('centre', 'centre')),
      tube(A.motor.slice(0, 2), 0.006, colour('motor', 'efferent')),
      tube(A.motor.slice(1), 0.035, colour('motor', 'efferent')),
      tube(A.ascending, 0.003, colour('ascending', 'centre')),
    ];
  }, [broken, palette, uniforms]);
  useEffect(() => () => { for (const mesh of tubes) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); } }, [tubes]);

  // The moving impulse, and the one that goes up to the brain.
  const curves = useMemo(() => Object.fromEntries((Object.keys(PATHS) as PathKey[]).map((key) => [key, new THREE.CatmullRomCurve3(PATHS[key].map((p) => new THREE.Vector3(...p.at)))])) as Record<PathKey, THREE.CatmullRomCurve3>, []);
  const dot = useRef<THREE.Mesh>(null);
  const brainDot = useRef<THREE.Mesh>(null);
  const fingertip = useRef<THREE.Mesh>(null);
  const brain = useRef<THREE.Mesh>(null);
  const scratch = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    paintHighlight(arm.main, highlight, lit);
    const state = reflexState(startedAt === null ? -1 : time.current - startedAt, broken);
    const angle = FLEX * state.withdrawal;
    uniforms.uBendAngle.value = angle;
    const p = state.parts;
    const place = (mesh: THREE.Mesh | null, key: PathKey | null, along: number) => {
      if (!mesh) return;
      if (!key || along < 0 || along > 1) { mesh.visible = false; return; }
      curves[key].getPointAt(along, scratch);
      // Bend the point the same way the arm bends.
      const y = scratch.y;
      bendPoint([scratch.x, scratch.y, scratch.z], weightAt(y), angle, scratch);
      mesh.position.copy(scratch);
      mesh.visible = true;
    };
    if (p.afferent >= 0 && p.afferent < 1) place(dot.current, 'sensory', p.afferent);
    else if (p.centre >= 0 && p.centre < 1) place(dot.current, 'centre', p.centre);
    else if (p.efferent >= 0 && p.efferent < 1) place(dot.current, 'motor', p.efferent);
    else place(dot.current, null, 0);
    // Small while it crosses the cut face of the cord.
    dot.current?.scale.setScalar(p.centre >= 0 && p.centre < 1 ? 0.15 : 1);
    place(brainDot.current, state.brain >= 0 && state.brain < 1 ? 'ascending' : null, state.brain);
    if (fingertip.current) {
      bendPoint(A.fingertip, 1, angle, fingertip.current.position);
      const lit = p.receptor >= 0 && p.receptor < 1 ? 1 : 0;
      fingertip.current.scale.setScalar(1 + lit * 0.6);
      (fingertip.current.material as THREE.MeshBasicMaterial).color.set(broken.has('receptor') ? palette.broken : palette.signal);
      (fingertip.current.material as THREE.MeshBasicMaterial).opacity = broken.has('receptor') ? 0.9 : 0.35 + 0.6 * lit;
    }
    if (brain.current) {
      const material = brain.current.material as THREE.MeshStandardMaterial;
      material.emissive.set(state.felt ? palette.signal : palette.highlight);
      material.emissiveIntensity = state.felt ? 0.9 : highlight === 'brain' ? 0.5 : 0.05;
    }
    const squeeze = p.effector > 0 && !state.blockedAt ? Math.sin(Math.min(1, p.effector) * Math.PI) : 0;
    // The contraction (or a damaged muscle) shows over the highlight.
    if (squeeze > 0 || broken.has('effector')) for (const material of arm.biceps) { material.emissive.set(broken.has('effector') ? palette.broken : palette.motor).multiplyScalar(broken.has('effector') ? 0.6 : squeeze * 0.8); material.emissiveIntensity = 1; }
    if (fingertip.current && highlight === 'receptor' && !broken.has('receptor')) { (fingertip.current.material as THREE.MeshBasicMaterial).color.set(palette.highlight); (fingertip.current.material as THREE.MeshBasicMaterial).opacity = 0.75; }
  });

  const [fx, fy, fz] = A.fingertip;
  return <group>
    <group {...handlers}>
      <primitive object={arm.main} />
    </group>
    {tubes.map((mesh, i) => <primitive key={i} object={mesh} />)}
    <mesh ref={brain} position={[...A.brain]} userData={{ key: 'brain' }} {...handlers} scale={[0.55, 0.48, 0.65]}>
      <sphereGeometry args={[1, 32, 20]} />
      <meshStandardMaterial color={palette.bone} emissive={palette.signal} emissiveIntensity={0.05} transparent opacity={0.3} depthWrite={false} roughness={0.6} />
    </mesh>
    <mesh ref={fingertip} position={[fx, fy, fz]}><sphereGeometry args={[0.12, 16, 12]} /><meshBasicMaterial color={palette.signal} transparent opacity={0.35} depthWrite={false} toneMapped={false} /></mesh>
    <mesh ref={dot} visible={false} renderOrder={8}><sphereGeometry args={[0.11, 14, 10]} /><meshBasicMaterial color={palette.white} toneMapped={false} depthTest={false} /></mesh>
    <mesh ref={brainDot} visible={false} renderOrder={8}><sphereGeometry args={[0.09, 14, 10]} /><meshBasicMaterial color={palette.white} toneMapped={false} depthTest={false} /></mesh>
    {/* The stimulus just under the fingertip; it stays where it is when the hand pulls away. */}
    {stimulus === 'pain'
      ? <mesh position={[fx, fy - 0.42, fz]}><coneGeometry args={[0.12, 0.6, 16]} /><meshStandardMaterial color={palette.thorn} roughness={0.6} /></mesh>
      : <mesh position={[fx, fy - 0.3, fz]}><cylinderGeometry args={[0.6, 0.6, 0.14, 32]} /><meshStandardMaterial color={palette.hot} emissive={palette.hot} emissiveIntensity={0.7} roughness={0.4} /></mesh>}
  </group>;
}
