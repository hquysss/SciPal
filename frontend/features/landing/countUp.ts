'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

// Landing motion helpers: whether an element is on screen (it flips back when it leaves, so an
// entrance can replay), and a price that counts up from zero when it comes into view.

/** The amount shown at `progress` (0 → 1) of the count, eased out and snapped to whole thousands. */
export function countUpValue(target: number, progress: number): number {
  const p = Math.min(Math.max(progress, 0), 1);
  if (p === 1) return target;
  const eased = 1 - (1 - p) ** 3;
  const step = target >= 10_000 ? 1000 : 1;
  return Math.round((target * eased) / step) * step;
}

/** True while the element is on screen; false again once it has left. */
export function useInView<T extends Element>(ref: RefObject<T | null>, threshold = 0.25): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= threshold) setInView(true);
      else if (!entry.isIntersecting) setInView(false);
    }, { threshold: [0, threshold] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return inView;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** `target`, counted up from zero each time `run` turns true (or `target` changes while running). */
export function useCountUp(target: number, run: boolean, duration = 1100): number {
  const [value, setValue] = useState(target);
  const frame = useRef(0);
  useEffect(() => {
    if (!run || reducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = (now - start) / duration;
      setValue(countUpValue(target, progress));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, run, duration]);
  return value;
}
