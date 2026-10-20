// Lessons finished without a connection wait here until the server can score them. The server stays the
// only authority: what we show for them is an estimate, labelled as one, and replaced by its answer.

const QUEUE_KEY = 'scipal-pending-completions';
const MARKS_KEY = 'scipal-streak-marks';
const DAY_MS = 24 * 60 * 60 * 1000;

export type PendingCompletion = { user_id: string; lesson_id: string; subject: string; queued_at: string };
/** The streak the server last reported for a subject, and the UTC day it counted. */
export type StreakMark = { streak: number; day: string };

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function read<T>(store: Store, key: string, fallback: T): T {
  try {
    return JSON.parse(store.getItem(key) ?? 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function write(store: Store, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the completion is simply not queued; the caller shows its normal error.
  }
}

const defaultStore = (): Store => globalThis.localStorage;

export function pendingFor(userId: string, store: Store = defaultStore()): PendingCompletion[] {
  return read<PendingCompletion[]>(store, QUEUE_KEY, []).filter((row) => row.user_id === userId);
}

/** Queues a lesson once per user. Returns false when it could not be saved. */
export function queueCompletion(row: PendingCompletion, store: Store = defaultStore()): boolean {
  const all = read<PendingCompletion[]>(store, QUEUE_KEY, []);
  if (!all.some((item) => item.user_id === row.user_id && item.lesson_id === row.lesson_id)) all.push(row);
  write(store, QUEUE_KEY, all);
  return read<PendingCompletion[]>(store, QUEUE_KEY, []).some((item) => item.user_id === row.user_id && item.lesson_id === row.lesson_id);
}

function removeCompletion(row: PendingCompletion, store: Store): void {
  const rest = read<PendingCompletion[]>(store, QUEUE_KEY, []).filter((item) => !(item.user_id === row.user_id && item.lesson_id === row.lesson_id));
  write(store, QUEUE_KEY, rest);
}

const markKey = (userId: string, subject: string) => `${userId}:${subject}`;

export function recordStreak(userId: string, subject: string, streak: number, now: Date = new Date(), store: Store = defaultStore()): void {
  if (!Number.isFinite(streak) || streak < 1) return;
  const marks = read<Record<string, StreakMark>>(store, MARKS_KEY, {});
  marks[markKey(userId, subject)] = { streak, day: now.toISOString().slice(0, 10) };
  write(store, MARKS_KEY, marks);
}

/** The estimate, by the server's own rule (backend touchStreak): same UTC day keeps it, the day after adds 1, a gap restarts at 1. */
export function estimateStreak(userId: string, subject: string, now: Date = new Date(), store: Store = defaultStore()): number | null {
  const mark = read<Record<string, StreakMark>>(store, MARKS_KEY, {})[markKey(userId, subject)];
  if (!mark) return null;
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
  return mark.day === today ? mark.streak : mark.day === yesterday ? mark.streak + 1 : 1;
}

type Scored = { xp_earned: number; new_streak: number };

/**
 * Sends the queued lessons of one user in order. A lesson leaves the queue once the server answered
 * (or says it no longer exists); a lost connection stops the run and keeps the rest for next time.
 */
export async function flushCompletions(
  userId: string,
  post: (lessonId: string) => Promise<Scored>,
  now: Date = new Date(),
  store: Store = defaultStore(),
): Promise<{ synced: number; xp: number }> {
  let synced = 0;
  let xp = 0;
  for (const row of pendingFor(userId, store)) {
    try {
      const res = await post(row.lesson_id);
      xp += res.xp_earned;
      recordStreak(userId, row.subject, res.new_streak, now, store);
      removeCompletion(row, store);
      synced += 1;
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 404) removeCompletion(row, store);
      else if (status === undefined) break;
    }
  }
  return { synced, xp };
}
