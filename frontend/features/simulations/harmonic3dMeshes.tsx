'use client';

import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ChalkText({ text, color, size = 0.24, position }: { readonly text: string; readonly color: string; readonly size?: number; readonly position: readonly [number, number, number] }) {
  const { texture, width } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return { texture: null, width: 1 };
    context.font = 'bold 80px Arial, sans-serif';
    const width = Math.ceil(context.measureText(text).width + 16);
    canvas.width = width;
    canvas.height = 112;
    context.font = 'bold 80px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, width / 2, 58);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, width };
  }, [text, color]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return (
    <mesh position={[...position]} castShadow>
      <planeGeometry args={[size * width / 80, size * 112 / 80]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.25} toneMapped={false} />
    </mesh>
  );
}

export function Ball({ color }: { readonly color: string }) {
  return <mesh castShadow><sphereGeometry args={[0.14, 32, 20]} /><meshStandardMaterial color={color} roughness={0.3} /></mesh>;
}

export function Arrow({ color, sample, depth = 0.35 }: { readonly color: string; readonly depth?: number; readonly sample: () => { x: number; y: number; dx: number; dy: number } }) {
  const refs = useMemo(() => ({ group: { current: null as THREE.Group | null }, rod: { current: null as THREE.Mesh | null }, tip: { current: null as THREE.Mesh | null } }), []);
  useFrame(() => {
    const { group, rod, tip } = refs;
    if (!group.current || !rod.current || !tip.current) return;
    const s = sample();
    const length = Math.hypot(s.dx, s.dy);
    const head = Math.min(0.17, length * 0.45);
    group.current.visible = length > 0.002;
    group.current.position.set(s.x, s.y, depth);
    group.current.rotation.z = Math.atan2(s.dy, s.dx) - Math.PI / 2;
    rod.current.scale.y = length - head;
    rod.current.position.y = (length - head) / 2;
    tip.current.scale.set(head / 0.17, head / 0.17, head / 0.17);
    tip.current.position.y = length - head / 2;
  });
  return (
    <group ref={refs.group}>
      <mesh ref={refs.rod} castShadow><cylinderGeometry args={[0.025, 0.025, 1, 12]} /><meshStandardMaterial color={color} /></mesh>
      <mesh ref={refs.tip} castShadow><coneGeometry args={[0.09, 0.17, 16]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

export function RadialRod({ angle, color, radius }: { readonly angle: RefObject<number>; readonly color: string; readonly radius: number }) {
  const group = useMemo(() => ({ current: null as THREE.Group | null }), []);
  useFrame(() => { if (group.current) group.current.rotation.z = angle.current - Math.PI / 2; });
  return <group ref={group}><mesh position={[0, radius / 2, 0.23]} castShadow><cylinderGeometry args={[0.015, 0.015, radius, 8]} /><meshStandardMaterial color={color} /></mesh></group>;
}
