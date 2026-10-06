'use client';

// The 3D graph view, loaded lazily and only in the browser. The window [xMin, xMax] × … is drawn
// as a cube of side 10 whatever its ranges, as math3d.org does; tick labels keep the real values.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { Box, ObjectColor, Shape, Vec3 } from './engines/graph3d';
import { LabelLayer, Rig, toThree, usePalette, useOrbit, ViewButtons, VIEW_CLASS, type Orbit } from './scene3d';
import type { Lang } from './types';

const SIDE = 10;
// A soft grey highlight on surfaces, as numbers so the theme check sees no raw colour.
const SPECULAR = new THREE.Color(0.2, 0.2, 0.2);
const FOV = 36;

const TOKENS = {
  ink: '--ink',
  muted: '--ink-muted',
  line: '--line',
  sun: '--sun',
  coral: '--coral',
  sky: '--sky',
  success: '--success',
  '--action': '--action',
  '--coral': '--coral',
  '--sky': '--sky',
  '--warning': '--warning',
  '--sun': '--sun',
} as const;
type Palette = Record<keyof typeof TOKENS, string>;

export interface GraphItem {
  id: string;
  shape: Shape;
  color: ObjectColor;
}

/** A round step giving about `count` ticks across a range. */
function tickStep(range: number, count: number): number {
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
}
const ticks = (min: number, max: number, count = 5) => {
  const step = tickStep(max - min, count);
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9 && out.length < 12; v += step) out.push(Number(v.toFixed(10)) + 0);
  return out;
};
const fmt = (v: number) => (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(0) : String(Number(v.toFixed(2)))).replace('-', '−');

function useWorld(box: Box) {
  return useMemo(() => {
    const c: Vec3 = [(box.xMin + box.xMax) / 2, (box.yMin + box.yMax) / 2, (box.zMin + box.zMax) / 2];
    const s: Vec3 = [SIDE / (box.xMax - box.xMin), SIDE / (box.yMax - box.yMin), SIDE / (box.zMax - box.zMin)];
    const world = (p: Vec3) => toThree([(p[0] - c[0]) * s[0], (p[1] - c[1]) * s[1], (p[2] - c[2]) * s[2]]);
    // Axes cross at the origin when it is in the window, else at the nearest corner.
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    const origin: Vec3 = [clamp(0, box.xMin, box.xMax), clamp(0, box.yMin, box.yMax), clamp(0, box.zMin, box.zMax)];
    return { world, scale: s, origin };
  }, [box]);
}

function Surface({ grid, world, box, palette }: { grid: Array<Array<Vec3 | null>>; world: (p: Vec3) => THREE.Vector3; box: Box; palette: Palette }) {
  const { mesh, wire } = useMemo(() => {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const positions: number[] = [];
    const colors: number[] = [];
    const index: number[] = [];
    const id = new Map<number, number>();
    const low = new THREE.Color(palette.sky);
    const mid = new THREE.Color(palette.sun);
    const high = new THREE.Color(palette.coral);
    const tint = new THREE.Color();
    // Colour by height, cool to warm, as the eye reads a relief map: over the surface's own range,
    // so a gentle surface still shows its whole spectrum.
    let zLow = Infinity;
    let zHigh = -Infinity;
    for (const row of grid) for (const p of row) if (p) [zLow, zHigh] = [Math.min(zLow, p[2]), Math.max(zHigh, p[2])];
    const span = zHigh - zLow > 1e-9 ? zHigh - zLow : 1;
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const p = grid[j]![i];
        if (!p) continue;
        const w = world(p);
        id.set(j * cols + i, positions.length / 3);
        positions.push(w.x, w.y, w.z);
        const t = zHigh - zLow > 1e-9 ? (p[2] - zLow) / span : 0.5;
        if (t < 0.5) tint.copy(low).lerp(mid, t * 2);
        else tint.copy(mid).lerp(high, (t - 0.5) * 2);
        colors.push(tint.r, tint.g, tint.b);
      }
    }
    const at = (j: number, i: number) => id.get(j * cols + i);
    for (let j = 0; j < rows - 1; j += 1) {
      for (let i = 0; i < cols - 1; i += 1) {
        const a = at(j, i);
        const b = at(j, i + 1);
        const c = at(j + 1, i);
        const d = at(j + 1, i + 1);
        if (a !== undefined && b !== undefined && d !== undefined) index.push(a, b, d);
        if (a !== undefined && d !== undefined && c !== undefined) index.push(a, d, c);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    // A light grid drawn on the surface, about twelve lines each way, like graph paper bent to shape.
    const every = Math.max(1, Math.round((cols - 1) / 12));
    const lines: number[] = [];
    const seg = (p: Vec3 | null | undefined, q: Vec3 | null | undefined) => {
      if (!p || !q) return;
      const a = world(p);
      const b = world(q);
      lines.push(a.x, a.y, a.z, b.x, b.y, b.z);
    };
    for (let j = 0; j < rows; j += every) for (let i = 0; i < cols - 1; i += 1) seg(grid[j]![i], grid[j]![i + 1]);
    for (let i = 0; i < cols; i += every) for (let j = 0; j < rows - 1; j += 1) seg(grid[j]![i], grid[j + 1]![i]);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    return { mesh: g, wire: lg };
  }, [grid, world, box, palette]);
  useEffect(
    () => () => {
      mesh.dispose();
      wire.dispose();
    },
    [mesh, wire],
  );
  return (
    <group>
      <mesh geometry={mesh}>
        <meshPhongMaterial vertexColors side={THREE.DoubleSide} shininess={45} specular={SPECULAR} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
      </mesh>
      <lineSegments geometry={wire}>
        <lineBasicMaterial color={palette.ink} transparent opacity={0.22} />
      </lineSegments>
    </group>
  );
}

function Tube({ points, radius, color }: { points: THREE.Vector3[]; radius: number; color: string }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    return new THREE.TubeGeometry(curve, Math.min(points.length * 2, 800), radius, 10, false);
  }, [points, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshPhongMaterial color={color} shininess={60} />
    </mesh>
  );
}

function Arrow({ from, to, color, radius }: { from: THREE.Vector3; to: THREE.Vector3; color: string; radius: number }) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = dir.length();
  if (length < 1e-6) return null;
  const head = Math.min(radius * 9, length * 0.4);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const shaftEnd = from.clone().add(dir.clone().setLength(length - head));
  const shaftMid = from.clone().add(shaftEnd).multiplyScalar(0.5);
  const headMid = shaftEnd.clone().add(dir.clone().setLength(head / 2));
  return (
    <group>
      <mesh position={shaftMid} quaternion={q}>
        <cylinderGeometry args={[radius, radius, length - head, 12]} />
        <meshPhongMaterial color={color} />
      </mesh>
      <mesh position={headMid} quaternion={q}>
        <coneGeometry args={[radius * 3, head, 18]} />
        <meshPhongMaterial color={color} />
      </mesh>
    </group>
  );
}

function Axes({ box, world, origin, palette }: { box: Box; world: (p: Vec3) => THREE.Vector3; origin: Vec3; palette: Palette }) {
  const grid = useMemo(() => {
    const lines: number[] = [];
    const push = (p: Vec3, q: Vec3) => {
      const a = world(p);
      const b = world(q);
      lines.push(a.x, a.y, a.z, b.x, b.y, b.z);
    };
    const z = origin[2];
    for (const x of ticks(box.xMin, box.xMax)) push([x, box.yMin, z], [x, box.yMax, z]);
    for (const y of ticks(box.yMin, box.yMax)) push([box.xMin, y, z], [box.xMax, y, z]);
    // The floor's frame closes the grid neatly at the window's edge.
    push([box.xMin, box.yMin, z], [box.xMax, box.yMin, z]);
    push([box.xMin, box.yMax, z], [box.xMax, box.yMax, z]);
    push([box.xMin, box.yMin, z], [box.xMin, box.yMax, z]);
    push([box.xMax, box.yMin, z], [box.xMax, box.yMax, z]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    return g;
  }, [box, world, origin]);
  useEffect(() => () => grid.dispose(), [grid]);
  const r = 0.035;
  const [ox, oy, oz] = origin;
  return (
    <group>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color={palette.line} />
      </lineSegments>
      <Arrow from={world([box.xMin, oy, oz])} to={world([box.xMax, oy, oz]).add(new THREE.Vector3(0.6, 0, 0))} color={palette.coral} radius={r} />
      <Arrow from={world([ox, box.yMin, oz])} to={world([ox, box.yMax, oz]).add(new THREE.Vector3(0, 0, -0.6))} color={palette.success} radius={r} />
      <Arrow from={world([ox, oy, box.zMin])} to={world([ox, oy, box.zMax]).add(new THREE.Vector3(0, 0.6, 0))} color={palette.sky} radius={r} />
    </group>
  );
}

export interface Graph3dSceneProps {
  items: GraphItem[];
  box: Box;
  description: string;
  lang: Lang;
}

export default function Graph3dScene({ items, box, description, lang }: Graph3dSceneProps) {
  const { world, scale, origin } = useWorld(box);
  const home = useMemo<Orbit>(() => ({ theta: (-58 * Math.PI) / 180, phi: (26 * Math.PI) / 180, dist: ((SIDE * Math.sqrt(3)) / 2 / Math.sin((FOV * Math.PI) / 360)) * 0.86 }), []);
  const { host, orbit, invalidate, handlers, zoom, reset } = useOrbit(home, { min: 6, max: 80 });
  const palette = usePalette(host, TOKENS);
  const labelEls = useRef(new Map<string, HTMLSpanElement>());
  // A small view gets fewer tick numbers, so they do not crowd the picture.
  const [count, setCount] = useState(5);
  useEffect(() => {
    const el = host.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setCount(entry!.contentRect.width < 420 ? 2.5 : 5));
    observer.observe(el);
    return () => observer.disconnect();
  }, [host]);
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Text riding on the view: axis names, tick values, point and vector names.
  const labels = useMemo(() => {
    const out: Array<{ key: string; text: string; tone: 'strong' | 'muted' | 'axis'; at: THREE.Vector3 }> = [];
    const [ox, oy, oz] = origin;
    out.push({ key: 'ax-x', text: 'x', tone: 'axis', at: world([box.xMax, oy, oz]).add(new THREE.Vector3(1.1, 0, 0)) });
    out.push({ key: 'ax-y', text: 'y', tone: 'axis', at: world([ox, box.yMax, oz]).add(new THREE.Vector3(0, 0, -1.1)) });
    out.push({ key: 'ax-z', text: 'z', tone: 'axis', at: world([ox, oy, box.zMax]).add(new THREE.Vector3(0, 1.1, 0)) });
    const lift = new THREE.Vector3(0, -0.45, 0);
    for (const v of ticks(box.xMin, box.xMax, count)) if (v !== ox) out.push({ key: `tx${v}`, text: fmt(v), tone: 'muted', at: world([v, oy, oz]).add(lift) });
    for (const v of ticks(box.yMin, box.yMax, count)) if (v !== oy) out.push({ key: `ty${v}`, text: fmt(v), tone: 'muted', at: world([ox, v, oz]).add(lift) });
    for (const v of ticks(box.zMin, box.zMax, count)) if (v !== oz) out.push({ key: `tz${v}`, text: fmt(v), tone: 'muted', at: world([ox, oy, v]).add(new THREE.Vector3(-0.45, 0, 0.45)) });
    out.push({ key: 'origin', text: 'O', tone: 'muted', at: world(origin).add(new THREE.Vector3(-0.35, -0.35, 0.35)) });
    for (const item of items) {
      const s = item.shape;
      if (s.type === 'point' && s.label) out.push({ key: `p${item.id}`, text: s.label, tone: 'strong', at: world(s.at).add(new THREE.Vector3(0.35, 0.4, 0)) });
      if (s.type === 'vector' && s.label) out.push({ key: `v${item.id}`, text: `${s.label}⃗`, tone: 'strong', at: world(s.to).add(new THREE.Vector3(0.35, 0.4, 0)) });
    }
    return out;
  }, [items, box, world, origin, count]);
  const pinned = useMemo(() => labels.map((l) => [l.key, l.at] as [string, THREE.Vector3]), [labels]);
  const onInvalidate = useMemo(() => (fn: () => void) => (invalidate.current = fn), [invalidate]);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={host}
        tabIndex={0}
        role="img"
        aria-roledescription={lang === 'en' ? '3D graph' : 'đồ thị 3D'}
        aria-label={description}
        {...handlers}
        style={{ touchAction: 'none' }}
        className={`${VIEW_CLASS} aspect-square max-h-[70vh] sm:aspect-[4/3]`}
      >
        {palette && (
          <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: FOV, near: 0.1, far: 500 }} gl={{ antialias: true }} aria-hidden="true">
            <Rig orbit={orbit} target={target} labels={labelEls} points={pinned} onInvalidate={onInvalidate} />
            <ambientLight intensity={1.1} />
            <directionalLight position={[8, 14, 10]} intensity={1.6} />
            <directionalLight position={[-10, -6, -8]} intensity={0.5} />
            <Axes box={box} world={world} origin={origin} palette={palette} />
            {items.map(({ id, shape, color }) => {
              const tone = palette[color];
              switch (shape.type) {
                case 'surface':
                  return <Surface key={id} grid={shape.grid} world={world} box={box} palette={palette} />;
                case 'curve':
                  return shape.segments.map((seg, k) => <Tube key={`${id}-${k}`} points={seg.map(world)} radius={0.07} color={tone} />);
                case 'point':
                  return (
                    <mesh key={id} position={world(shape.at)}>
                      <sphereGeometry args={[0.16, 24, 16]} />
                      <meshPhongMaterial color={tone} shininess={80} />
                    </mesh>
                  );
                case 'vector':
                  return <Arrow key={id} from={world([0, 0, 0])} to={world(shape.to)} color={tone} radius={0.05} />;
                case 'plane': {
                  if (shape.polygon.length < 3) return null;
                  const pts = shape.polygon.map(world);
                  const g = new THREE.BufferGeometry().setFromPoints(pts.flatMap((p, i) => (i < 2 ? [] : [pts[0]!, pts[i - 1]!, p])));
                  g.computeVertexNormals();
                  return (
                    <group key={id}>
                      <mesh geometry={g}>
                        <meshPhongMaterial color={tone} transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} />
                      </mesh>
                      <lineLoop geometry={new THREE.BufferGeometry().setFromPoints(pts)}>
                        <lineBasicMaterial color={tone} />
                      </lineLoop>
                    </group>
                  );
                }
                case 'sphere':
                  return (
                    <group key={id} position={world(shape.center)} scale={[shape.r * scale[0], shape.r * scale[2], shape.r * scale[1]]}>
                      <mesh>
                        <sphereGeometry args={[1, 56, 40]} />
                        <meshPhongMaterial color={tone} transparent opacity={0.5} shininess={70} depthWrite={false} />
                      </mesh>
                      <mesh>
                        <sphereGeometry args={[1.001, 18, 12]} />
                        <meshBasicMaterial color={tone} wireframe transparent opacity={0.18} />
                      </mesh>
                    </group>
                  );
                default:
                  return null;
              }
            })}
          </Canvas>
        )}
        <LabelLayer labels={labels} store={labelEls} />
      </div>
      <ViewButtons lang={lang} onReset={reset} onZoom={zoom} />
    </div>
  );
}
