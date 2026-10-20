import type { PracticeCheckResult, PracticeResponse } from '@scipal/types';

// Practice answers made without a connection wait here until the server can grade them. Only the
// first answer to each question is kept: it is the one the server counts. The server stays the only
// authority; what the device showed for these answers is an estimate, replaced by its reply.

const QUEUE_KEY = 'scipal-pending-practice';
const MARKS_KEY = 'scipal-streak-marks';
const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH = 100;

/** Fired when the queue changes, so the sync banner updates and tries to send. */
export const PENDING_CHANGED = 'scipal:pending-changed';
/** Fired with the server's results (`detail: SyncResult[]`) after answers made offline were synced. */
export const PRACTICE_SYNCED = 'scipal:practice-synced';

export type PendingAnswer = {
  user_id: string;
  question_id: string;
  lesson_id: string;
  subject_id: string;
  response: PracticeResponse;
  answered_at: string;
};
export type SyncAttempt = Omit<PendingAnswer, 'user_id' | 'subject_id'>;
/** The server's word on one synced answer. */
export type SyncResult = {
  question_id: string;
  status: 'ok' | 'gone' | 'rejected' | 'error';
  counted?: boolean;
  xp_earned?: number;
  new_streak?: number;
  lesson_completed?: boolean;
  /** The queued answer this verdict is for (added on the device). */
  response?: PracticeResponse;
} & Partial<PracticeCheckResult>;
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

function write(store: Store, key: string, value: unknown): boolean {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage full or blocked: the caller says the answer could not be kept.
    return false;
  }
}

const defaultStore = (): Store => globalThis.localStorage;
const same = (a: PendingAnswer, b: { user_id: string; question_id: string }) => a.user_id === b.user_id && a.question_id === b.question_id;

export function pendingFor(userId: string, store: Store = defaultStore()): PendingAnswer[] {
  return read<PendingAnswer[]>(store, QUEUE_KEY, []).filter((row) => row.user_id === userId);
}

/** Queues the first answer to a question; a later one leaves it as it is ('kept'). */
export function queueFirstAnswer(row: PendingAnswer, store: Store = defaultStore()): 'queued' | 'kept' | 'failed' {
  const all = read<PendingAnswer[]>(store, QUEUE_KEY, []);
  if (all.some((item) => same(item, row))) return 'kept';
  return write(store, QUEUE_KEY, [...all, row]) ? 'queued' : 'failed';
}

function remove(userId: string, questionIds: Set<string>, store: Store): void {
  const rest = read<PendingAnswer[]>(store, QUEUE_KEY, []).filter((item) => !(item.user_id === userId && questionIds.has(item.question_id)));
  write(store, QUEUE_KEY, rest);
}

const markKey = (userId: string, subjectId: string) => `${userId}:${subjectId}`;

export function recordStreak(userId: string, subjectId: string, streak: number, now: Date = new Date(), store: Store = defaultStore()): void {
  if (!Number.isFinite(streak) || streak < 1) return;
  const marks = read<Record<string, StreakMark>>(store, MARKS_KEY, {});
  marks[markKey(userId, subjectId)] = { streak, day: now.toISOString().slice(0, 10) };
  write(store, MARKS_KEY, marks);
}

/** The estimate, by the server's own rule (backend touchStreak): same UTC day keeps it, the day after adds 1, a gap restarts at 1. */
export function estimateStreak(userId: string, subjectId: string, now: Date = new Date(), store: Store = defaultStore()): number | null {
  const mark = read<Record<string, StreakMark>>(store, MARKS_KEY, {})[markKey(userId, subjectId)];
  if (!mark) return null;
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
  return mark.day === today ? mark.streak : mark.day === yesterday ? mark.streak + 1 : 1;
}

/**
 * Sends one user's queued answers in the order they were made, 100 at a time. An answer leaves the
 * queue once the server settled it (graded, gone, or refused as malformed); a lost connection, an
 * expired session or a server error stops the run and keeps the rest for next time.
 */
export async function flushPractice(
  userId: string,
  post: (attempts: SyncAttempt[]) => Promise<SyncResult[]>,
  now: Date = new Date(),
  store: Store = defaultStore(),
): Promise<{ synced: number; xp: number; results: SyncResult[] }> {
  const queued = [...pendingFor(userId, store)].sort((a, b) => Date.parse(a.answered_at) - Date.parse(b.answered_at) || 0);
  const results: SyncResult[] = [];
  let xp = 0;
  for (let start = 0; start < queued.length; start += BATCH) {
    const batch = queued.slice(start, start + BATCH);
    let replies: SyncResult[];
    try {
      replies = await post(batch.map(({ question_id, lesson_id, response, answered_at }) => ({ question_id, lesson_id, response, answered_at })));
    } catch (error) {
      const status = (error as { status?: number }).status;
      // A batch the server refuses as a whole (400) will never pass: drop it rather than retry forever.
      if (status === 400) remove(userId, new Set(batch.map((a) => a.question_id)), store);
      break;
    }
    const settled = new Set<string>();
    for (const reply of replies) {
      if (reply.status === 'error') continue;
      settled.add(reply.question_id);
      if (reply.status !== 'ok') continue;
      const queued = batch.find((a) => a.question_id === reply.question_id);
      results.push({ ...reply, response: queued?.response });
      xp += reply.xp_earned ?? 0;
      const subject = queued?.subject_id;
      if (subject && reply.new_streak) recordStreak(userId, subject, reply.new_streak, now, store);
    }
    remove(userId, settled, store);
  }
  return { synced: results.length, xp, results };
}
