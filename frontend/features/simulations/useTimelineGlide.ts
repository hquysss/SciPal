'use client';

import { useEffect, useRef, useState } from 'react';

const PAUSE_MS = 1000;

/**
 * A history slider that moves through time instead of jumping: `pos` runs from 0 to `last` in
 * steps, fractional while it moves. One step forward (Next, Play) glides at a steady pace,
 * `stepMs(target)` per step; back, a jump or a drag goes straight there; reduced motion jumps.
 * `onMove(prev, next)` hears every move, so a map can start what the slider just passed.
 */
export function useTimelineGlide({ last, reduced, stepMs, onMove }: { last: number; reduced: boolean; stepMs: (target: number) => number; onMove?: (prev: number, next: number) => void }) {
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const posRef = useRef(0);
  const raf = useRef(0);
  const playingRef = useRef(false);
  playingRef.current = playing;
  const listener = useRef(onMove);
  listener.current = onMove;

  const move = (next: number) => {
    const prev = posRef.current;
    posRef.current = next;
    setPos(next);
    listener.current?.(prev, next);
  };

  const stop = () => cancelAnimationFrame(raf.current);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const glide = (target: number, done?: () => void) => {
    stop();
    const start = posRef.current;
    if (reduced || typeof requestAnimationFrame === 'undefined') {
      move(target);
      done?.();
      return;
    }
    const t0 = performance.now();
    const ms = Math.max(Math.abs(target - start) * stepMs(target), 1);
    const tick = (now: number) => {
      const k = Math.min((now - t0) / ms, 1);
      move(start + (target - start) * k);
      if (k < 1) raf.current = requestAnimationFrame(tick);
      else done?.();
    };
    raf.current = requestAnimationFrame(tick);
  };

  /** Go to a step: one forward glides, anything else changes at once. */
  const go = (next: number) => {
    const target = Math.min(Math.max(next, 0), last);
    setPlaying(false);
    playingRef.current = false;
    if (target === Math.floor(posRef.current + 1e-6) + 1) glide(target);
    else {
      stop();
      move(target);
    }
  };

  /** Go straight to a step (a stage's own button). */
  const jump = (next: number) => drag(next);

  /** Follow a drag of the slider. */
  const drag = (next: number) => {
    stop();
    setPlaying(false);
    playingRef.current = false;
    move(Math.min(Math.max(next, 0), last));
  };

  const play = () => {
    if (playingRef.current) {
      setPlaying(false);
      playingRef.current = false;
      stop();
      return;
    }
    playingRef.current = true;
    setPlaying(true);
    if (posRef.current >= last - 1e-6) move(0);
    const next = () => {
      if (!playingRef.current) return;
      const target = Math.floor(posRef.current + 1e-6) + 1;
      if (target > last) {
        setPlaying(false);
        playingRef.current = false;
        return;
      }
      glide(target, () => window.setTimeout(next, PAUSE_MS));
    };
    next();
  };

  /** The step being shown: the one the slider is moving into. */
  const step = Math.min(Math.max(Math.ceil(pos - 1e-6), 0), last);
  return { pos, step, playing, go, jump, drag, play };
}
