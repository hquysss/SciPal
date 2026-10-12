'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { RESTING, runRegulation, type Regulation } from './engines/regulation';

export const SITUATIONS = ['normal', 'low', 'high'] as const;
export type Situation = (typeof SITUATIONS)[number];
/** Blood volume relative to normal in each situation: a blood loss, or a rise in blood volume. */
export const VOLUME: Record<Situation, number> = { normal: 1, low: 0.75, high: 1.25 };
export const WINDOW = 40; // seconds of history kept for the chart

export type Sample = { readonly at: number; readonly pressure: number; readonly heartRate: number };

/**
 * Runs the baroreflex (engines/regulation) on the simulation clock while it is playing. `state` and
 * `history` change every frame and are read by the diagram directly; `shown` follows ten times a
 * second for the text.
 */
export function useRegulation(time: RefObject<number>, running: boolean, situation: Situation) {
  const state = useRef<Regulation>(RESTING);
  const history = useRef<Sample[]>([]);
  const volume = useRef(VOLUME[situation]);
  const [shown, setShown] = useState<Regulation>(RESTING);
  volume.current = VOLUME[situation];
  useEffect(() => {
    if (!running) return;
    let last = time.current;
    let sampled = last;
    let published = performance.now();
    let frame = 0;
    const tick = () => {
      const now = time.current;
      const dt = Math.min(Math.max(now - last, 0), 0.25);
      last = now;
      if (dt > 0) state.current = runRegulation(state.current, volume.current, dt);
      if (now - sampled >= 0.25 || now < sampled) {
        sampled = now;
        history.current.push({ at: now, pressure: state.current.pressure, heartRate: state.current.heartRate });
        while (history.current.length > 0 && now - history.current[0]!.at > WINDOW) history.current.shift();
      }
      const wall = performance.now();
      if (wall - published >= 100) { setShown(state.current); published = wall; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, time]);
  const reset = useCallback(() => { state.current = RESTING; history.current = []; setShown(RESTING); }, []);
  return { state, history, shown, reset };
}
export type RegulationRun = ReturnType<typeof useRegulation>;
