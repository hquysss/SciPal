'use client';

// The 3D view of a solid, drawn like a textbook figure: lit translucent faces, solid visible edges
// and dashed hidden ones that update as the solid turns. Loaded lazily and only in the browser.

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { bounds, type Solid, type Vec3 } from './engines/solid';
import { pick, type Lang } from './types';
import { LabelLayer, Rig, ViewButtons, VIEW_CLASS, toThree, useOrbit, usePalette, type Orbit } from './scene3d';

const FOV = 36;
const display = (name: string) => name.replace(/'/g, '′');

const TOKENS = { ink: '--ink', muted: '--ink-muted', face: '--sky', accent: '--coral', axis: '--ink-muted' } as const;
type Palette = Record<keyof typeof TOKENS, string>;

/** A thin tube between two points: WebGL lines are always 1px, too faint to read an edge by. */
function Rod({ from, to, radius, color }: { from: THREE.Vector3; to: THREE.Vector3; radius: number; color: string }) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(to, from);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5), quaternion: q, length: dir.length() };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/** A segment drawn solid, or dashed when it is hidden behind the solid. */
function Edge({ from, to, hidden, radius, color, dash }: { from: Vec3; to: Vec3; hidden: boolean; radius: number; color: string; dash: number }) {
  const p = toThree(from);
  const q = toThree(to);
  if (!hidden) return <Rod from={p} to={q} radius={radius} color={color} />;
  const n = Math.max(1, Math.round(p.distanceTo(q) / dash));
  const pieces = [];
  for (let i = 0; i < n; i += 1) {
    const a = p.clone().lerp(q, i / n);
    const b = p.clone().lerp(q, (i + 0.55) / n);
    pieces.push(<Rod key={i} from={a} to={b} radius={radius * 0.7} color={color} />);
  }
  return <>{pieces}</>;
}

const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const dot = (p: Vec3, q: Vec3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];

/** The camera position in math coordinates (z up), from the orbit around `center`. */
function eye(center: Vec3, o: Orbit): Vec3 {
  return [center[0] + o.dist * Math.cos(o.phi) * Math.cos(o.theta), center[1] + o.dist * Math.cos(o.phi) * Math.sin(o.theta), center[2] + o.dist * Math.sin(o.phi)];
}

/** Which faces of a convex polyhedron face the camera; an edge is visible when one of its faces is. */
function hiddenEdges(solid: Solid, cam: Vec3): Set<string> {
  const pts = Object.values(solid.points);
  const mid: Vec3 = pts.reduce<Vec3>((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  const visible = new Set<string>();
  for (const face of solid.faces) {
    const [a, b, c] = face.map((n) => solid.points[n]!);
    let normal = cross(sub(b!, a!), sub(c!, a!));
    if (dot(normal, sub(a!, mid)) < 0) normal = [-normal[0], -normal[1], -normal[2]];
    if (dot(normal, sub(cam, a!)) <= 1e-9) continue;
    face.forEach((n, i) => {
      const m = face[(i + 1) % face.length]!;
      visible.add(`${n}|${m}`).add(`${m}|${n}`);
    });
  }
  return new Set(solid.edges.filter(([a, b]) => !visible.has(`${a}|${b}`)).map(([a, b]) => `${a}|${b}`));
}

/** Flat faces, triangulated as fans (every face here is convex), lit so their tilt reads. */
function Faces({ solid, color }: { solid: Solid; color: string }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    for (const face of solid.faces) {
      const pts = face.map((n) => toThree(solid.points[n]!));
      for (let i = 1; i < pts.length - 1; i += 1) for (const p of [pts[0]!, pts[i]!, pts[i + 1]!]) positions.push(p.x, p.y, p.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  }, [solid]);
  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial color={color} transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/** A circle in a horizontal plane (or the vertical plane facing the camera), split into short pieces drawn solid or dashed. */
function Circle({ center, r, visible, radius, color, dash }: { center: Vec3; r: number; visible: (alpha: number) => boolean; radius: number; color: string; dash: number }) {
  const n = 96;
  const at = (i: number): Vec3 => {
    const a = (2 * Math.PI * i) / n;
    return [center[0] + r * Math.cos(a), center[1] + r * Math.sin(a), center[2]];
  };
  const pieces = [];
  const every = Math.max(2, Math.round(dash / ((2 * Math.PI * r) / n)));
  for (let i = 0; i < n; i += 1) {
    const shown = visible((2 * Math.PI * (i + 0.5)) / n);
    if (!shown && i % every >= every / 2) continue;
    pieces.push(<Rod key={i} from={toThree(at(i))} to={toThree(at(i + 1))} radius={shown ? radius : radius * 0.7} color={color} />);
  }
  return <>{pieces}</>;
}

function RoundSolid({ solid, palette, orbit, width, dash }: { solid: Solid; palette: Palette; orbit: Orbit; width: number; dash: number }) {
  const { r, h, type } = solid.round!;
  const { theta, phi } = orbit;
  // A point of a horizontal circle at angle α faces the camera when it lies on the camera's side.
  const front = (alpha: number) => Math.cos(alpha - theta) > 0;
  const material = <meshLambertMaterial color={palette.face} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />;
  if (type === 'sphere') {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[r, 64, 40]} />
          {material}
        </mesh>
        <Circle center={[0, 0, 0]} r={r} visible={(a) => (phi >= 0 ? front(a) : !front(a)) || Math.abs(phi) < 0.02} radius={width} color={palette.ink} dash={dash} />
      </group>
    );
  }
  // The two generators on the outline, where the side turns away from the camera.
  const rim = (alpha: number, z: number): Vec3 => [r * Math.cos(alpha), r * Math.sin(alpha), z];
  const sides = [theta + Math.PI / 2, theta - Math.PI / 2];
  const top: Vec3 = [0, 0, h];
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        {type === 'cylinder' ? <cylinderGeometry args={[r, r, h, 72, 1, true]} /> : <coneGeometry args={[r, h, 72, 1, true]} />}
        {material}
      </mesh>
      <Circle center={[0, 0, 0]} r={r} visible={(a) => phi < 0 || front(a)} radius={width} color={palette.ink} dash={dash} />
      {type === 'cylinder' && <Circle center={top} r={r} visible={(a) => phi > 0 || front(a)} radius={width} color={palette.ink} dash={dash} />}
      {sides.map((a) => (
        <Edge key={a} from={rim(a, 0)} to={type === 'cylinder' ? rim(a, h) : top} hidden={false} radius={width} color={palette.ink} dash={dash} />
      ))}
    </group>
  );
}

export interface SolidSceneProps {
  solid: Solid;
  segments: Array<{ from: string; to: string }>;
  labels: boolean;
  axes: boolean;
  description: string;
  lang: Lang;
}

export default function SolidScene({ solid, segments, labels, axes, description, lang }: SolidSceneProps) {
  const t = pick(lang);
  const size = bounds(solid).radius;
  // Each axis runs from O just past the solid on its side, so its name stays near the picture.
  const axisTips = useMemo<Array<[string, Vec3]>>(() => {
    if (!axes) return [];
    const all = Object.values(solid.points);
    const reach = (i: 0 | 1 | 2, round: number) => Math.max(...all.map((p) => p[i]), round) + size * 0.35;
    return [
      ['x', [reach(0, solid.round?.r ?? 0), 0, 0]],
      ['y', [0, reach(1, solid.round?.r ?? 0), 0]],
      ['z', [0, 0, reach(2, solid.round?.h ?? 0)]],
    ];
  }, [axes, solid, size]);
  const { center, radius } = useMemo(
    () => bounds({ ...solid, points: { ...solid.points, ...Object.fromEntries(axisTips.map(([n, p]) => [`axis-${n}`, p])) } }),
    [solid, axisTips],
  );
  const target = useMemo(() => toThree(center), [center]);
  const home = useMemo<Orbit>(() => ({ theta: (-62 * Math.PI) / 180, phi: (22 * Math.PI) / 180, dist: (radius / Math.sin((FOV * Math.PI) / 360)) * 1.22 }), [radius]);
  const limits = useMemo(() => ({ min: radius * 1.4, max: radius * 9 }), [radius]);
  const { host, orbit, invalidate, handlers, zoom, reset } = useOrbit(home, limits);
  const palette = usePalette(host, TOKENS);
  const labelEls = useMemo(() => ({ current: new Map<string, HTMLSpanElement>() }), []);

  // Read on every render: useOrbit re-renders on each move, so hidden edges follow the camera.
  const view = orbit.current;
  const cam = eye(center, view);
  const hidden = hiddenEdges(solid, cam);
  const rod = size * 0.011;
  const dash = size * 0.07;

  const pts = Object.entries(solid.points);
  const labelled: Array<[string, THREE.Vector3]> = [
    // Names sit just outside their vertex, away from the middle, so they never cover an edge.
    ...(labels ? pts.map(([n, p]) => [n, toThree(p).add(toThree(sub(p, center)).normalize().multiplyScalar(size * 0.12))] as [string, THREE.Vector3]) : []),
    ...axisTips.map(([n, p]) => [`axis-${n}`, toThree(p)] as [string, THREE.Vector3]),
  ];
  const layer = [
    ...(labels ? pts.map(([n]) => ({ key: n, text: display(n) })) : []),
    ...axisTips.map(([n]) => ({ key: `axis-${n}`, text: n, tone: 'axis' as const })),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={host}
        tabIndex={0}
        role="img"
        aria-roledescription={t({ en: '3D view', vi: 'hình 3D' })}
        aria-label={description}
        {...handlers}
        style={{ touchAction: 'none' }}
        className={`${VIEW_CLASS} aspect-[4/3]`}
      >
        {palette && (
          <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: FOV, near: 0.01, far: 1000 }} aria-hidden="true">
            <ambientLight intensity={1.6} />
            <directionalLight position={[4, 8, 6]} intensity={1.4} />
            <Rig orbit={orbit} target={target} labels={labelEls} points={labelled} onInvalidate={(fn) => (invalidate.current = fn)} />
            {solid.round ? <RoundSolid solid={solid} palette={palette} orbit={view} width={rod} dash={dash} /> : <Faces solid={solid} color={palette.face} />}
            {solid.edges.map(([a, b]) => (
              <Edge key={`${a}${b}`} from={solid.points[a]!} to={solid.points[b]!} hidden={hidden.has(`${a}|${b}`)} radius={rod} color={palette.ink} dash={dash} />
            ))}
            {segments.map(({ from, to }) => {
              const p = solid.points[from];
              const q = solid.points[to];
              return p && q ? <Edge key={`s${from}${to}`} from={p} to={q} hidden={false} radius={rod * 1.3} color={palette.accent} dash={dash} /> : null;
            })}
            {pts.map(([n, p]) => (
              <mesh key={n} position={toThree(p)}>
                <sphereGeometry args={[rod * 2.4, 16, 12]} />
                <meshBasicMaterial color={palette.ink} />
              </mesh>
            ))}
            {axisTips.map(([n, p]) => (
              <Edge key={`axis${n}`} from={[0, 0, 0]} to={p} hidden={false} radius={rod * 0.55} color={palette.axis} dash={dash} />
            ))}
          </Canvas>
        )}
        <LabelLayer labels={layer} store={labelEls} />
      </div>
      <ViewButtons lang={lang} onReset={reset} onZoom={zoom} />
    </div>
  );
}
