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
  /**
   * A manual save (the Lưu button, submitting): waits for any autosave in flight, cancels the
   * pending one, then runs `save` so two requests never race on the same lesson version.
   */
  saveNow(save: () => Promise<SaveOutcome>): Promise<SaveOutcome>;
  /** A manual save succeeded outside `saveNow`. */
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
  let inFlight: Promise<SaveOutcome> | null = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const arm = () => {
    clearTimer();
    timer = setTimeout(() => void run(), opts.delayMs);
  };

  /** Run one save (automatic or manual) with nothing else in flight; report its outcome. */
  async function execute(save: () => Promise<SaveOutcome>): Promise<SaveOutcome> {
    dirty = false;
    opts.onState('saving');
    inFlight = save().catch((): SaveOutcome => 'failed');
    const outcome = await inFlight;
    inFlight = null;
    if (outcome === 'saved') {
      if (dirty && !stopped && enabled) {
        opts.onState('pending');
        arm();
      } else {
        opts.onState('saved');
      }
      return outcome;
    }
    dirty = true;
    if (outcome === 'conflict') stopped = true;
    opts.onState(outcome);
    return outcome;
  }

  async function run(): Promise<void> {
    timer = null;
    if (inFlight || !dirty || stopped || !enabled) return;
    await execute(opts.save);
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
    async saveNow(save) {
      clearTimer();
      while (inFlight) await inFlight;
      return execute(save);
    },
    markSaved() {
      dirty = false;
      opts.onState('saved');
    },
    hasUnsavedWork: () => dirty || inFlight !== null,
    dispose: clearTimer,
  };
}
