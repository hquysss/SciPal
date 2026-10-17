'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type Palette = Record<'background' | 'bench' | 'benchDark' | 'track' | 'plate' | 'grid' | 'ink' | 'trace' | 'envelope' | 'steel' | 'brass' | 'string' | 'case' | 'led', string>;

/** A box with softened edges, so the apparatus catches light like real moulded parts. */
export function RBox({ size, radius = 0.04, children, ...rest }: { readonly size: readonly [number, number, number]; readonly radius?: number; readonly children?: ReactNode } & Omit<React.ComponentProps<'mesh'>, 'args' | 'children'>) {
  const geometry = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(radius, Math.min(...size) / 2 - 0.001)), [size, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow receiveShadow {...rest}>{children}</mesh>;
}

function useCanvasTexture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void, deps: readonly unknown[]) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (context) draw(context);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Wooden bench top: base colour with long dark grain strokes. */
export function useWoodTexture({ base, dark }: { readonly base: string; readonly dark: string }) {
  return useCanvasTexture(1024, 512, (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 1024, 512);
    c.strokeStyle = dark;
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 160; i++) {
      c.globalAlpha = 0.05 + rand() * 0.14;
      c.lineWidth = 0.6 + rand() * 2.2;
      const y = rand() * 512;
      c.beginPath();
      c.moveTo(0, y);
      c.bezierCurveTo(300, y + (rand() - 0.5) * 22, 700, y + (rand() - 0.5) * 22, 1024, y + (rand() - 0.5) * 12);
      c.stroke();
    }
    c.globalAlpha = 1;
  }, [base, dark]);
}

/**
 * The plastic plate printed as graph paper: a time scale along x (every 0.5 s a line, every
 * second a number) and a centre line for zero displacement. Sized to the plate so lines stay square.
 */
export function usePlateTexture(p: { plate: string; grid: string; ink: string }, span: number, halfWidth: number, speed: number, seconds: number) {
  const pxPerUnit = 110;
  const length = span + 3;
  const w = Math.min(2048, Math.round(length * pxPerUnit));
  const h = Math.round(2 * halfWidth * pxPerUnit);
  return useCanvasTexture(w, h, (c) => {
    c.fillStyle = p.plate;
    c.fillRect(0, 0, w, h);
    const px = w / length;
    const fine = 0.25 * px;
    c.strokeStyle = p.grid;
    c.lineWidth = 1;
    c.globalAlpha = 0.28;
    for (let x = 0; x <= w; x += fine) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = h / 2 % fine; y <= h; y += fine) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.globalAlpha = 0.9;
    c.lineWidth = 2;
    c.fillStyle = p.ink;
    c.font = `600 ${Math.round(0.19 * px)}px system-ui, sans-serif`;
    c.textAlign = 'center';
    for (let k = 0; k <= seconds; k++) {
      const x = (1.5 + speed * k) * px;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.strokeStyle = p.grid; c.globalAlpha = k % 2 ? 0.45 : 0.75; c.stroke();
      c.globalAlpha = 0.95;
      c.fillText(String(k), x, h - 0.1 * px);
      c.fillText(String(k), x, 0.27 * px);
    }
    c.globalAlpha = 1;
    c.strokeStyle = p.ink;
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    c.textAlign = 'left';
    c.fillText('t (s)', 1.6 * px + speed * seconds * px, h / 2 - 0.14 * px);
  }, [p.plate, p.grid, p.ink, w, h, speed, seconds]);
}

/** Retort stand: cast base, ribbed rod, boss head with thumbscrew, arm, and the clamp that holds the string. */
export function Stand({ palette, z, pivotY, benchY }: { readonly palette: Palette; readonly z: number; readonly pivotY: number; readonly benchY: number }) {
  const top = pivotY + 0.55;
  const steel = <meshStandardMaterial color={palette.steel} metalness={0.55} roughness={0.42} />;
  return (
    <group position={[0, 0, z]}>
      <RBox size={[2.8, 0.2, 1.9]} radius={0.08} position={[0, benchY + 0.1, 0]}><meshStandardMaterial color={palette.case} metalness={0.6} roughness={0.55} /></RBox>
      <mesh castShadow position={[-0.9, benchY + 0.215, 0.55]}><cylinderGeometry args={[0.16, 0.18, 0.03, 24]} /><meshStandardMaterial color={palette.steel} metalness={0.55} roughness={0.45} /></mesh>
      <mesh castShadow position={[0, benchY + (top - benchY) / 2 + 0.1, 0]}><cylinderGeometry args={[0.075, 0.075, top - benchY, 24]} />{steel}</mesh>
      <mesh castShadow position={[0, benchY + 0.28, 0]}><cylinderGeometry args={[0.13, 0.16, 0.2, 24]} />{steel}</mesh>
      <RBox size={[0.3, 0.3, 0.3]} radius={0.05} position={[0, top, 0]}><meshStandardMaterial color={palette.steel} metalness={0.55} roughness={0.45} /></RBox>
      <mesh castShadow position={[0.27, top, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.25, 16]} />{steel}</mesh>
      <mesh castShadow position={[0.42, top, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.11, 0.11, 0.08, 20]} /><meshStandardMaterial color={palette.brass} metalness={0.5} roughness={0.45} /></mesh>
      <mesh castShadow position={[0, top, -z / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, -z + 0.1, 20]} />{steel}</mesh>
      <mesh castShadow position={[0, top, -z]}><sphereGeometry args={[0.07, 20, 12]} />{steel}</mesh>
      <mesh castShadow position={[0, (top + pivotY) / 2 + 0.03, -z]}><cylinderGeometry args={[0.04, 0.04, top - pivotY, 14]} />{steel}</mesh>
      <RBox size={[0.26, 0.2, 0.2]} radius={0.04} position={[0, pivotY + 0.02, -z]}><meshStandardMaterial color={palette.steel} metalness={0.55} roughness={0.45} /></RBox>
      <mesh castShadow position={[0.17, pivotY + 0.02, -z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, 0.12, 12]} />{steel}</mesh>
    </group>
  );
}

/** Power supply with a speed dial, a lit power LED and a printed readout, facing the viewer. */
export function PowerBox({ palette, position, speedLabel, dial }: { readonly palette: Palette; readonly position: readonly [number, number, number]; readonly speedLabel: string; readonly dial: number }) {
  const readout = useCanvasTexture(256, 96, (c) => {
    c.fillStyle = palette.case;
    c.fillRect(0, 0, 256, 96);
    c.fillStyle = palette.led;
    c.font = '700 54px ui-monospace, Consolas, monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(speedLabel, 128, 50);
  }, [speedLabel, palette.case, palette.led]);
  return (
    <group position={[position[0], position[1], position[2]]}>
      <RBox size={[1.6, 0.75, 1]} radius={0.07}><meshStandardMaterial color={palette.case} roughness={0.55} metalness={0.25} /></RBox>
      <mesh position={[-0.28, 0.12, 0.505]}><planeGeometry args={[0.7, 0.26]} /><meshBasicMaterial map={readout} toneMapped={false} /></mesh>
      <mesh castShadow position={[0.38, 0.05, 0.54]} rotation={[Math.PI / 2, dial, 0]}><cylinderGeometry args={[0.15, 0.17, 0.12, 28]} /><meshStandardMaterial color={palette.steel} metalness={0.55} roughness={0.42} /></mesh>
      <mesh position={[0.38, 0.05, 0.606]} rotation={[Math.PI / 2, dial, 0]}><boxGeometry args={[0.025, 0.003, 0.13]} /><meshBasicMaterial color={palette.trace} /></mesh>
      <mesh position={[-0.62, -0.18, 0.51]}><sphereGeometry args={[0.045, 16, 10]} /><meshStandardMaterial color={palette.led} emissive={palette.led} emissiveIntensity={2.2} /></mesh>
      <RBox size={[0.16, 0.1, 0.06]} radius={0.02} position={[-0.3, -0.18, 0.52]}><meshStandardMaterial color={palette.steel} metalness={0.6} roughness={0.4} /></RBox>
    </group>
  );
}

/** A power lead that sags along the bench between two points. */
export function Cable({ points, color }: { readonly points: ReadonlyArray<readonly [number, number, number]>; readonly color: string }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 48, 0.035, 8, false), [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color={color} roughness={0.7} /></mesh>;
}
