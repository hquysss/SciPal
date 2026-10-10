import { useEffect, useRef, type PointerEvent } from 'react';

const KEY = 'scipal-tutor-offset';
const THRESHOLD = 5;

/** The widget sits in the bottom-right corner; the offsets (px) move it left and up from there. */
// The variables live on the widget's own wrapper, never on <html> (the theme stays off the root).
const scope = () => document.querySelector<HTMLElement>('[data-tutor-scope]');
const read = (name: string) => parseFloat(scope()?.style.getPropertyValue(name) ?? '') || 0;
const apply = (r: number, b: number) => {
  scope()?.style.setProperty('--tutor-r', `${r}px`);
  scope()?.style.setProperty('--tutor-b', `${b}px`);
};

/**
 * Drag handlers for the Professor's button and panel header. A move under a few pixels stays a click;
 * the position is kept in this browser only.
 */
export function useTutorDrag(opts: { skip?: (target: Element) => boolean } = {}) {
  const state = useRef({ x: 0, y: 0, r: 0, b: 0, down: false, dragging: false, justDragged: false });

  const restored = useRef(false);
  // Runs every render until the wrapper exists (the widget renders nothing before the session is ready).
  useEffect(() => {
    if (restored.current || !scope()) return;
    restored.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { r?: number; b?: number } | null;
      if (saved && Number.isFinite(saved.r) && Number.isFinite(saved.b)) apply(saved.r!, saved.b!);
    } catch { /* no storage: the default corner */ }
  });

  return {
    /** True once after a drag, so the click that ends it can be ignored. */
    wasDragged() {
      const was = state.current.justDragged;
      state.current.justDragged = false;
      return was;
    },
    handlers: {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        if (e.button !== 0 || (e.target instanceof Element && opts.skip?.(e.target))) return;
        Object.assign(state.current, { x: e.clientX, y: e.clientY, r: read('--tutor-r'), b: read('--tutor-b'), down: true, dragging: false });
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        const s = state.current;
        if (!s.down) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (!s.dragging && Math.hypot(dx, dy) < THRESHOLD) return;
        s.dragging = true;
        // Moving right shrinks the right offset; stay inside the window.
        const r = Math.min(Math.max(0, s.r - dx), window.innerWidth - 80);
        const b = Math.min(Math.max(0, s.b - dy), window.innerHeight - 80);
        apply(r, b);
      },
      onPointerUp() {
        const s = state.current;
        if (!s.down) return;
        s.down = false;
        if (!s.dragging) return;
        s.dragging = false;
        s.justDragged = true;
        try { localStorage.setItem(KEY, JSON.stringify({ r: read('--tutor-r'), b: read('--tutor-b') })); } catch { /* not saved */ }
      },
    },
  };
}
