'use client';

import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/**
 * Simulation time in seconds, advanced by requestAnimationFrame while playing (one state update
 * per frame at most). It stops at `duration` unless `loop`; with reduced motion, "play" jumps to
 * the end so nothing animates, and learners scrub with the time slider instead.
 */
export function useClock(duration: number, loop = false, autoplay = false) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (prefersReducedMotion()) {
      setTime(loop ? 0 : duration);
      setPlaying(false);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      let stop = false;
      setTime((t) => {
        const next = t + dt;
        if (next < duration) return next;
        if (loop) return next % duration;
        stop = true;
        return duration;
      });
      if (stop) setPlaying(false);
      else frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [playing, duration, loop]);

  const clamped = Math.min(time, duration);
  return {
    time: clamped,
    playing,
    play: () => {
      if (!loop && clamped >= duration) setTime(0);
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    seek: (t: number) => {
      setPlaying(false);
      setTime(Math.min(Math.max(t, 0), duration));
    },
  };
}
