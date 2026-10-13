'use client';

import { useEffect, useMemo, useRef, type PointerEvent, type KeyboardEvent } from 'react';
import * as THREE from 'three';
import { useOrbit, type Orbit } from './scene3d';

type Drag = { readonly dx: number; readonly dy: number; readonly height: number; readonly fov?: number };
export function panReflexTarget(target: THREE.Vector3, orbit: Orbit, drag: Drag) {
  const scale = 2 * orbit.dist * Math.tan((drag.fov ?? 42) * Math.PI / 360) / Math.max(1, drag.height);
  target.x += (Math.sin(orbit.theta) * drag.dx - Math.cos(orbit.theta) * Math.sin(orbit.phi) * drag.dy) * scale;
  target.y += Math.cos(orbit.phi) * drag.dy * scale;
  target.z += (Math.cos(orbit.theta) * drag.dx + Math.sin(orbit.theta) * Math.sin(orbit.phi) * drag.dy) * scale;
}

const LIMITS = { min: 4.2, max: 18 };
export function useReflexCamera(home: Orbit, limits = LIMITS) {
  const base = useOrbit(home, limits);
  const target = useMemo(() => new THREE.Vector3(0, 0.15, 0), []);
  const fieldOfView = useRef(42);
  const rightDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  useEffect(() => { target.set(0, 0.15, 0); }, [home, target]);
  useEffect(() => {
    const clear = () => { rightDrag.current = null; };
    window.addEventListener('blur', clear);
    return () => window.removeEventListener('blur', clear);
  }, []);
  const reset = () => { target.set(0, 0.15, 0); base.reset(); };
  /** Looks at `point`; `view` sets the distance and, if given, the direction. */
  const focus = (point: readonly [number, number, number], view: Partial<Orbit>) => { target.set(...point); base.move(view); };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    if (rightDrag.current?.id === event.pointerId) rightDrag.current = null;
    base.handlers.onPointerUp(event);
  };
  const pan = (drag: Drag) => { panReflexTarget(target, base.orbit.current, { ...drag, fov: fieldOfView.current }); base.invalidate.current(); };
  const handlers = {
    ...base.handlers,
    onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => event.preventDefault(),
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (event.button === 2 && event.pointerType === 'mouse') {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        rightDrag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      } else base.handlers.onPointerDown(event);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const previous = rightDrag.current;
      if (previous?.id === event.pointerId) {
        pan({ dx: event.clientX - previous.x, dy: event.clientY - previous.y, height: event.currentTarget.clientHeight });
        rightDrag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      } else base.handlers.onPointerMove(event);
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === '0' || event.key === 'Home') { event.preventDefault(); reset(); return; }
      const directions: Record<string, readonly [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
      const delta = directions[event.key];
      if (event.shiftKey && delta) { event.preventDefault(); pan({ dx: delta[0], dy: delta[1], height: event.currentTarget.clientHeight }); }
      else base.handlers.onKeyDown(event);
    },
  };
  return { ...base, target, fieldOfView, reset, focus, handlers };
}
