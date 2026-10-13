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
import { Rod, type Point3 } from './kneeReflexParts';

// The withdrawal reflex on a real arm (public/models/skin/arm.glb): the impulse runs from the fingertip up
// the median nerve to the spinal cord, crosses to a motor neuron and comes back down the musculocutaneous
// nerve to the biceps, which bends the elbow. A slice of the cord at C7 is shown enlarged beside the neck.

export type ArmPalette = Readonly<Record<'bone' | 'muscle' | 'nerve' | 'signal' | 'motor' | 'broken' | 'cord' | 'grey' | 'thorn' | 'hot' | 'highlight' | 'white', string>>;

const decoder = new DRACOLoader().setDecoderPath('/models/draco/').setWorkerLimit(2);
/** Elbow flexion at the end of the withdrawal, radians (negative turns the forearm forward). */
const FLEX = -1.15;
export const ENLARGE = 9;
export const SLICE_AT: Point3 = [2.5, -0.3, 0.6];
const SLICE_TURN = new THREE.Euler(Math.PI / 2, 0, 0);
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
/** A point of the cord in the coordinates of the enlarged slice, which always faces the viewer. */
const toSlice = (p: Point3) => new THREE.Vector3(...p).sub(new THREE.Vector3(...A.slice)).applyEuler(SLICE_TURN).multiplyScalar(ENLARGE);

const COLOURS: Record<string, keyof ArmPalette> = { bone: 'bone', spine: 'bone', biceps: 'muscle', flexor: 'muscle', sensory: 'nerve', motor: 'motor', plexus: 'nerve', dorsalRoot: 'nerve', ventralRoot: 'motor', cord: 'cord', posteriorHorn: 'grey', anteriorHorn: 'grey' };
/** The reflex part (the scene's label key) each part of the model belongs to; bones, the plexus and the vertebrae have none. */
const keyOf = (part: string, name: string): string | undefined => {
  if (part.startsWith('slice-')) return 'slice';
  if (part === 'sensory') return /digital/i.test(name) ? 'receptor' : 'afferent';
  return ({ dorsalRoot: 'afferent', posteriorHorn: 'centre', anteriorHorn: 'centre', cord: 'centre', motor: 'efferent', ventralRoot: 'efferent', biceps: 'effector' } as Record<string, string>)[part];
};
/** What else lights a slice part: the reflex part it shows. */
const SLICE_ALSO: Record<string, readonly string[]> = { 'slice-dorsalRoot': ['afferent'], 'slice-posteriorHorn': ['centre'], 'slice-anteriorHorn': ['centre'], 'slice-cord': ['centre'], 'slice-ventralRoot': ['efferent'] };
const BEHIND: ReadonlySet<string> = new Set(['centre']);
const OPACITY: Record<string, number> = { spine: 0.35, cord: 0.45, flexor: 0.55, biceps: 0.85 };

function useArm(palette: ArmPalette, uniforms: Uniforms) {
  const gltf = useLoader(GLTFLoader, '/models/skin/arm.glb', (loader) => { loader.setDRACOLoader(decoder); });
  const built = useMemo(() => {
    const main = new THREE.Group();
    const slice = new THREE.Group();
    const biceps: THREE.MeshStandardMaterial[] = [];
    for (const child of [...gltf.scene.children]) {
      if (!(child instanceof THREE.Mesh)) continue;
      const raw = String(child.userData.part ?? '');
      const inSlice = raw.startsWith('slice-');
      const part = inSlice ? raw.slice(6) : raw;
      const opacity = inSlice ? (part === 'cord' ? 0.35 : 1) : OPACITY[part];
      const material = new THREE.MeshStandardMaterial({ color: palette[COLOURS[part] ?? 'white'], roughness: 0.55, transparent: opacity !== undefined && opacity < 1, opacity: opacity ?? 1, depthWrite: !(opacity !== undefined && opacity < 1), side: THREE.DoubleSide });
      if (!inSlice) bendable(material, uniforms);
      if (part === 'biceps' && !inSlice) biceps.push(material);
      const mesh = new THREE.Mesh(child.geometry, material);
      const key = keyOf(raw, child.name);
      if (key) mesh.userData.key = key;
      if (SLICE_ALSO[raw]) mesh.userData.also = SLICE_ALSO[raw];
      mesh.renderOrder = opacity !== undefined && opacity < 1 ? 2 : 0;
      (inSlice ? slice : main).add(mesh);
    }
    return { main, slice, biceps };
  }, [gltf.scene, palette, uniforms]);
  useEffect(() => { decoder.dispose(); }, [gltf]);
  useEffect(() => () => {
    for (const group of [built.main, built.slice]) group.traverse((object) => { if (object instanceof THREE.Mesh) (object.material as THREE.Material).dispose(); });
  }, [built]);
  return built;
}

type PathKey = 'sensory' | 'centre' | 'motor' | 'ascending';
const PATHS: Record<PathKey, readonly { readonly at: Point3; readonly bend: number }[]> = { sensory: A.sensory, centre: A.centre, motor: A.motor, ascending: A.ascending };
/** The last points of the sensory path and the first of the motor path lie in the enlarged slice. */
const SLICE_PATHS = { sensory: A.sensory.slice(-3).map((p) => p.at), centre: A.centre.map((p) => p.at), motor: A.motor.slice(0, 2).map((p) => p.at) } as const;

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
    const main = [
      make(tubeWithBend(A.sensory.map((p) => new THREE.Vector3(...p.at)), 0.035), colour('sensory', 'afferent'), true),
      make(tubeWithBend(A.motor.map((p) => new THREE.Vector3(...p.at)), 0.035), colour('motor', 'efferent'), true),
      make(tubeWithBend(A.ascending.map((p) => new THREE.Vector3(...p.at)), 0.025), colour('ascending', 'centre'), true),
    ];
    const slice = [
      make(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(SLICE_PATHS.sensory.map(toSlice)), 40, 0.06, 8, false), colour('sensory', 'afferent'), false),
      make(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(SLICE_PATHS.centre.map(toSlice)), 20, 0.06, 8, false), colour('centre', 'centre'), false),
      make(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(SLICE_PATHS.motor.map(toSlice)), 20, 0.06, 8, false), colour('motor', 'efferent'), false),
    ];
    return { main, slice };
  }, [broken, palette, uniforms]);
  useEffect(() => () => { for (const mesh of [...tubes.main, ...tubes.slice]) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); } }, [tubes]);

  // Moving impulses: one in the arm and one in the enlarged slice.
  const curves = useMemo(() => Object.fromEntries((Object.keys(PATHS) as PathKey[]).map((key) => [key, new THREE.CatmullRomCurve3(PATHS[key].map((p) => new THREE.Vector3(...p.at)))])) as Record<PathKey, THREE.CatmullRomCurve3>, []);
  const sliceCurves = useMemo(() => ({ sensory: new THREE.CatmullRomCurve3(SLICE_PATHS.sensory.map(toSlice)), centre: new THREE.CatmullRomCurve3(SLICE_PATHS.centre.map(toSlice)), motor: new THREE.CatmullRomCurve3(SLICE_PATHS.motor.map(toSlice)) }), []);
  const dot = useRef<THREE.Mesh>(null);
  const brainDot = useRef<THREE.Mesh>(null);
  const sliceDot = useRef<THREE.Mesh>(null);
  const sliceFrame = useRef<THREE.Group>(null);
  const fingertip = useRef<THREE.Mesh>(null);
  const brain = useRef<THREE.Mesh>(null);
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const afferentInSlice = useMemo(() => {
    // How far along the sensory path the slice part begins.
    const all = curves.sensory.getLength();
    const tail = new THREE.CatmullRomCurve3(A.sensory.slice(-3).map((p) => new THREE.Vector3(...p.at))).getLength();
    return 1 - tail / all;
  }, [curves]);
  const motorInSlice = useMemo(() => new THREE.CatmullRomCurve3(A.motor.slice(0, 2).map((p) => new THREE.Vector3(...p.at))).getLength() / curves.motor.getLength(), [curves]);

  useFrame(({ camera }) => {
    paintHighlight(arm.main, highlight, lit);
    paintHighlight(arm.slice, highlight, lit);
    sliceFrame.current?.quaternion.copy(camera.quaternion);
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
    const placeSlice = (key: 'sensory' | 'centre' | 'motor' | null, along: number) => {
      if (!sliceDot.current) return;
      if (!key || along < 0 || along > 1) { sliceDot.current.visible = false; return; }
      sliceCurves[key].getPointAt(along, sliceDot.current.position);
      sliceDot.current.visible = true;
    };
    if (p.afferent >= 0 && p.afferent < 1) {
      place(dot.current, 'sensory', p.afferent);
      placeSlice(p.afferent > afferentInSlice ? 'sensory' : null, (p.afferent - afferentInSlice) / (1 - afferentInSlice));
    } else if (p.centre >= 0 && p.centre < 1) { place(dot.current, 'centre', p.centre); placeSlice('centre', p.centre); }
    else if (p.efferent >= 0 && p.efferent < 1) { place(dot.current, 'motor', p.efferent); placeSlice(p.efferent < motorInSlice ? 'motor' : null, p.efferent / motorInSlice); }
    else { place(dot.current, null, 0); placeSlice(null, 0); }
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
    {tubes.main.map((mesh, i) => <primitive key={`m${i}`} object={mesh} />)}
    {/* The C7 slice, enlarged and turned to face the viewer, joined to the cord by a line. */}
    <Rod from={A.cord} to={SLICE_AT} radius={0.012} color={palette.white} opacity={0.45} />
    <group ref={sliceFrame} position={[...SLICE_AT]}>
      <mesh position={[-0.7, 0, -0.6]}><circleGeometry args={[1.65, 48]} /><meshBasicMaterial color={palette.white} transparent opacity={0.07} depthWrite={false} /></mesh>
      <mesh position={[-0.7, 0, -0.6]}><ringGeometry args={[1.62, 1.68, 64]} /><meshBasicMaterial color={palette.white} transparent opacity={0.5} depthWrite={false} /></mesh>
      <group rotation={SLICE_TURN} scale={ENLARGE}>
        <group position={[-A.slice[0], -A.slice[1], -A.slice[2]]} {...handlers}><primitive object={arm.slice} /></group>
      </group>
      {tubes.slice.map((mesh, i) => <primitive key={`s${i}`} object={mesh} />)}
      <mesh ref={sliceDot} visible={false} renderOrder={8}><sphereGeometry args={[0.12, 14, 10]} /><meshBasicMaterial color={palette.white} toneMapped={false} depthTest={false} /></mesh>
    </group>
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
