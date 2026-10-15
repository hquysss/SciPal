'use client';

// The 3D history map: the region's relief raised from its height grid, the areas held so far
// painted onto the ground (clipped to land), this step's marches as tubes that hug the terrain and
// grow in order of travel, and place names pinned over their spots. Loaded lazily, browser only.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { HistoryMapRegion } from '@scipal/types';
import { assetBase, densify, heightAt, namedAt, placesAt, projection, stepFrame, type HistoryMap, type LonLat } from './historyMapGeo';
import { ViewButtons, VIEW_CLASS, useOrbit, usePalette, type Orbit } from './scene3d';
import { pick, type Lang } from './types';
import { PLACE_MARK, type Palette, MAP_TOKENS } from './historyMapStyle';

const FOV = 40;
/** Relief is exaggerated so hills read at the scale of a whole region. */
const EXAGGERATION = 16;
const METRES_PER_UNIT = 111_000;
const SECONDS_PER_ROUTE = 1.1;
const HOME: Orbit = { theta: -Math.PI / 2, phi: 0.78, dist: 1 };

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

/** The relief with every area held up to `step`, the newest stronger, kept off the sea. */
function paintGround(canvas: HTMLCanvasElement, layer: HTMLCanvasElement, assets: Assets, config: HistoryMap, step: number, palette: Palette) {
  const [w, h] = [assets.relief.naturalWidth, assets.relief.naturalHeight];
  canvas.width = layer.width = w;
  canvas.height = layer.height = h;
  const ctx = canvas.getContext('2d')!;
  const areas = layer.getContext('2d')!;
  const { toUv } = projection(config.region);
  ctx.drawImage(assets.relief, 0, 0, w, h);
  config.steps.slice(0, step + 1).forEach((s, i) => {
    for (const area of s.areas) {
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
      areas.lineWidth = 5;
      areas.stroke();
    }
  });
  areas.globalAlpha = 1;
  areas.globalCompositeOperation = 'destination-in';
  areas.drawImage(assets.land, 0, 0, w, h);
  areas.globalCompositeOperation = 'source-over';
  ctx.drawImage(layer, 0, 0);
}

function Terrain({ assets, config, step, palette }: { assets: Assets; config: HistoryMap; step: number; palette: Palette }) {
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
  const [canvas, layer] = useMemo(() => [document.createElement('canvas'), document.createElement('canvas')], []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [canvas]);
  useEffect(() => {
    paintGround(canvas, layer, assets, config, step, palette);
    texture.needsUpdate = true;
    invalidate();
  }, [canvas, layer, assets, config, step, palette, texture, invalidate]);
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

function March({ route, index, progress, palette, toScene, radius }: { route: Route; index: number; progress: React.RefObject<number>; palette: Palette; toScene: ToScene; radius: number }) {
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
      const at = Math.min(Math.floor(p * last), last);
      const prev = path[Math.max(at - 1, 0)]!;
      const tip = path[Math.max(at, 1)]!;
      head.current.visible = p > 0;
      head.current.position.copy(tip);
      head.current.rotation.set(0, Math.atan2(-(tip.z - prev.z), tip.x - prev.x), 0);
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

/** Flies to the step's frame, keeps the camera above the ground and pins the labels; draws on demand. */
function MapRig({
  orbit,
  frame,
  reduced,
  progress,
  routes,
  labels,
  anchors,
  onInvalidate,
}: {
  orbit: React.RefObject<Orbit>;
  frame: { target: THREE.Vector3; span: [number, number] };
  reduced: boolean;
  progress: React.RefObject<number>;
  routes: number;
  labels: React.RefObject<Map<number, HTMLElement>>;
  anchors: Array<[number, THREE.Vector3]>;
  onInvalidate: (fn: () => void) => void;
}) {
  const { camera, size, invalidate } = useThree();
  const target = useRef<THREE.Vector3 | null>(null);
  const base = useRef(0);
  const v = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => onInvalidate(invalidate), [invalidate, onInvalidate]);
  useEffect(() => invalidate(), [anchors, invalidate]);

  const fit = (aspect: number) => (Math.max(frame.span[1], frame.span[0] / aspect) / (2 * Math.tan(((FOV / 2) * Math.PI) / 180))) * 1.05;

  useEffect(() => {
    if (reduced || !target.current) {
      target.current = frame.target.clone();
      base.current = fit(size.width / Math.max(size.height, 1));
    }
    progress.current = reduced ? routes : 0;
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, reduced, routes]);

  useFrame((_, dt) => {
    const t = target.current;
    if (!t) return;
    const wantDist = fit(size.width / Math.max(size.height, 1));
    let busy = false;
    if (!reduced) {
      const a = 1 - Math.exp(-Math.min(dt, 0.1) * 3);
      if (t.distanceTo(frame.target) > 0.002 || Math.abs(base.current - wantDist) > 0.002) {
        t.lerp(frame.target, a);
        base.current += (wantDist - base.current) * a;
        busy = true;
      }
      if (progress.current < routes) {
        progress.current = Math.min(routes, progress.current + Math.min(dt, 0.1) / SECONDS_PER_ROUTE);
        busy = true;
      }
    } else {
      t.copy(frame.target);
      base.current = wantDist;
    }
    const { theta, dist } = orbit.current;
    const phi = Math.min(Math.max(orbit.current.phi, 0.3), 1.5);
    const d = base.current * dist;
    camera.position.set(t.x + d * Math.cos(phi) * Math.cos(theta), t.y + d * Math.sin(phi), t.z - d * Math.cos(phi) * Math.sin(theta));
    camera.lookAt(t);
    camera.updateMatrixWorld();
    for (const [key, p] of anchors) {
      const el = labels.current.get(key);
      if (!el) continue;
      v.copy(p).project(camera);
      const off = v.z > 1 || Math.abs(v.x) > 1.02 || Math.abs(v.y) > 1.02;
      el.style.visibility = off ? 'hidden' : 'visible';
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    }
    if (busy) invalidate();
  });
  return null;
}

export default function HistoryMapScene({
  config,
  step,
  lang,
  reduced,
  description,
  onSelect,
}: {
  config: HistoryMap;
  step: number;
  lang: Lang;
  reduced: boolean;
  description: string;
  onSelect: (index: number) => void;
}) {
  const t = pick(lang);
  const assets = useAssets(config.region);
  const { host, orbit, invalidate, handlers, zoom, reset } = useOrbit(HOME, { min: 0.3, max: 3 });
  const palette = usePalette(host, MAP_TOKENS);
  const labels = useRef(new Map<number, HTMLElement>());
  const progress = useRef(0);
  const setInvalidate = useCallback((fn: () => void) => {
    invalidate.current = fn;
  }, [invalidate]);

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
  const anchors = useMemo(
    () => config.places.flatMap((p, i) => (p.from <= step ? [[i, toScene([p.lon, p.lat], p.type === 'area' ? 0.05 : undefined)] as [number, THREE.Vector3]] : [])),
    [config.places, toScene, step],
  );
  const routes = config.steps[step]?.routes ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={host}
        role="img"
        aria-label={description}
        tabIndex={0}
        className={`${VIEW_CLASS} aspect-[4/3] touch-none`}
        {...handlers}
      >
        {assets && palette ? (
          <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: FOV, near: 0.02, far: 200 }} gl={{ antialias: true }}>
            <Terrain assets={assets} config={config} step={step} palette={palette} />
            {routes.map((route, i) => (
              <March key={`${step}-${i}`} route={route} index={i} progress={progress} palette={palette} toScene={toScene} radius={Math.max(...frame.span) * 0.005} />
            ))}
            <MapRig orbit={orbit} frame={frame} reduced={reduced} progress={progress} routes={routes.length} labels={labels} anchors={anchors} onInvalidate={setInvalidate} />
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
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">
          {t({
            en: 'Drag to turn, pinch or Ctrl + scroll to zoom. With the map focused: arrow keys turn it, + and − zoom, 0 resets.',
            vi: 'Kéo để xoay, chụm hai ngón hoặc Ctrl + cuộn để phóng to. Khi chọn bản đồ: phím mũi tên để xoay, + và − để phóng to, 0 để về ban đầu.',
          })}
        </p>
        <ViewButtons lang={lang} onReset={reset} onZoom={zoom} />
      </div>
    </div>
  );
}
