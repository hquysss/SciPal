'use client';

import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react';

// The reader's camera over a history map: turn, tilt, zoom and slide, all kept inside limits so the
// map can never be lost (no flipping under the ground, no flying off the region). The scene eases
// toward this view every frame; this file only holds what the reader asked for.

export type MapView = { theta: number; phi: number; dist: number; panX: number; panZ: number };

/** Looking north, tilted down. The reader can turn this far to either side. */
export const HOME_VIEW: MapView = { theta: -Math.PI / 2, phi: 0.78, dist: 1, panX: 0, panZ: 0 };
export const VIEW_LIMITS = { turn: 0.85, phiMin: 0.32, phiMax: 1.22, distMin: 0.3, distMax: 1.7 } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function clampView(v: MapView, panLimit: number): MapView {
  return {
    theta: clamp(v.theta, HOME_VIEW.theta - VIEW_LIMITS.turn, HOME_VIEW.theta + VIEW_LIMITS.turn),
    phi: clamp(v.phi, VIEW_LIMITS.phiMin, VIEW_LIMITS.phiMax),
    dist: clamp(v.dist, VIEW_LIMITS.distMin, VIEW_LIMITS.distMax),
    panX: clamp(v.panX, -panLimit, panLimit),
    panZ: clamp(v.panZ, -panLimit, panLimit),
  };
}

/** A drag of (dx, dy) screen pixels slides the ground with the finger: the target moves the other way. */
export function panDelta(theta: number, dx: number, dy: number, worldPerPixel: number): { x: number; z: number } {
  // Camera right and forward (ground plane) for an orbit angle theta; see MapRig.
  const right = { x: -Math.sin(theta), z: -Math.cos(theta) };
  const forward = { x: -Math.cos(theta), z: Math.sin(theta) };
  return { x: (-right.x * dx + forward.x * dy) * worldPerPixel, z: (-right.z * dx + forward.z * dy) * worldPerPixel };
}

export type MapCamera = ReturnType<typeof useMapCamera>;

/**
 * `onManualPan` fires when the reader slides the map, so a camera that follows the marches can step
 * aside. The scene fills `worldPerPixel` and `panLimit` each frame (they depend on its size).
 */
export function useMapCamera(onManualPan: () => void) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<MapView>({ ...HOME_VIEW });
  const invalidate = useRef<() => void>(() => {});
  const worldPerPixel = useRef(0.002);
  const panLimit = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const manual = useRef(onManualPan);
  manual.current = onManualPan;

  const set = useCallback((patch: Partial<MapView>) => {
    view.current = clampView({ ...view.current, ...patch }, panLimit.current);
    invalidate.current();
  }, []);
  const zoom = useCallback((factor: number) => set({ dist: view.current.dist * factor }), [set]);
  const reset = useCallback(() => set({ ...HOME_VIEW }), [set]);
  const pan = useCallback(
    (dx: number, dy: number) => {
      const d = panDelta(view.current.theta, dx, dy, worldPerPixel.current);
      set({ panX: view.current.panX + d.x, panZ: view.current.panZ + d.z });
      manual.current();
    },
    [set],
  );

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // The page keeps its own scroll: the wheel zooms only with Ctrl/Cmd, or inside full screen.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && document.fullscreenElement === null && !el.closest('[data-fullscreen="true"]')) return;
      e.preventDefault();
      zoom(e.deltaY > 0 ? 1.08 : 1 / 1.08);
    };
    const clear = () => {
      pointers.current.clear();
      pinch.current = null;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('blur', clear);
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', clear);
    };
  }, [zoom]);

  const end = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const handlers = {
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button === 1) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Already released; tracking still ends on pointerup.
      }
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      const last = pointers.current.get(e.pointerId);
      if (!last) return;
      const [dx, dy] = [e.clientX - last.x, e.clientY - last.y];
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size >= 2) {
        // Two fingers: pinch to zoom, and the midpoint's drift slides the map.
        const [p, q] = [...pointers.current.values()];
        const d = Math.hypot(p!.x - q!.x, p!.y - q!.y);
        if (pinch.current) zoom(pinch.current / d);
        pinch.current = d;
        pan(dx / 2, dy / 2);
        return;
      }
      if (e.pointerType === 'mouse' && (e.buttons & 2 || e.shiftKey)) {
        pan(dx, dy);
        return;
      }
      set({ theta: view.current.theta - dx * 0.007, phi: view.current.phi + dy * 0.007 });
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      const turn = (8 * Math.PI) / 180;
      const slide = 60;
      const v = view.current;
      const actions: Record<string, () => void> = e.shiftKey
        ? { ArrowLeft: () => pan(slide, 0), ArrowRight: () => pan(-slide, 0), ArrowUp: () => pan(0, slide), ArrowDown: () => pan(0, -slide) }
        : {
            ArrowLeft: () => set({ theta: v.theta - turn }),
            ArrowRight: () => set({ theta: v.theta + turn }),
            ArrowUp: () => set({ phi: v.phi + turn }),
            ArrowDown: () => set({ phi: v.phi - turn }),
          };
      Object.assign(actions, { '+': () => zoom(0.85), '=': () => zoom(0.85), '-': () => zoom(1 / 0.85), Home: reset, '0': reset });
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    },
  };

  // One object for the life of the map, so a memoised scene does not redraw on every slider move.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the handlers only touch refs and stable callbacks
  return useMemo(() => ({ host, view, invalidate, worldPerPixel, panLimit, handlers, zoom, reset }), []);
}

export type Shot = { x: number; z: number; theta: number; phi: number; d: number };

/**
 * Where the four corners of the screen meet the ground (y = 0) for a camera looking at (x, 0, z)
 * from distance d (see MapRig for the orbit), or null when a corner looks above the horizon.
 */
export function groundCorners(s: Shot, fovY: number, aspect: number): Array<{ x: number; z: number }> | null {
  const cp = Math.cos(s.phi);
  const pos = { x: s.x + s.d * cp * Math.cos(s.theta), y: s.d * Math.sin(s.phi), z: s.z - s.d * cp * Math.sin(s.theta) };
  const len = Math.hypot(s.x - pos.x, pos.y, s.z - pos.z);
  const f = { x: (s.x - pos.x) / len, y: -pos.y / len, z: (s.z - pos.z) / len };
  // right = forward × up, up' = right × forward
  const rl = Math.hypot(f.z, f.x);
  const r = { x: -f.z / rl, y: 0, z: f.x / rl };
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  const ty = Math.tan(fovY / 2);
  const tx = ty * aspect;
  const out = [];
  for (const [sx, sy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) {
    const dir = { x: f.x + r.x * tx * sx + u.x * ty * sy, y: f.y + r.y * tx * sx + u.y * ty * sy, z: f.z + r.z * tx * sx + u.z * ty * sy };
    if (dir.y >= -1e-4) return null;
    const t = -pos.y / dir.y;
    out.push({ x: pos.x + dir.x * t, z: pos.z + dir.z * t });
  }
  return out;
}

/**
 * The nearest shot that sees only the map: tilts down until no corner sees the horizon, comes
 * closer until the ground in view fits inside the map, then slides it back inside.
 */
export function fitInside(shot: Shot, fovY: number, aspect: number, halfW: number, halfH: number): Shot {
  const s = { ...shot };
  for (let i = 0; i < 40; i += 1) {
    const corners = groundCorners(s, fovY, aspect);
    if (!corners) {
      s.phi = Math.min(s.phi + 0.03, Math.PI / 2 - 0.01);
      continue;
    }
    const xs = corners.map((c) => c.x);
    const zs = corners.map((c) => c.z);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    if (x1 - x0 > 2 * halfW || z1 - z0 > 2 * halfH) {
      // The ground in view grows with the distance, so come in by about how much it is too big.
      s.d *= 0.98 * Math.min((2 * halfW) / (x1 - x0), (2 * halfH) / (z1 - z0));
      continue;
    }
    if (x0 < -halfW) s.x += -halfW - x0;
    if (x1 > halfW) s.x -= x1 - halfW;
    if (z0 < -halfH) s.z += -halfH - z0;
    if (z1 > halfH) s.z -= z1 - halfH;
    return s;
  }
  return s;
}
