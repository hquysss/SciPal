import type { PublicPracticeQuestion } from '@scipal/types';
import { EXAM_DRAFT_PREFIX, EXAM_PACK_PREFIX, OFFLINE_USER_KEY, rememberOfflineUser } from './examPacks';
import { EXAM_RUN_PREFIX } from './examRun';
import { PRACTICE_DRAFT_PREFIX } from './practiceDraft';

/** Same as EXAM_ATTEMPT_PREFIX (features/exam/examAttempt.ts), kept here so signing out needs no feature code. */
const EXAM_ATTEMPT_KEY_PREFIX = 'scipal-exam-attempt:';

export { lastOfflineUser } from './examPacks';

// "Tải để học offline" for practice: a lesson's questions and what grades them, kept on this device
// for the signed-in learner who downloaded them. The answers inside are readable by anyone with the
// device (an accepted risk); they are only used to show a provisional result, never to grant XP.
// Signing out removes every pack, exam packs and exam drafts included.

const PREFIX = 'scipal-practice-pack:';

export type PracticePack = {
  user_id: string;
  lesson_id: string;
  subject_id: string;
  downloaded_at: string;
  questions: PublicPracticeQuestion[];
  keys: Record<string, { type: string; difficulty: number; data: unknown }>;
};

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
const defaultStore = (): Store => globalThis.localStorage;
const keyOf = (userId: string, lessonId: string) => `${PREFIX}${userId}:${lessonId}`;

/** False when the pack could not be kept (storage full or blocked). */
export function savePack(pack: PracticePack, store: Store = defaultStore()): boolean {
  try {
    store.setItem(keyOf(pack.user_id, pack.lesson_id), JSON.stringify(pack));
    rememberOfflineUser(pack.user_id, store);
    return true;
  } catch {
    return false;
  }
}

export function loadPack(userId: string, lessonId: string, store: Store = defaultStore()): PracticePack | null {
  try {
    return (JSON.parse(store.getItem(keyOf(userId, lessonId)) ?? 'null') as PracticePack | null) ?? null;
  } catch {
    return null;
  }
}

export function clearPacks(store: Store = defaultStore()): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key && (key === OFFLINE_USER_KEY || [PREFIX, EXAM_PACK_PREFIX, EXAM_DRAFT_PREFIX, EXAM_RUN_PREFIX, EXAM_ATTEMPT_KEY_PREFIX, PRACTICE_DRAFT_PREFIX].some((prefix) => key.startsWith(prefix)))) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    // Storage blocked: there is nothing to clear.
  }
}

/**
 * Downloads and keeps each lesson's pack; says which lessons were kept and which failed. Stops once
 * storage is full (`full`), so the offline answer queue keeps room.
 */
export async function downloadPacks(
  lessonIds: string[],
  token: string,
  userId: string,
  fetchPack: (lessonId: string, token: string) => Promise<Omit<PracticePack, 'user_id'>>,
  store: Store = defaultStore(),
): Promise<{ saved: string[]; failed: string[]; full: boolean }> {
  const saved: string[] = [];
  const failed: string[] = [];
  for (const [index, lessonId] of lessonIds.entries()) {
    let pack: Omit<PracticePack, 'user_id'>;
    try {
      pack = await fetchPack(lessonId, token);
    } catch {
      failed.push(lessonId);
      continue;
    }
    if (savePack({ ...pack, user_id: userId }, store)) {
      saved.push(lessonId);
      continue;
    }
    failed.push(...lessonIds.slice(index));
    return { saved, failed, full: true };
  }
  return { saved, failed, full: false };
}
