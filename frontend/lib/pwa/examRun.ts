// What this device knows about an exam being taken: when it started and how many times the learner
// left the page. Kept per attempt so closing the tab or reloading changes neither the clock nor the
// count. Removed with the rest of the exam on submit and on sign-out (clearPacks).

export const EXAM_RUN_PREFIX = 'scipal-exam-run:';
/** The third time the learner leaves the page, the exam is submitted. */
export const MAX_LEAVES = 3;

export type ExamRun = { started_at: string; leaves: number };

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const defaultStore = (): Store => globalThis.localStorage;
const key = (attemptId: string) => `${EXAM_RUN_PREFIX}${attemptId}`;

export function loadRun(attemptId: string, store: Store = defaultStore()): ExamRun | null {
  try {
    const run = JSON.parse(store.getItem(key(attemptId)) ?? 'null') as ExamRun | null;
    return run && typeof run.started_at === 'string' && typeof run.leaves === 'number' ? run : null;
  } catch {
    return null;
  }
}

function write(attemptId: string, run: ExamRun, store: Store): void {
  try {
    store.setItem(key(attemptId), JSON.stringify(run));
  } catch {
    // Storage full or blocked: the exam still runs, it just cannot be resumed after a reload.
  }
}

/** The record of this attempt, created (from `startedAt`, else now) if it is the first time. */
export function ensureRun(attemptId: string, startedAt?: string, store: Store = defaultStore()): ExamRun {
  const kept = loadRun(attemptId, store);
  if (kept) return kept;
  const run = { started_at: startedAt ?? new Date().toISOString(), leaves: 0 };
  write(attemptId, run, store);
  return run;
}

/** One more time the learner left the page; returns how many that makes. */
export function addLeave(attemptId: string, store: Store = defaultStore()): number {
  const run = loadRun(attemptId, store) ?? { started_at: new Date().toISOString(), leaves: 0 };
  const next = { ...run, leaves: run.leaves + 1 };
  write(attemptId, next, store);
  return next.leaves;
}

export function dropRun(attemptId: string, store: Store = defaultStore()): void {
  try {
    store.removeItem(key(attemptId));
  } catch {
    // Nothing was kept.
  }
}

/** Seconds of the exam still left, never below 0. */
export function secondsLeft(run: ExamRun, durationMinutes: number, now: number = Date.now()): number {
  return Math.max(0, durationMinutes * 60 - Math.floor((now - Date.parse(run.started_at)) / 1000));
}
