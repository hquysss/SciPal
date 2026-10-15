'use client';

import { useEffect, useRef, useState } from 'react';

const PAUSE_MS = 1000;

/**
 * A history slider that moves through time instead of jumping: `pos` runs from 0 to `last` in
 * steps, fractional while it moves. One step forward (Next, Play) glides at a steady pace,
 * `stepMs(target)` per step; back, a jump or a drag goes straight there; reduced motion jumps.
 * `onMove(prev, next)` hears every move, so a map can start what the slider just passed.
 */
export function useTimelineGlide({ last, reduced, stepMs, onMove, narration }: { last: number; reduced: boolean; stepMs: (target: number) => number; onMove?: (prev: number, next: number) => void; narration?: readonly (string | undefined)[] }) {
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const posRef = useRef(0);
  const raf = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioStage = useRef(-1);
  const playingRef = useRef(false);
  playingRef.current = playing;
  const listener = useRef(onMove);
  listener.current = onMove;
  const tracks = useRef(narration);
  tracks.current = narration;
  const narrated = Boolean(narration?.length && narration.every((track) => typeof track === 'string'));

  const move = (next: number) => {
    const prev = posRef.current;
    posRef.current = next;
    setPos(next);
    listener.current?.(prev, next);
  };

  const stop = () => cancelAnimationFrame(raf.current);
  const stopAudio = (reset = true) => {
    const current = audio.current;
    if (!current) return;
    current.onended = null;
    current.pause();
    if (reset) current.currentTime = 0;
    if (reset) {
      audio.current = null;
      audioStage.current = -1;
    }
  };
  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    stopAudio();
  }, []);

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
    stopAudio();
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
    stopAudio();
    move(Math.min(Math.max(next, 0), last));
  };

  const playStage = (stage: number) => {
    const src = tracks.current?.[stage];
    if (!src) return;
    if (posRef.current < stage - 1e-6) glide(stage);
    const player = new Audio(src);
    audio.current = player;
    audioStage.current = stage;
    player.onended = () => {
      if (!playingRef.current || audio.current !== player) return;
      audio.current = null;
      audioStage.current = -1;
      if (stage >= last) {
        setPlaying(false);
        playingRef.current = false;
        return;
      }
      playStage(stage + 1);
    };
    void player.play().catch(() => {
      if (audio.current !== player) return;
      audio.current = null;
      audioStage.current = -1;
      setPlaying(false);
      playingRef.current = false;
    });
  };

  const play = () => {
    if (playingRef.current) {
      setPlaying(false);
      playingRef.current = false;
      stop();
      stopAudio(false);
      return;
    }
    playingRef.current = true;
    setPlaying(true);
    if (narrated) {
      if (audio.current) {
        if (posRef.current < audioStage.current - 1e-6) glide(audioStage.current);
        void audio.current.play().catch(() => {
          setPlaying(false);
          playingRef.current = false;
        });
        return;
      }
      if (posRef.current >= last - 1e-6) move(0);
      playStage(Math.min(Math.ceil(posRef.current - 1e-6), last));
      return;
    }
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
  return { pos, step, playing, narrated, go, jump, drag, play };
}
