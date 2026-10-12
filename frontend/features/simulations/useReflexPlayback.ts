'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useOnScreen } from './useOnScreen';
import { REFLEX_DURATION } from './engines/kneeReflex';

export function useReflexPlayback(speed: number, host: RefObject<HTMLElement | null>) {
  const time = useRef(0);
  const [shownTime, setShownTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const active = useOnScreen(host);
  const reduced = useRef(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced.current = media.matches; if (media.matches) setPlaying(false); };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!playing || !active) return;
    let frame = 0;
    let last = performance.now();
    let published = last;
    const tick = (now: number) => {
      time.current = Math.min(REFLEX_DURATION, time.current + Math.min((now - last) / 1000, 0.1) * speed);
      last = now;
      if (now - published >= 100 || time.current === REFLEX_DURATION) { setShownTime(time.current); published = now; }
      if (time.current === REFLEX_DURATION) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, active, speed]);
  const seek = (value: number) => {
    setPlaying(false);
    time.current = Math.min(REFLEX_DURATION, Math.max(0, value));
    setShownTime(time.current);
  };
  return {
    time, shownTime, playing, running: playing && active,
    seek,
    tap: () => {
      time.current = reduced.current ? 4.8 : 0;
      setShownTime(time.current);
      setPlaying(!reduced.current);
    },
    pause: () => { setPlaying(false); setShownTime(time.current); },
  };
}
