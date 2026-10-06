'use client';

// Shared 3D plumbing for the simulations: theme colours for WebGL, an orbit camera driven by
// pointer, pinch, Ctrl+wheel and keyboard, and DOM labels that follow points on screen.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { BUTTON } from './controls';
import { pick, type Lang } from './types';

export type Orbit = { theta: number; phi: number; dist: number };

/**
 * Theme colours read from the CSS tokens (WebGL cannot use var()), re-read when the level or the
 * light/dark theme changes. `tokens` maps a key to a custom property; a missing one falls back to
 * the current text colour, so nothing is ever hard-coded.
 */
export function usePalette<K extends string>(host: React.RefObject<HTMLElement | null>, tokens: Record<K, string>): Record<K, string> | null {
  const [palette, setPalette] = useState<Record<K, string> | null>(null);
  const spec = JSON.stringify(tokens);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const read = () => {
      const css = getComputedStyle(el);
      const entries = (Object.entries(JSON.parse(spec)) as Array<[K, string]>).map(([k, name]) => [k, css.getPropertyValue(name).trim() || css.color]);
      setPalette(Object.fromEntries(entries) as Record<K, string>);
    };
    read();
    const shell = el.closest('[data-app-shell]');
    const observer = new MutationObserver(read);
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['data-theme', 'data-level'] });
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', read);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.('change', read);
    };
  }, [host, spec]);
  return palette;
}

/**
 * The orbit camera's state and every way to move it. Drags turn it, two pointers pinch-zoom,
 * Ctrl/⌘ + wheel zooms (a plain wheel keeps scrolling the lesson), arrows/+/−/0 work with focus.
 * A drag ends on release, cancel, lost capture or the window losing focus.
 */
export function useOrbit(home: Orbit, limits: { min: number; max: number }) {
  const host = useRef<HTMLDivElement>(null);
  const orbit = useRef<Orbit>({ ...home });
  const invalidate = useRef<() => void>(() => {});
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const [, setVersion] = useState(0);

  const move = useCallback(
    (patch: Partial<Orbit>) => {
      const next = { ...orbit.current, ...patch };
      next.phi = Math.min(Math.max(next.phi, -1.5), 1.5);
      next.dist = Math.min(Math.max(next.dist, limits.min), limits.max);
      orbit.current = next;
      invalidate.current();
      setVersion((v) => v + 1); // lets view-dependent drawing (hidden edges, silhouettes) follow
    },
    [limits.min, limits.max],
  );
  const zoom = useCallback((factor: number) => move({ dist: orbit.current.dist * factor }), [move]);
  const reset = useCallback(() => move({ ...home }), [move, home]);

  useEffect(() => {
    orbit.current = { ...home };
    invalidate.current();
  }, [home]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1);
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

  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Already released; tracking still ends on pointerup.
      }
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const last = pointers.current.get(e.pointerId);
      if (!last) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size >= 2) {
        const [p, q] = [...pointers.current.values()];
        const d = Math.hypot(p!.x - q!.x, p!.y - q!.y);
        if (pinch.current) zoom(pinch.current / d);
        pinch.current = d;
        return;
      }
      move({ theta: orbit.current.theta - (e.clientX - last.x) * 0.009, phi: orbit.current.phi + (e.clientY - last.y) * 0.009 });
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      const step = (10 * Math.PI) / 180;
      const o = orbit.current;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => move({ theta: o.theta - step }),
        ArrowRight: () => move({ theta: o.theta + step }),
        ArrowUp: () => move({ phi: o.phi + step }),
        ArrowDown: () => move({ phi: o.phi - step }),
        '+': () => zoom(0.85),
        '=': () => zoom(0.85),
        '-': () => zoom(1 / 0.85),
        Home: reset,
        '0': reset,
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    },
  };

  return { host, orbit, invalidate, handlers, zoom, reset };
}

/** Math coordinates (z up) to three.js (y up): (x, y, z) → (x, z, −y), a proper rotation. */
export const toThree = (p: readonly [number, number, number]) => new THREE.Vector3(p[0], p[2], -p[1]);

/** The camera on its orbit around `target`, plus labels pinned over their points. Draws on demand. */
export function Rig({
  orbit,
  target,
  labels,
  points,
  onInvalidate,
}: {
  orbit: React.RefObject<Orbit>;
  target: THREE.Vector3;
  labels: React.RefObject<Map<string, HTMLSpanElement>>;
  points: Array<[string, THREE.Vector3]>;
  onInvalidate: (fn: () => void) => void;
}) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => onInvalidate(invalidate), [invalidate, onInvalidate]);
  useEffect(() => invalidate(), [points, invalidate]);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const { theta, phi, dist } = orbit.current;
    camera.position.set(target.x + dist * Math.cos(phi) * Math.cos(theta), target.y + dist * Math.sin(phi), target.z - dist * Math.cos(phi) * Math.sin(theta));
    camera.lookAt(target);
    camera.updateMatrixWorld();
    for (const [name, p] of points) {
      const el = labels.current.get(name);
      if (!el) continue;
      v.copy(p).project(camera);
      const off = v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05;
      el.style.visibility = off ? 'hidden' : 'visible';
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    }
  });
  return null;
}

/** Text that rides on the 3D view; positioned every frame by Rig. A halo keeps it readable on any colour. */
export function LabelLayer({ labels, store }: { labels: Array<{ key: string; text: string; tone?: 'strong' | 'muted' | 'axis' }>; store: React.RefObject<Map<string, HTMLSpanElement>> }) {
  return (
    <>
      {labels.map(({ key, text, tone = 'strong' }) => (
        <span
          key={key}
          ref={(el) => {
            if (el) store.current.set(key, el);
            else store.current.delete(key);
          }}
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 select-none whitespace-nowrap tabular-nums ${
            tone === 'muted' ? 'text-xs text-ink-muted' : tone === 'axis' ? 'text-sm font-bold italic text-ink' : 'text-sm font-semibold text-ink'
          }`}
          style={{ visibility: 'hidden', textShadow: '0 0 3px var(--surface), 0 0 3px var(--surface), 0 0 2px var(--surface)' }}
        >
          {text}
        </span>
      ))}
    </>
  );
}

export function ViewButtons({ lang, onReset, onZoom }: { lang: Lang; onReset: () => void; onZoom: (factor: number) => void }) {
  const t = pick(lang);
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={BUTTON} onClick={onReset}>
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
        {t({ en: 'Reset view', vi: 'Góc nhìn ban đầu' })}
      </button>
      <button type="button" className={BUTTON} aria-label={t({ en: 'Zoom in', vi: 'Phóng to' })} onClick={() => onZoom(0.85)}>
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
      <button type="button" className={BUTTON} aria-label={t({ en: 'Zoom out', vi: 'Thu nhỏ' })} onClick={() => onZoom(1 / 0.85)}>
        <Minus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

export const VIEW_CLASS =
  'relative w-full cursor-grab overflow-hidden rounded-md border border-line bg-surface active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
