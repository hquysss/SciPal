'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { reflexState } from './engines/kneeReflex';
import { Ellipsoid, FibreBundle, Nerve, Rod, type Point3, type ReflexSceneState } from './kneeReflexParts';

const SENSORY: readonly Point3[] = [[2.2, 1.24, 0.28], [1.1, 1.65, 0.22], [-0.55, 1.5, 0.24], [-1.1, 0.7, 0.26], [-1.58, 0.4, 0.28]];
const DIRECT: readonly Point3[] = [[-1.58, 0.4, 0.28], [-1.75, 0.18, 0.3], [-1.6, -0.28, 0.3]];
const MOTOR: readonly Point3[] = [[-1.6, -0.28, 0.3], [-0.75, 0.3, 0.3], [0.65, 0.4, 0.25], [2.05, 0.85, 0.27]];
const INHIBIT: readonly Point3[] = [[-1.58, 0.4, 0.28], [-2.1, 0.2, 0.3], [-2.1, -0.4, 0.3], [-1.65, -0.73, 0.3]];
const ANTAGONIST: readonly Point3[] = [[-1.65, -0.73, 0.3], [-0.8, -1.25, 0.24], [0.6, -1.45, 0.24], [2.05, -1.05, 0.27]];

function Neuron({ at, color }: { readonly at: Point3; readonly color: string }) {
  return <group position={[...at]}>
    <Ellipsoid at={[0, 0, 0]} scale={[0.1, 0.12, 0.06]} color={color} />
    {Array.from({ length: 7 }, (_, i) => {
      const angle = i * Math.PI * 2 / 7;
      const end: Point3 = [Math.cos(angle) * 0.22, Math.sin(angle) * 0.23, 0];
      return <group key={i}>
        <Rod from={[0, 0, 0]} to={end} radius={0.011} color={color} />
        <Rod from={end} to={[end[0] + Math.cos(angle + 0.6) * 0.09, end[1] + Math.sin(angle + 0.6) * 0.09, 0]} radius={0.006} color={color} />
      </group>;
    })}
  </group>;
}

export function ReflexCircuit({ palette: p, time }: ReflexSceneState) {
  const muscle = useRef<THREE.Group>(null);
  const antagonist = useRef<THREE.Group>(null);
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.12);
    s.bezierCurveTo(0.17, 0.2, 0.25, 0.75, 0.38, 0.8);
    s.bezierCurveTo(0.46, 0.47, 0.23, 0.24, 0.28, 0.02);
    s.bezierCurveTo(0.8, -0.42, 0.5, -0.8, 0.2, -0.53);
    s.bezierCurveTo(0.06, -0.25, -0.06, -0.25, -0.2, -0.53);
    s.bezierCurveTo(-0.5, -0.8, -0.8, -0.42, -0.28, 0.02);
    s.bezierCurveTo(-0.23, 0.24, -0.46, 0.47, -0.38, 0.8);
    s.bezierCurveTo(-0.25, 0.75, -0.17, 0.2, 0, 0.12);
    return s;
  }, []);
  useFrame(() => {
    const s = reflexState(time.current);
    if (muscle.current) muscle.current.scale.set(1 + s.contraction * 0.14, 1 - s.contraction * 0.18, 1);
    if (antagonist.current) antagonist.current.scale.y = 1 + s.contraction * 0.05;
  });
  return <group>
    <Ellipsoid at={[-2, 0, -0.08]} scale={[0.83, 1.2, 0.19]} color={p.bone} />
    <mesh position={[-2, 0, 0.12]}><extrudeGeometry args={[shape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, steps: 1, curveSegments: 18 }]} /><meshStandardMaterial color={p.gray} roughness={0.9} /></mesh>
    <Ellipsoid at={[-2, 0, 0.24]} scale={[0.06, 0.07, 0.015]} color={p.bone} />
    <Nerve points={SENSORY} color={p.sensory} time={time} signal="sensory" />
    <Nerve points={DIRECT} color={p.sensory} time={time} signal="spinal" />
    <Nerve points={MOTOR} color={p.motor} time={time} signal="motor" />
    <Nerve points={INHIBIT} color={p.inhibition} time={time} signal="inhibitory" />
    <Nerve points={ANTAGONIST} color={p.motor} time={time} signal="blocked" radius={0.016} />
    <Neuron at={[-1.6, -0.28, 0.3]} color={p.motor} />
    <Neuron at={[-2.1, 0.08, 0.32]} color={p.inhibition} />
    <Neuron at={[-1.65, -0.73, 0.3]} color={p.motor} />
    <group ref={muscle} position={[2.15, 0.88, 0]}><FibreBundle palette={p} length={1.65} width={0.32} /></group>
    <group ref={antagonist} position={[2.15, -1.15, 0]}><FibreBundle palette={p} length={1.3} width={0.28} /></group>
    <Ellipsoid at={[2.15, 1.22, 0.38]} scale={[0.07, 0.26, 0.055]} color={p.inhibition} />
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[2.15, 1.02 + i * 0.05, 0.38]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.07, 0.009, 6, 16]} /><meshBasicMaterial color={p.sensory} /></mesh>)}
    {[0.72, -1.13].map((y) => <group key={y}>
      {[0, 1, 2].map((i) => <Rod key={i} from={[2.05, y, 0.28]} to={[1.9 + i * 0.13, y + (i - 1) * 0.14, 0.36]} radius={0.014} color={p.motor} />)}
    </group>)}
  </group>;
}
