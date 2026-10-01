'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { DESKTOP_MOTION, REDUCED_MOTION, smoothScrollWanted } from '@/lib/motion';

/** Room for the floating navbar when a link jumps to an anchor (#mon-hoc…). */
const ANCHOR_OFFSET = -88;

/**
 * Smooth, eased scrolling for the whole site on desktops (as in Katha): the wheel glides instead of
 * jumping a notch at a time. Phones, tablets and reduced-motion users keep the native scroll. It
 * scrolls the page itself, so scroll-driven CSS and sticky elements work as before; scrollable
 * panels inside the page (chat, dialogs) scroll on their own, and a dialog that locks the page
 * stops it until the page is unlocked.
 */
export function SmoothScroll() {
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_MOTION);
    const reduced = window.matchMedia(REDUCED_MOTION);
    let lenis: Lenis | null = null;
    let lockWatch: MutationObserver | null = null;

    const locked = () =>
      [document.documentElement, document.body].some((el) => getComputedStyle(el).overflowY === 'hidden');

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true, autoRaf: true, allowNestedScroll: true, anchors: { offset: ANCHOR_OFFSET } });
      lockWatch = new MutationObserver(() => {
        if (!lenis) return;
        if (locked()) lenis.stop();
        else lenis.start();
      });
      for (const el of [document.documentElement, document.body]) lockWatch.observe(el, { attributes: true, attributeFilter: ['style', 'class'] });
    };
    const stop = () => {
      lockWatch?.disconnect();
      lockWatch = null;
      lenis?.destroy();
      lenis = null;
    };
    const update = () => (smoothScrollWanted((q) => window.matchMedia(q).matches) ? start() : stop());

    update();
    desktop.addEventListener('change', update);
    reduced.addEventListener('change', update);
    return () => {
      desktop.removeEventListener('change', update);
      reduced.removeEventListener('change', update);
      stop();
    };
  }, []);

  return null;
}
