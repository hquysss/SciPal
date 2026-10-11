'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { reflexState } from './engines/kneeReflex';

export type Point3 = readonly [number, number, number];
export type ReflexPalette = Readonly<Record<'background' | 'bone' | 'muscle' | 'stripe' | 'skin' | 'sensory' | 'motor' | 'inhibition' | 'metal' | 'seat' | 'white' | 'gray', string>>;
export type ReflexSceneState = { readonly palette: ReflexPalette; readonly time: RefObject<number> };

export function Ellipsoid({ at, scale, color, opacity = 1 }: { readonly at: Point3; readonly scale: Point3; readonly color: string; readonly opacity?: number }) {
  return <mesh position={[...at]} scale={[...scale]}><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color={color} roughness={0.7} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} /></mesh>;
}

export function Rod({ from, to, radius, color, opacity = 1 }: { readonly from: Point3; readonly to: Point3; readonly radius: number; readonly color: string; readonly opacity?: number }) {
  const pose = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    return { position: a.add(b).multiplyScalar(0.5), rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()), length: direction.length() };
  }, [from, to]);
  return <mesh position={pose.position} quaternion={pose.rotation}><cylinderGeometry args={[radius * 0.85, radius, pose.length, 16]} /><meshStandardMaterial color={color} roughness={0.6} transparent={opacity < 1} opacity={opacity} depthWrite={opacity === 1} /></mesh>;
}

export function Nerve({ points, color, time, signal, radius = 0.025 }: { readonly points: readonly Point3[]; readonly color: string; readonly time: RefObject<number>; readonly signal: 'sensory' | 'motor' | 'inhibitory' | 'spinal' | 'awareness' | 'blocked'; readonly radius?: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points]);
  const uniforms = useMemo(() => ({ tone: { value: new THREE.Color(color) }, progress: { value: -1 } }), [color]);
  const glow = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const value = signal === 'blocked' ? -1 : reflexState(time.current)[signal];
    uniforms.progress.value = value;
    if (glow.current) {
      glow.current.visible = value >= 0;
      if (value >= 0) curve.getPointAt(value, glow.current.position);
    }
  });
  return <group>
    <mesh><tubeGeometry args={[curve, 72, radius, 8, false]} /><shaderMaterial uniforms={uniforms} toneMapped={false}
      vertexShader={'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
      fragmentShader={'uniform vec3 tone; uniform float progress; varying vec2 vUv; void main(){float pulse=exp(-pow((vUv.x-progress)*32.0,2.0))*step(0.0,progress); gl_FragColor=vec4(mix(tone*0.65,vec3(1.0),pulse),1.0);\n#include <colorspace_fragment>\n}'}
    /></mesh>
    <mesh ref={glow}><sphereGeometry args={[radius * 2.8, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
  </group>;
}

export function FibreBundle({ palette, length = 1.65, width = 0.48 }: { readonly palette: ReflexPalette; readonly length?: number; readonly width?: number }) {
  return <group>{Array.from({ length: 15 }, (_, i) => {
    const angle = i * 2.39996;
    const r = Math.sqrt(i / 15) * width;
    return <mesh key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}>
      <cylinderGeometry args={[0.07, 0.055, length, 10, 1]} />
      <shaderMaterial uniforms={{ tone: { value: new THREE.Color(palette.muscle) }, stripe: { value: new THREE.Color(palette.stripe) } }}
        vertexShader={'varying vec2 vUv; varying vec3 vNormal; void main(){vUv=uv; vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
        fragmentShader={'uniform vec3 tone; uniform vec3 stripe; varying vec2 vUv; varying vec3 vNormal; void main(){float band=smoothstep(0.35,0.55,sin(vUv.y*220.0)); float light=0.65+0.35*max(0.0,dot(normalize(vNormal),normalize(vec3(0.4,0.8,1.0)))); gl_FragColor=vec4(mix(tone,stripe,band*0.48)*light,1.0);\n#include <colorspace_fragment>\n}'}
      />
    </mesh>;
  })}</group>;
}
