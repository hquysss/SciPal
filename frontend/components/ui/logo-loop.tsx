'use client';
import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import styles from './logo-loop.module.css';

/* A looping strip of logos, trimmed from React Bits "LogoLoop" to what the landing page uses: one straight,
   horizontal line that pauses on hover, can be dragged and flung, and stays still under reduced motion.
   Colours come from the stylesheet, so the strip follows the theme. */
const SMOOTH_TAU = 0.25;
const GLIDE_TAU = 0.8;
const DRAG_THRESHOLD = 6;
const MAX_FLING = 4000;
const DEFAULT_COPIES = 3;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** A transparent mask that fades both ends, so it works on any background. */
function fadeMask(size: number) {
  const span = clamp(size, 0, 0.5) * 100;
  if (span <= 0) return undefined;
  const stops: string[] = [];
  for (let i = 0; i <= 12; i++) stops.push(`rgba(0,0,0,${smootherstep(i / 12).toFixed(4)}) ${((span * i) / 12).toFixed(3)}%`);
  for (let i = 12; i >= 0; i--) stops.push(`rgba(0,0,0,${smootherstep(i / 12).toFixed(4)}) ${(100 - (span * i) / 12).toFixed(3)}%`);
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

export type LogoItem = {
  /** Read out by screen readers; the logo itself is decorative. */
  readonly name: string;
  readonly Icon: IconType;
  /** Lets the page's stylesheet give this logo its brand colour on hover (`[data-brand]`). */
  readonly brand?: string;
};

type Props = {
  readonly logos: readonly LogoItem[];
  /** Pixels per second; the strip moves left. */
  readonly speed?: number;
  readonly logoHeight?: number;
  readonly gap?: number;
  readonly fadeOutWidth?: number;
  readonly ariaLabel: string;
  readonly className?: string;
};

export const LogoLoop = memo(function LogoLoop({ logos, speed = 60, logoHeight = 36, gap = 56, fadeOutWidth = 0.12, ariaLabel, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(DEFAULT_COPIES);
  const wake = useRef<() => void>(() => {});
  const config = useRef({ speed });
  config.current = { speed };

  // Enough copies that the strip never shows a gap, however wide the window is.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const list = trackRef.current?.firstElementChild;
    if (!root || !list) return;
    const fit = () => {
      const period = list.getBoundingClientRect().width;
      if (period > 0) setCopies(Math.max(2, Math.ceil(root.clientWidth / period) + 2));
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(root);
    observer.observe(list);
    return () => observer.disconnect();
  }, [logos, logoHeight, gap]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const first = track?.firstElementChild;
    if (!root || !track || !first) return;
    const motion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let offset = 0;
    let velocity = 0;
    let glide = false;
    let hovered = false;
    let visible = typeof IntersectionObserver === 'undefined';
    let raf = 0;
    let last = 0;
    let suppressUntil = 0;
    let drag: { id: number; x: number; y: number; active: boolean; samples: [number, number][]; start: number } | null = null;

    const period = () => first.getBoundingClientRect().width;
    const paint = () => {
      track.style.transform = `translate3d(${(-offset).toFixed(2)}px, 0, 0)`;
    };
    const frame = (now: number) => {
      raf = 0;
      const P = period();
      if (P <= 0) return;
      const dt = last ? clamp((now - last) / 1000, 0, 0.1) : 0;
      last = now;
      if (!drag?.active) {
        const target = motion?.matches || hovered ? 0 : config.current.speed;
        velocity += (target - velocity) * (1 - Math.exp(-dt / (glide ? GLIDE_TAU : SMOOTH_TAU)));
        if (glide && Math.abs(velocity - target) < 2) glide = false;
        if (Math.abs(velocity - target) < 0.01) velocity = target;
        offset += velocity * dt;
      }
      offset = ((offset % P) + P) % P;
      paint();
      const busy = drag?.active || velocity !== 0 || (!hovered && !motion?.matches && config.current.speed !== 0);
      if (busy && visible) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf || !visible) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    wake.current = start;

    const onEnter = () => {
      hovered = true;
    };
    const onLeave = () => {
      hovered = false;
      start();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, active: false, samples: [], start: offset };
    };
    const onMove = (e: PointerEvent) => {
      const d = drag;
      if (!d || e.pointerId !== d.id) return;
      const along = e.clientX - d.x;
      const across = e.clientY - d.y;
      if (!d.active) {
        if (Math.abs(along) < DRAG_THRESHOLD) return;
        // A mostly vertical gesture is the page scrolling, not a drag.
        if (Math.abs(across) > Math.abs(along)) {
          drag = null;
          return;
        }
        d.active = true;
        glide = false;
        velocity = 0;
        try {
          root.setPointerCapture(e.pointerId);
        } catch {
          // The pointer is already gone; the drag simply ends on the next event.
        }
        root.setAttribute('data-dragging', '');
      }
      offset = d.start - along;
      const now = performance.now();
      d.samples.push([now, along]);
      while (d.samples.length > 2 && now - d.samples[0]![0] > 100) d.samples.shift();
      start();
    };
    const onUp = (e: PointerEvent) => {
      const d = drag;
      if (!d || e.pointerId !== d.id) return;
      drag = null;
      if (!d.active) return;
      root.removeAttribute('data-dragging');
      try {
        root.releasePointerCapture(e.pointerId);
      } catch {
        // Capture was already released.
      }
      const now = performance.now();
      suppressUntil = now + 400;
      const s = d.samples;
      let v = 0;
      if (e.type !== 'pointercancel' && s.length > 1) {
        const [t0, a0] = s[0]!;
        const [t1, a1] = s[s.length - 1]!;
        if (t1 > t0 && now - t1 < 80) v = clamp((-(a1 - a0) / (t1 - t0)) * 1000, -MAX_FLING, MAX_FLING);
      }
      velocity = v;
      glide = Math.abs(v) > 30;
      start();
    };
    const onClick = (e: MouseEvent) => {
      if (performance.now() < suppressUntil) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onDragStart = (e: Event) => e.preventDefault();
    const onMotion = () => start();

    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('click', onClick, true);
    root.addEventListener('dragstart', onDragStart);
    motion?.addEventListener?.('change', onMotion);
    let intersection: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersection = new IntersectionObserver(
        (entries) => {
          visible = entries[entries.length - 1]!.isIntersecting;
          if (visible) start();
        },
        { threshold: 0.1 },
      );
      intersection.observe(root);
    }
    paint();
    start();
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      root.removeEventListener('click', onClick, true);
      root.removeEventListener('dragstart', onDragStart);
      motion?.removeEventListener?.('change', onMotion);
      intersection?.disconnect();
    };
  }, []);

  // A new copy count changes the period; make sure the loop is running again.
  useEffect(() => wake.current());

  const mask = fadeMask(fadeOutWidth);
  const rootStyle: CSSProperties & Record<string, string | number | undefined> = {
    '--logoloop-gap': `${gap}px`,
    '--logoloop-height': `${logoHeight}px`,
    WebkitMaskImage: mask,
    maskImage: mask,
  };
  return (
    <div ref={rootRef} className={`${styles.root}${className ? ` ${className}` : ''}`} style={rootStyle} role="region" aria-label={ariaLabel}>
      <div ref={trackRef} className={styles.track}>
        {Array.from({ length: copies }, (_, copy) => (
          <ul key={copy} className={styles.list} aria-hidden={copy === 0 ? undefined : true}>
            {logos.map(({ name, Icon, brand }) => (
              <li key={name} className={styles.item} aria-label={name} title={name} data-brand={brand}>
                <Icon aria-hidden="true" focusable="false" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
});
