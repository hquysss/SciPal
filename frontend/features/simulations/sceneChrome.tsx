'use client';

import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react';
import type { ThreeEvent } from '@react-three/fiber';
import { pick, type Lang } from './types';
import overlay from './simOverlay.module.css';

/** Full screen for a 3D view: the native API, or the view stretched over the page where there is none (iPhone Safari). */
export function useFullscreen(host: RefObject<HTMLElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);
  const [covering, setCovering] = useState(false);

  useEffect(() => {
    const sync = () => {
      const on = document.fullscreenElement !== null && document.fullscreenElement === host.current;
      setFullscreen(on);
      if (on) setCovering(false);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [host]);
  useEffect(() => {
    if (!covering) return;
    const leave = (e: KeyboardEvent) => { if (e.key === 'Escape') setCovering(false); };
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    window.addEventListener('keydown', leave);
    return () => { html.style.overflow = before; window.removeEventListener('keydown', leave); };
  }, [covering]);

  const toggle = async () => {
    const el = host.current;
    if (!el) return;
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    if (covering) { setCovering(false); return; }
    try {
      if (!el.requestFullscreen) throw new Error('no fullscreen');
      // Some embedded browsers leave the request pending forever; stop waiting and cover the page.
      const slow = new Promise<'slow'>((resolve) => setTimeout(() => resolve('slow'), 700));
      const outcome = await Promise.race([el.requestFullscreen().then(() => 'ok' as const), slow]);
      if (outcome === 'slow' && !document.fullscreenElement) setCovering(true);
    } catch {
      setCovering(true);
    }
  };

  return { expanded: fullscreen || covering, covering, toggle };
}

/** The square tools in the corner of a 3D view: zoom, reset, hide the cards, full screen. */
export function SceneTools({ lang, className, onZoom, onReset, panelsHidden, onTogglePanels, expanded, onToggleFullscreen }: {
  readonly lang: Lang;
  readonly className: string;
  readonly onZoom: (factor: number) => void;
  readonly onReset: () => void;
  readonly panelsHidden: boolean;
  readonly onTogglePanels: () => void;
  readonly expanded: boolean;
  readonly onToggleFullscreen: () => void;
}) {
  const t = pick(lang);
  const tools: Array<[ReactNode, string, () => void]> = [
    [<Plus key="in" aria-hidden="true" className="h-4 w-4" />, t({ vi: 'Phóng to', en: 'Zoom in' }), () => onZoom(0.85)],
    [<Minus key="out" aria-hidden="true" className="h-4 w-4" />, t({ vi: 'Thu nhỏ', en: 'Zoom out' }), () => onZoom(1 / 0.85)],
    [<RotateCcw key="reset" aria-hidden="true" className="h-4 w-4" />, t({ vi: 'Góc nhìn ban đầu', en: 'Reset view' }), onReset],
    [panelsHidden ? <EyeOff key="panels" aria-hidden="true" className="h-4 w-4" /> : <Eye key="panels" aria-hidden="true" className="h-4 w-4" />, panelsHidden ? t({ vi: 'Hiện bảng thông tin', en: 'Show info panels' }) : t({ vi: 'Ẩn bảng thông tin', en: 'Hide info panels' }), onTogglePanels],
    [expanded ? <Minimize2 key="full" aria-hidden="true" className="h-4 w-4" /> : <Maximize2 key="full" aria-hidden="true" className="h-4 w-4" />, expanded ? t({ vi: 'Thoát toàn màn hình', en: 'Exit full screen' }) : t({ vi: 'Toàn màn hình', en: 'Full screen' }), onToggleFullscreen],
  ];
  return (
    <div className={`${overlay.tools} ${className}`} onPointerDown={(e) => e.stopPropagation()}>
      {tools.map(([icon, label, action]) => (
        <button key={label} type="button" className={overlay.tool} aria-label={label} title={label} onClick={action}>{icon}</button>
      ))}
    </div>
  );
}

/** A label pinned on a part of the 3D view, as in the ripple tank: the scene's Rig moves it over
    the part; pressing it opens (or closes) that part's explanation; hovering it lets the scene light the part up. */
export function PartChip({ id, label, pressed, onPress, onHover, store }: {
  readonly id: string;
  readonly label: string;
  readonly pressed: boolean;
  readonly onPress: () => void;
  /** Pointer over or off the label, so the scene can light the part up. */
  readonly onHover?: (on: boolean) => void;
  readonly store: RefObject<Map<string, HTMLElement>>;
}) {
  return (
    <button
      type="button"
      ref={(el) => { if (el) store.current.set(id, el); else store.current.delete(id); }}
      className={`${overlay.chip} ${overlay.anchor}`}
      aria-pressed={pressed}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onPress}
      onPointerEnter={() => onHover?.(true)}
      onPointerLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
    >
      {label}
    </button>
  );
}

/** Pointer props for a part's group in the scene: hovering lights it, a click (not a drag) opens it. */
export function partPointer<P extends string>(key: P, onHover: (part: P | null) => void, onPress: (part: P) => void) {
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { if (!e.object.visible) return; e.stopPropagation(); onHover(key); },
    onPointerOut: () => onHover(null),
    onClick: (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6 || !e.object.visible) return; e.stopPropagation(); onPress(key); },
  };
}

type OrbitHandlers = {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
};

/** Orbit handlers that leave the pointer uncaptured, as in the ripple tank: a short press stays a
    click on the canvas, so parts can be picked; a drag that leaves the view ends on pointerleave. */
export function clickThrough<H extends OrbitHandlers>(handlers: H): H & { onPointerLeave: (e: ReactPointerEvent<HTMLDivElement>) => void } {
  return {
    ...handlers,
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      handlers.onPointerDown(e);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    },
    onPointerLeave: (e: ReactPointerEvent<HTMLDivElement>) => handlers.onPointerUp(e),
  };
}
