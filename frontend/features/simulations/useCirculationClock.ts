'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useOnScreen } from './useOnScreen';

/**
 * The simulated time of the beating heart. It runs on its own while the view is on screen, at a
 * chosen fraction of real time; with reduced motion it starts paused. `shownTime` follows `time`
 * ten times a second for the panel, so React does not re-render every frame.
 */
export function useCirculationClock(speed: number, host: RefObject<HTMLElement | null>) {
  const time = useRef(0);
  const [shownTime, setShownTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const active = useOnScreen(host);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!media.matches);
    const update = () => { if (media.matches) setPlaying(false); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!playing || !active) return;
    let frame = 0;
    let last = performance.now();
    let published = last;
    const tick = (now: number) => {
      time.current += Math.min((now - last) / 1000, 0.1) * speed;
      last = now;
      if (now - published >= 100) { setShownTime(time.current); published = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, active, speed]);
  return {
    time, shownTime, playing, running: playing && active,
    toggle: () => { setPlaying((value) => !value); setShownTime(time.current); },
    /** Jump to a moment and hold it there. */
    seek: (value: number) => { setPlaying(false); time.current = value; setShownTime(value); },
  };
}
