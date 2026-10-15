'use client';

import { useEffect, useState } from 'react';

/** The three durations every simulation effect picks from, in milliseconds. */
export const MOTION = { quick: 140, standard: 280, slow: 520 } as const;

export const EASE = {
  /** Something moving across the screen: gentle at both ends. */
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  /** Something arriving: fast, then settling. */
  out: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

/** Arrives with a small overshoot (about 10%), for things that pop into place on a canvas. */
export function easeOutBack(t: number) {
  const c = 1.70158;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

/** `Element.animate` where the browser has it; jsdom and older browsers do not. */
export function animate(el: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
  return el && typeof el.animate === 'function' ? el.animate(keyframes, options) : null;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    setReduced(media.matches);
    const change = () => setReduced(media.matches);
    media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);
  return reduced;
}
