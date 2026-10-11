'use client';

import { useEffect, useState, type RefObject } from 'react';

export function useReflexFrame(host: RefObject<HTMLDivElement | null>, panel: RefObject<HTMLDivElement | null>, visible: boolean) {
  const [layout, setLayout] = useState<{ readonly right: number; readonly bottom: number; readonly mode: 'side' | 'bottom' }>({ right: 0, bottom: 0, mode: 'side' });
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const measure = () => {
      const side = element.clientWidth > 700;
      const reserve = visible && panel.current ? (side ? panel.current.offsetWidth : panel.current.offsetHeight) + 28 : 0;
      const next = { right: side ? reserve : 0, bottom: side ? 0 : reserve, mode: side ? 'side' as const : 'bottom' as const };
      setLayout((before) => before.right === next.right && before.bottom === next.bottom && before.mode === next.mode ? before : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (panel.current) observer.observe(panel.current);
    measure();
    return () => observer.disconnect();
  }, [host, panel, visible]);
  return layout;
}

export function useReflexFullscreen(host: RefObject<HTMLDivElement | null>) {
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const changed = () => setExpanded(document.fullscreenElement === host.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, [host]);
  useEffect(() => {
    const element = host.current;
    if (!expanded || !element) return;
    const previous = document.activeElement;
    element.focus();
    const keys = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && document.fullscreenElement !== element) setExpanded(false);
      if (event.key !== 'Tab') return;
      const buttons = [...element.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, a[href]')].filter((el) => getComputedStyle(el).visibility === 'visible' && el.offsetParent !== null);
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    element.addEventListener('keydown', keys);
    return () => { element.removeEventListener('keydown', keys); if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [host, expanded]);
  const toggle = async () => {
    const element = host.current;
    if (!element) return;
    if (expanded) {
      if (document.fullscreenElement === element) await document.exitFullscreen();
      else setExpanded(false);
      return;
    }
    setHeight(element.offsetHeight);
    setExpanded(true);
    if (element.requestFullscreen) {
      try { await element.requestFullscreen(); }
      catch (error) { if (!(error instanceof DOMException) && !(error instanceof TypeError)) throw error; }
    }
  };
  return { expanded, height, toggle };
}
