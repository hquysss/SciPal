'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Whether the view inside `host` can be seen: on screen and in a visible tab. In fullscreen only the
 * fullscreen element is drawn, so the observer reports the host as hidden even though the view inside
 * it fills the screen; that case counts as on screen.
 */
export function useOnScreen(host: RefObject<HTMLElement | null>): boolean {
  const [active, setActive] = useState(true);
  useEffect(() => {
    let visible = true;
    const fullscreen = () => { const element = document.fullscreenElement; return !!element && !!host.current?.contains(element); };
    const update = () => setActive((visible || fullscreen()) && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; update(); });
    if (host.current) observer.observe(host.current);
    document.addEventListener('visibilitychange', update);
    document.addEventListener('fullscreenchange', update);
    update();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); document.removeEventListener('fullscreenchange', update); };
  }, [host]);
  return active;
}
