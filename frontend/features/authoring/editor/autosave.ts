import type { LessonStatus } from '../authoringQueries';

export type SaveOutcome = 'saved' | 'conflict' | 'failed';
export type AutosaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'failed' | 'conflict' | 'off';

/** Autosave never touches lessons learners can see or admins are reviewing. */
export function canAutosave(status: LessonStatus): boolean {
  return status === 'draft' || status === 'rejected';
}

export interface Autosaver {
  /** Content changed: save after `delayMs` without further changes. */
  schedule(): void;
  /** Save pending work now (before submitting). */
  flush(): Promise<void>;
  setEnabled(on: boolean): void;
  /** A manual save succeeded. */
  markSaved(): void;
  hasUnsavedWork(): boolean;
  dispose(): void;
}

/**
 * Debounced saving. One save runs at a time; edits made during a save are saved afterwards.
 * After a conflict (someone else saved the lesson) it stops for good: only a reload fixes that.
 */
export function createAutosaver(opts: {
  delayMs: number;
  save: () => Promise<SaveOutcome>;
  onState: (state: AutosaveState) => void;
}): Autosaver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let enabled = true;
  let stopped = false;
  let inFlight: Promise<void> | null = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const arm = () => {
    clearTimer();
    timer = setTimeout(() => void run(), opts.delayMs);
  };

  async function run(): Promise<void> {
    timer = null;
    if (inFlight || !dirty || stopped || !enabled) return;
    dirty = false;
    opts.onState('saving');
    let outcome: SaveOutcome = 'failed';
    inFlight = (async () => {
      outcome = await opts.save().catch((): SaveOutcome => 'failed');
    })();
    await inFlight;
    inFlight = null;
    if (outcome === 'saved') {
      if (dirty) {
        opts.onState('pending');
        arm();
      } else {
        opts.onState('saved');
      }
      return;
    }
    dirty = true;
    if (outcome === 'conflict') stopped = true;
    opts.onState(outcome);
  }

  return {
    schedule() {
      dirty = true;
      if (stopped) return;
      if (!enabled) {
        opts.onState('off');
        return;
      }
      opts.onState('pending');
      arm();
    },
    async flush() {
      clearTimer();
      if (inFlight) await inFlight;
      await run();
    },
    setEnabled(on) {
      enabled = on;
      if (!on) clearTimer();
      if (stopped) return;
      opts.onState(on ? (dirty ? 'pending' : 'idle') : 'off');
      if (on && dirty) arm();
    },
    markSaved() {
      dirty = false;
      opts.onState('saved');
    },
    hasUnsavedWork: () => dirty,
    dispose: clearTimer,
  };
}
