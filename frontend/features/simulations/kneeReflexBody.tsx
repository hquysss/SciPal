'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { reflexState } from './engines/kneeReflex';
import { Ellipsoid, Nerve, Rod, type Point3, type ReflexSceneState } from './kneeReflexParts';
import { ReflexAnatomy } from './kneeReflexAnatomy';
import { KNEE_REFLEX_LANDMARKS as landmarks } from './kneeReflexLandmarks';

const SENSORY: readonly Point3[] = [[0.45, -0.28, 0.35], [0.2, 0, 0.28], [-0.45, 0.05, 0.2], [-1.02, 0.3, -0.18], landmarks.reflexCordPoint];
const MOTOR: readonly Point3[] = [landmarks.reflexCordPoint, [-0.96, 0.25, -0.12], [-0.7, 0.04, 0.35], [0.1, -0.1, 0.4], [0.7, -0.35, 0.4]];
const AWARENESS: readonly Point3[] = [landmarks.reflexCordPoint, ...landmarks.cordPoints.slice(0, -2).reverse().map((point): Point3 => [point[0], point[1], point[2] + 0.036]), landmarks.brainCenter];

function Brain({ color }: { readonly color: string }) {
  const ridges = useMemo(() => Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2;
    const points = Array.from({ length: 24 }, (_, j) => {
      const t = (j / 23) * Math.PI;
      const wobble = Math.sin(t * 9 + a * 3) * 0.025;
      return new THREE.Vector3(Math.cos(a) * Math.sin(t) + wobble, Math.cos(t), Math.sin(a) * Math.sin(t) + wobble);
    });
    return new THREE.CatmullRomCurve3(points);
  }), []);
  return <group position={[...landmarks.brainCenter]} scale={[...landmarks.brainScale]}>
    <Ellipsoid at={[0, 0, 0]} scale={[0.98, 0.96, 0.96]} color={color} />
    {ridges.map((curve, i) => <mesh key={i}><tubeGeometry args={[curve, 36, 0.045, 6, false]} /><meshStandardMaterial color={color} roughness={0.8} /></mesh>)}
  </group>;
}

export function ReflexBody({ palette: p, time }: ReflexSceneState) {
  const hammer = useRef<THREE.Group>(null);
  const cord = useMemo(() => new THREE.CatmullRomCurve3(landmarks.cordPoints.map((point) => new THREE.Vector3(...point))), []);
  useFrame(() => {
    if (hammer.current) hammer.current.rotation.z = -0.55 + reflexState(time.current).hammer * 0.6;
  });
  return <group position={[0, -0.2, 0]}>
    <ReflexAnatomy palette={p} time={time} />
    <Brain color={p.muscle} />
    <mesh><tubeGeometry args={[cord, 128, 0.03, 10, false]} /><meshStandardMaterial color={p.bone} roughness={0.6} /></mesh>
    <group ref={hammer} position={[1.8, -0.35, 0.35]}>
      <Rod from={[0, 0, 0]} to={[-0.51, -0.35, 0]} radius={0.025} color={p.metal} />
      <mesh position={[-0.56, -0.38, 0]} rotation={[0, 0, -0.6]}><cylinderGeometry args={[0.11, 0.11, 0.18, 16]} /><meshStandardMaterial color={p.seat} /></mesh>
    </group>
    <Nerve points={SENSORY} color={p.sensory} time={time} signal="sensory" />
    <Nerve points={MOTOR} color={p.motor} time={time} signal="motor" />
    <Nerve points={AWARENESS} color={p.sensory} time={time} signal="awareness" radius={0.012} />
    <Ellipsoid at={[0.43, -0.24, 0.34]} scale={[0.16, 0.06, 0.055]} color={p.inhibition} />
    <mesh position={[-0.73, -1.05, -0.09]}><cylinderGeometry args={[0.73, 0.73, 0.17, 48]} /><meshStandardMaterial color={p.seat} roughness={0.9} /></mesh>
    <Rod from={[-0.73, -1.12, -0.09]} to={[-0.73, -2.72, -0.09]} radius={0.065} color={p.metal} />
    {Array.from({ length: 5 }, (_, i) => {
      const a = i * Math.PI * 2 / 5;
      return <Rod key={i} from={[-0.73, -2.65, -0.09]} to={[-0.73 + Math.cos(a) * 0.65, -2.78, -0.09 + Math.sin(a) * 0.65]} radius={0.04} color={p.metal} />;
    })}
  </group>;
}
