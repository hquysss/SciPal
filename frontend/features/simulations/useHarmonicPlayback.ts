'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

export function useHarmonicPlayback(period: number, autoplay: boolean, host: RefObject<HTMLElement | null>) {
  const time = useRef(0);
  const [shownTime, setShownTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(autoplay && !media.matches);
    const reduce = () => { if (media.matches) setPlaying(false); };
    media.addEventListener('change', reduce);
    return () => media.removeEventListener('change', reduce);
  }, [autoplay]);
  useEffect(() => {
    let visible = true;
    const update = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      update();
    });
    if (host.current) observer.observe(host.current);
    document.addEventListener('visibilitychange', update);
    update();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  }, [host]);
  useEffect(() => {
    if (!playing || !active) return;
    let frame = 0;
    let last = performance.now();
    let published = last;
    const tick = (now: number) => {
      time.current = (time.current + Math.min((now - last) / 1000, 0.1)) % period;
      last = now;
      if (now - published >= 100) { setShownTime(time.current); published = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [period, playing, active]);
  const seek = (value: number) => {
    setPlaying(false);
    time.current = Math.min(Math.max(value, 0), period);
    setShownTime(time.current);
  };
  return { time, shownTime, playing, running: playing && active, toggle: () => { setShownTime(time.current); setPlaying((p) => !p); }, seek };
}
