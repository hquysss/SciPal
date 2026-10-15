'use client';

// The 3D history map: the region's relief raised from its height grid, the areas held so far
// painted onto the ground (clipped to land), this step's marches as tubes that hug the terrain and
// grow in order of travel, and place names pinned over their spots. Loaded lazily, browser only.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { HistoryMapRegion } from '@scipal/types';
import { areaGrowth, areaOrigins, assetBase, densify, heightAt, marchProgress, namedAt, placeTimes, placesAt, projection, stepFraction, stepFrame, type HistoryMap, type LonLat } from './historyMapGeo';
import { usePalette } from './scene3d';
import { clampView, type MapCamera } from './historyMapCamera';
import { pick, type Lang } from './types';
import { PLACE_MARK, type Palette, MAP_TOKENS } from './historyMapStyle';

const FOV = 40;
/** Relief is exaggerated so hills read at the scale of a whole region. */
const EXAGGERATION = 16;
const METRES_PER_UNIT = 111_000;

type Meta = { texture: [number, number]; heights: [number, number] };
type Assets = { meta: Meta; heights: Uint16Array; relief: HTMLImageElement; land: HTMLImageElement };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Cannot load ${src}`));
    img.src = src;
  });
}

async function fetchOk(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cannot load ${url}`);
  return res;
}

/** The region's terrain files; a failure is thrown so the boundary shows the flat map instead. */
function useAssets(region: HistoryMapRegion) {
  const [state, setState] = useState<{ region: HistoryMapRegion; assets?: Assets; error?: Error } | null>(null);
  useEffect(() => {
    let live = true;
    const base = assetBase(region);
    Promise.all([
      fetchOk(`${base}/meta.json`).then((r) => r.json() as Promise<Meta>),
      fetchOk(`${base}/heights.bin`).then((r) => r.arrayBuffer()),
      loadImage(`${base}/relief.jpg`),
      loadImage(`${base}/land.png`),
    ]).then(
      ([meta, buffer, relief, land]) => live && setState({ region, assets: { meta, heights: new Uint16Array(buffer), relief, land } }),
      (error: Error) => live && setState({ region, error }),
    );
    return () => {
      live = false;
    };
  }, [region]);
  if (state?.error) throw state.error;
  return state?.region === region ? state.assets ?? null : null;
}

/** Draws `list` of areas (each with its step index) onto `areas`, at `scale` of the texture size. */
function drawAreas(areas: CanvasRenderingContext2D, list: Array<{ area: HistoryMap['steps'][number]['areas'][number]; i: number; clip?: { u: number; v: number; r: number } }>, step: number, palette: Palette, toUv: (p: LonLat) => [number, number], w: number, h: number) {
  for (const { area, i, clip } of list) {
    areas.save();
    if (clip) {
      areas.beginPath();
      areas.arc(clip.u * w, clip.v * h, clip.r, 0, Math.PI * 2);
      areas.clip();
    }
    areas.beginPath();
    area.points.forEach((p, j) => {
      const [u, v] = toUv(p);
      if (j === 0) areas.moveTo(u * w, v * h);
      else areas.lineTo(u * w, v * h);
    });
    areas.closePath();
    const color = area.side === 'ours' ? palette.area : palette.enemy;
    areas.globalAlpha = i === step ? 0.5 : 0.28;
    areas.fillStyle = color;
    areas.fill();
    areas.globalAlpha = 0.9;
    areas.strokeStyle = color;
    areas.lineWidth = (5 * w) / Math.max(w, 1536);
    areas.stroke();
    areas.restore();
  }
}

/** Keeps a layer to the land: everything over the sea is cut away. */
function clipToLand(layer: HTMLCanvasElement, land: HTMLImageElement) {
  const ctx = layer.getContext('2d')!;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(land, 0, 0, layer.width, layer.height);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * The relief with every area held before `step`, kept off the sea. Painted once per step: the areas
 * of `step` itself spread over it frame by frame (see `paintSpread`), which only redraws those.
 */
function paintBase(base: HTMLCanvasElement, layer: HTMLCanvasElement, assets: Assets, config: HistoryMap, step: number, palette: Palette) {
  const [w, h] = [assets.relief.naturalWidth, assets.relief.naturalHeight];
  base.width = layer.width = w;
  base.height = layer.height = h;
  const ctx = base.getContext('2d')!;
  const { toUv } = projection(config.region);
  ctx.drawImage(assets.relief, 0, 0, w, h);
  const older = config.steps.slice(0, step).flatMap((s, i) => s.areas.map((area) => ({ area, i })));
  if (older.length === 0) return;
  drawAreas(layer.getContext('2d')!, older, step, palette, toUv, w, h);
  clipToLand(layer, assets.land);
  ctx.drawImage(layer, 0, 0);
}

/**
 * The ground: the cached base plus this step's areas spread `grow` (0–1) out from their origins,
 * like ink. The spreading layer is drawn at half size, which is plenty for soft area fills.
 */
function paintSpread(canvas: HTMLCanvasElement, base: HTMLCanvasElement, small: HTMLCanvasElement, assets: Assets, config: HistoryMap, step: number, palette: Palette, grow: number) {
  const [w, h] = [base.width, base.height];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(base, 0, 0);
  const areas = config.steps[step]?.areas ?? [];
  if (areas.length === 0 || grow <= 0) return;
  const [sw, sh] = [Math.round(w / 2), Math.round(h / 2)];
  small.width = sw;
  small.height = sh;
  const { toUv } = projection(config.region);
  const origins = areaOrigins(config, step);
  const list = areas.map((area, j) => {
    if (grow >= 1) return { area, i: step };
    const [ou, ov] = toUv(origins[j]!);
    const reach = Math.max(...area.points.map((q) => {
      const [u, v] = toUv(q);
      return Math.hypot((u - ou) * sw, (v - ov) * sh);
    }));
    return { area, i: step, clip: { u: ou, v: ov, r: reach * grow + 1 } };
  });
  drawAreas(small.getContext('2d')!, list, step, palette, toUv, sw, sh);
  clipToLand(small, assets.land);
  ctx.drawImage(small, 0, 0, w, h);
}

function Terrain({ assets, config, step, palette, pos }: { assets: Assets; config: HistoryMap; step: number; palette: Palette; pos: React.RefObject<number> }) {
  const { invalidate } = useThree();
  const proj = projection(config.region);
  const geometry = useMemo(() => {
    const [gw, gh] = assets.meta.heights;
    const sx = Math.min(gw - 1, 255);
    const sy = Math.round((sx * proj.height) / proj.width);
    const g = new THREE.PlaneGeometry(proj.width, proj.height, sx, sy);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position!;
    for (let iy = 0; iy <= sy; iy += 1) {
      for (let ix = 0; ix <= sx; ix += 1) {
        const m = heightAt(assets.heights, gw, gh, ix / sx, iy / sy);
        pos.setY(iy * (sx + 1) + ix, (m / METRES_PER_UNIT) * EXAGGERATION);
      }
    }
    g.computeVertexNormals();
    return g;
  }, [assets, proj.width, proj.height]);
  const [canvas, layer, base, small] = useMemo(() => [document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas'), document.createElement('canvas')], []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [canvas]);
  const hasRoutes = (config.steps[step]?.routes.length ?? 0) > 0;
  const painted = useRef(-1);
  const lastPaint = useRef(0);
  const paint = (grow: number) => {
    paintSpread(canvas, base, small, assets, config, step, palette, grow);
    painted.current = grow;
    lastPaint.current = performance.now();
    texture.needsUpdate = true;
  };
  useEffect(() => {
    paintBase(base, layer, assets, config, step, palette);
    paint(areaGrowth(stepFraction(pos.current ?? 0, step), hasRoutes));
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, layer, base, small, assets, config, step, palette, texture, invalidate]);
  // Each repaint uploads the whole ground texture, so the spreading areas are redrawn at most
  // every 90 ms (and once more when they finish or go back).
  useFrame(() => {
    const grow = areaGrowth(stepFraction(pos.current ?? 0, step), hasRoutes);
    if (grow === painted.current) return;
    const settled = grow === 0 || grow === 1;
    if (settled || performance.now() - lastPaint.current > 90) paint(grow);
  });
  useEffect(() => () => {
    geometry.dispose();
    texture.dispose();
  }, [geometry, texture]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

type Route = HistoryMap['steps'][number]['routes'][number];

/** One march: a tube over the ground, dashed for a retreat, with an arrowhead at its tip. */
/**
 * A flat band along the march, lying on the ground like ink on a paper map (not a round tube): two
 * vertices per point, offset sideways in the ground plane. Six indices per segment, so a draw range
 * can grow it segment by segment.
 */
function ribbon(points: THREE.Vector3[], halfWidth: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(i - 1, 0)]!;
    const b = points[Math.min(i + 1, points.length - 1)]!;
    const side = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(halfWidth);
    positions.push(p.x + side.x, p.y, p.z + side.z, p.x - side.x, p.y, p.z - side.z);
    if (i > 0) {
      const k = 2 * i;
      index.push(k - 2, k - 1, k, k - 1, k + 1, k);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  return geometry;
}

/** A flat arrowhead pointing along +x in the ground plane. */
function arrowHead(halfWidth: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const w = halfWidth * 3.2;
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([w * 2.2, 0, 0, -w * 0.4, 0, w, -w * 0.4, 0, -w], 3));
  return geometry;
}

function March({ route, index, progress, palette, toScene, radius, heads }: { route: Route; index: number; progress: React.RefObject<number>; palette: Palette; toScene: ToScene; radius: number; heads: React.RefObject<Array<THREE.Vector3 | null>> }) {
  const { invalidate } = useThree();
  const path = useMemo(() => densify(route.points).map((p) => toScene(p)), [route.points, toScene]);
  const pieces = useMemo(() => {
    if (!route.dashed) return [{ from: 0, to: path.length - 1 }];
    const out = [];
    for (let i = 0; i < path.length - 1; i += 4) out.push({ from: i, to: Math.min(i + 2, path.length - 1) });
    return out;
  }, [path.length, route.dashed]);
  const tubes = useMemo(
    () =>
      pieces.map(({ from, to }) => {
        const points = path.slice(from, to + 1);
        return { from, to, core: ribbon(points, radius), casing: ribbon(points, radius * 1.8) };
      }),
    [pieces, path, radius],
  );
  useEffect(() => () => tubes.forEach((t) => (t.core.dispose(), t.casing.dispose())), [tubes]);
  const headGeometry = useMemo(() => arrowHead(radius), [radius]);
  useEffect(() => () => headGeometry.dispose(), [headGeometry]);
  const head = useRef<THREE.Mesh>(null);
  const tip = useMemo(() => new THREE.Vector3(), []);
  const dirV = useMemo(() => new THREE.Vector3(), []);
  const meshes = useRef<Array<THREE.Mesh | null>>([]);
  const color = route.side === 'ours' ? palette.ours : palette.enemy;

  useFrame(() => {
    const p = Math.min(Math.max(progress.current - index, 0), 1);
    const last = path.length - 1;
    tubes.forEach((t, i) => {
      const local = Math.min(Math.max((p * last - t.from) / Math.max(t.to - t.from, 1), 0), 1);
      for (const k of [2 * i, 2 * i + 1]) {
        const mesh = meshes.current[k];
        if (!mesh) continue;
        const geometry = mesh.geometry as THREE.BufferGeometry;
        mesh.visible = local > 0;
        geometry.setDrawRange(0, Math.floor((geometry.index?.count ?? 0) * local / 6) * 6);
      }
    });
    if (head.current) {
      // Walk along the path between its points, so the arrow (and a camera following it) glides.
      const f = Math.min(Math.max(p * last, 0), last);
      const i0 = Math.min(Math.floor(f), Math.max(last - 1, 0));
      const a = path[i0]!;
      const b = path[Math.min(i0 + 1, last)]!;
      tip.copy(a).lerp(b, f - i0);
      const dir = dirV.copy(b).sub(a);
      if (dir.lengthSq() > 1e-12) head.current.rotation.set(0, Math.atan2(-dir.z, dir.x), 0);
      head.current.visible = p > 0;
      head.current.position.copy(tip);
      heads.current[index] = p > 0 ? tip : null;
    }
  });
  useEffect(() => invalidate(), [invalidate, color]);

  return (
    <group>
      {tubes.map((t, i) => (
        <group key={i}>
          <mesh ref={(m) => void (meshes.current[2 * i] = m)} geometry={t.casing} renderOrder={1}>
            <meshBasicMaterial color={palette.casing} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
          <mesh ref={(m) => void (meshes.current[2 * i + 1] = m)} geometry={t.core} renderOrder={2}>
            <meshBasicMaterial color={color} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
        </group>
      ))}
      <mesh ref={head} geometry={headGeometry} renderOrder={2}>
        <meshBasicMaterial color={color} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </group>
  );
}

/** A lon/lat point in the scene, `lift` above the ground (or at `height` when given). */
type ToScene = (p: LonLat, height?: number) => THREE.Vector3;
const LIFT = 0.03;

/**
 * The camera. It eases toward what the reader asked for (turn, tilt, zoom, slide) and toward where the
 * story is: the frame of the step, or, while a march is drawn and the camera follows, the march's
 * head, closer in. Everything is clamped to the region. Draws on demand and keeps drawing until it settles.
 */
function MapRig({
  camera: cam,
  frame,
  bounds,
  reduced,
  follow,
  progress,
  routes,
  heads,
  labels,
  anchors,
  onInvalidate,
  pos,
  step,
}: {
  camera: MapCamera;
  frame: { target: THREE.Vector3; span: [number, number] };
  bounds: { halfW: number; halfH: number };
  reduced: boolean;
  follow: boolean;
  progress: React.RefObject<number>;
  routes: number;
  heads: React.RefObject<Array<THREE.Vector3 | null>>;
  labels: React.RefObject<Map<number, HTMLElement>>;
  anchors: Array<[number, THREE.Vector3, number]>;
  onInvalidate: (fn: () => void) => void;
  pos: React.RefObject<number>;
  step: number;
}) {
  const { camera, size, invalidate } = useThree();
  const now = useRef<{ theta: number; phi: number; dist: number; base: number; target: THREE.Vector3 } | null>(null);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => onInvalidate(invalidate), [invalidate, onInvalidate]);
  useEffect(() => invalidate(), [anchors, follow, invalidate]);

  const tan = Math.tan(((FOV / 2) * Math.PI) / 180);
  const fit = (aspect: number) => (Math.max(frame.span[1], frame.span[0] / aspect) / (2 * tan)) * 1.05;

  useEffect(() => {
    heads.current.length = 0;
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, reduced, routes]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const aspect = size.width / Math.max(size.height, 1);
    const view = cam.view.current;
    const panLimit = Math.max(...frame.span) * 0.7;
    cam.panLimit.current = panLimit;
    const want = clampView(view, panLimit);
    cam.view.current = want;
    const base = fit(aspect);
    // The marches are drawn as far as the slider has gone through this step.
    const frac = stepFraction(pos.current ?? 0, step);
    progress.current = marchProgress(frac, routes);

    // Where the story is: the head of the march being drawn, else the frame's centre.
    const idx = Math.min(Math.floor(progress.current), routes - 1);
    const head = follow && !reduced && routes > 0 && progress.current < routes ? heads.current[idx] : null;
    goal.copy(head ?? frame.target);
    if (head) goal.lerp(frame.target, 0.25); // stay loosely anchored to the stage's frame
    const zoomIn = head ? 0.72 : 1;
    goal.x += want.panX;
    goal.z += want.panZ;
    goal.x = Math.min(Math.max(goal.x, -bounds.halfW), bounds.halfW);
    goal.z = Math.min(Math.max(goal.z, -bounds.halfH), bounds.halfH);

    if (!now.current) now.current = { theta: want.theta, phi: want.phi, dist: want.dist, base: base * zoomIn, target: goal.clone() };
    const c = now.current;
    let busy = false;
    if (reduced) {
      c.theta = want.theta;
      c.phi = want.phi;
      c.dist = want.dist;
      c.base = base * zoomIn;
      c.target.copy(goal);
    } else {
      // Critically damped easing: the view turns quickly, the target glides.
      const fast = 1 - Math.exp(-dt * 9);
      const slow = 1 - Math.exp(-dt * (head ? 3.2 : 2.4));
      c.theta += (want.theta - c.theta) * fast;
      c.phi += (want.phi - c.phi) * fast;
      c.dist += (want.dist - c.dist) * fast;
      c.base += (base * zoomIn - c.base) * slow;
      c.target.lerp(goal, slow);
      if (
        Math.abs(want.theta - c.theta) > 0.0005 ||
        Math.abs(want.phi - c.phi) > 0.0005 ||
        Math.abs(want.dist - c.dist) > 0.0005 ||
        Math.abs(base * zoomIn - c.base) > 0.002 ||
        c.target.distanceTo(goal) > 0.0015
      )
        busy = true;
    }

    const d = c.base * c.dist;
    cam.worldPerPixel.current = (2 * d * tan) / Math.max(size.height, 1);
    camera.position.set(c.target.x + d * Math.cos(c.phi) * Math.cos(c.theta), c.target.y + d * Math.sin(c.phi), c.target.z - d * Math.cos(c.phi) * Math.sin(c.theta));
    camera.lookAt(c.target);
    camera.updateMatrixWorld();
    for (const [key, p, at] of anchors) {
      const el = labels.current.get(key);
      if (!el) continue;
      v.copy(p).project(camera);
      // A new place waits until a march reaches it.
      const off = frac < at || v.z > 1 || Math.abs(v.x) > 1.02 || Math.abs(v.y) > 1.02;
      el.style.visibility = off ? 'hidden' : 'visible';
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    }
    if (busy) invalidate();
  });
  return null;
}

export default memo(function HistoryMapScene({
  config,
  step,
  lang,
  reduced,
  follow,
  camera: cam,
  onSelect,
  pos,
}: {
  config: HistoryMap;
  step: number;
  /** The slider position, read every frame (it moves continuously). */
  pos: React.RefObject<number>;
  lang: Lang;
  reduced: boolean;
  follow: boolean;
  camera: MapCamera;
  onSelect: (index: number) => void;
}) {
  const t = pick(lang);
  const assets = useAssets(config.region);
  const palette = usePalette(cam.host, MAP_TOKENS);
  const labels = useRef(new Map<number, HTMLElement>());
  const progress = useRef(0);
  const heads = useRef<Array<THREE.Vector3 | null>>([]);
  const bounds = useMemo(() => {
    const proj = projection(config.region);
    return { halfW: proj.width / 2, halfH: proj.height / 2 };
  }, [config.region]);
  const setInvalidate = useCallback((fn: () => void) => {
    cam.invalidate.current = fn;
  }, [cam.invalidate]);

  const toScene = useMemo<ToScene>(() => {
    const { toUv, toPlane } = projection(config.region);
    return (p, height) => {
      const [x, y] = toPlane(p);
      let h = height;
      if (h === undefined) {
        const [u, v] = toUv(p);
        let m = 0;
        if (assets) {
          // The mesh is coarser than the grid, so clear the highest ground around the point.
          const [gw, gh] = assets.meta.heights;
          for (const [du, dv] of [[0, 0], [-2, 0], [2, 0], [0, -2], [0, 2]] as const) m = Math.max(m, heightAt(assets.heights, gw, gh, u + du / gw, v + dv / gh));
        }
        h = (m / METRES_PER_UNIT) * EXAGGERATION + LIFT;
      }
      return new THREE.Vector3(x, h, -y);
    };
  }, [assets, config.region]);

  const frame = useMemo(() => {
    const f = stepFrame(config, step);
    const proj = projection(config.region);
    const [x0, y0] = proj.toPlane([f.west, f.south]);
    const [x1, y1] = proj.toPlane([f.east, f.north]);
    return { target: toScene([(f.west + f.east) / 2, (f.south + f.north) / 2], 0), span: [x1 - x0, y1 - y0] as [number, number] };
  }, [config, step, toScene]);

  const places = placesAt(config, step);
  const anchors = useMemo(() => {
    const times = placeTimes(config, step);
    return config.places.flatMap((p, i) => (p.from <= step ? [[i, toScene([p.lon, p.lat], p.type === 'area' ? 0.05 : undefined), times.get(i) ?? 0] as [number, THREE.Vector3, number]] : []));
  }, [config, toScene, step]);
  const routes = config.steps[step]?.routes ?? [];

  return (
    <>
        {assets && palette ? (
          <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: FOV, near: 0.02, far: 200 }} gl={{ antialias: true }}>
            <Terrain assets={assets} config={config} step={step} palette={palette} pos={pos} />
            {routes.map((route, i) => (
              <March key={`${step}-${i}`} route={route} index={i} progress={progress} palette={palette} toScene={toScene} radius={Math.max(...frame.span) * 0.005} heads={heads} />
            ))}
            <MapRig camera={cam} frame={frame} bounds={bounds} reduced={reduced} follow={follow} progress={progress} routes={routes.length} heads={heads} labels={labels} anchors={anchors} onInvalidate={setInvalidate} pos={pos} step={step} />
          </Canvas>
        ) : (
          <div className="grid h-full place-items-center text-sm text-ink-muted">{t({ en: 'Loading the 3D map…', vi: 'Đang tải bản đồ 3D…' })}</div>
        )}
        {assets &&
          places.map((p) => {
            const i = config.places.indexOf(p);
            const area = p.type === 'area';
            const text = (
              <>
                {!area && <span aria-hidden="true" className={p.type === 'city' ? 'text-ink' : 'text-danger'}>{PLACE_MARK[p.type]} </span>}
                {namedAt(config, p, step) && t(p.name)}
              </>
            );
            const cls = `absolute left-0 top-0 select-none whitespace-nowrap ${area ? 'text-xs font-semibold uppercase italic tracking-wide text-ink-muted' : 'text-xs font-bold text-ink sm:text-sm'}`;
            const style = { visibility: 'hidden' as const, textShadow: '0 0 3px var(--surface), 0 0 3px var(--surface), 0 0 2px var(--surface)' };
            const ref = (el: HTMLElement | null) => {
              if (el) labels.current.set(i, el);
              else labels.current.delete(i);
            };
            // The notes are also reachable from the buttons under the map; these are a shortcut for pointers.
            return p.note ? (
              <button
                key={i}
                ref={ref}
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className={`${cls} cursor-pointer underline decoration-dotted underline-offset-2`}
                title={namedAt(config, p, step) ? undefined : t(p.name)}
                style={style}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect(i)}
              >
                {text}
              </button>
            ) : (
              <span key={i} ref={ref} aria-hidden="true" className={`${cls} pointer-events-none`} style={style}>
                {text}
              </span>
            );
          })}
    </>
  );
});
