import type { PublicPracticeQuestion } from '@scipal/types';

// "Tải để học offline" for practice: a lesson's questions and what grades them, kept on this device
// for the signed-in learner who downloaded them. The answers inside are readable by anyone with the
// device (an accepted risk); they are only used to show a provisional result, never to grant XP.
// Signing out removes every pack.

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
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  } catch {
    // Storage blocked: there is nothing to clear.
  }
}

/** Downloads and keeps each lesson's pack; says which lessons were kept and which failed. */
export async function downloadPacks(
  lessonIds: string[],
  token: string,
  userId: string,
  fetchPack: (lessonId: string, token: string) => Promise<Omit<PracticePack, 'user_id'>>,
  store: Store = defaultStore(),
): Promise<{ saved: string[]; failed: string[] }> {
  const saved: string[] = [];
  const failed: string[] = [];
  for (const lessonId of lessonIds) {
    try {
      const pack = await fetchPack(lessonId, token);
      (savePack({ ...pack, user_id: userId }, store) ? saved : failed).push(lessonId);
    } catch {
      failed.push(lessonId);
    }
  }
  return { saved, failed };
}
