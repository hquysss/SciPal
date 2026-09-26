import type { EducationLevel } from './educationLevel';

/** Length of the notebook cover flip before a guest choice is applied. */
export const GATE_FLIP_MS = 400;

interface GateSelectionOptions {
  reducedMotion: boolean;
  /** Runs `fn` after `ms`; returns a canceller. */
  schedule: (fn: () => void, ms: number) => () => void;
  onSelect: (level: EducationLevel) => void;
  /** Called whenever the gate becomes choosable again. */
  onReset?: () => void;
  /** Delay after onSelect before another choice is accepted (0 = next tick). */
  rearmMs?: number;
}

/**
 * One per gate. The first choice wins until the gate re-arms: just after a guest choice
 * (so a failed save can be retried), or after `rearmMs` when an account POST left the page alive.
 */
export function createGateSelection({ reducedMotion, schedule, onSelect, onReset, rearmMs = 0 }: GateSelectionOptions) {
  let chosen: EducationLevel | null = null;
  let cancelPending: (() => void) | null = null;

  const reset = () => {
    cancelPending?.();
    cancelPending = null;
    chosen = null;
    onReset?.();
  };

  const complete = (level: EducationLevel) => {
    cancelPending = null;
    onSelect(level);
    if (chosen === level) cancelPending = schedule(reset, rearmMs);
  };

  return {
    /** Returns false when a choice is already in progress. */
    select(level: EducationLevel): boolean {
      if (chosen !== null) return false;
      chosen = level;
      if (reducedMotion) complete(level);
      else cancelPending = schedule(() => complete(level), GATE_FLIP_MS);
      return true;
    },
    pending(): EducationLevel | null {
      return chosen;
    },
    reset,
    dispose() {
      cancelPending?.();
      cancelPending = null;
    },
  };
}
