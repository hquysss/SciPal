import type { PracticeResponse } from '@scipal/types';

// The answers a learner has chosen in a lesson's Tự luyện but not handed in yet. Kept on this device
// so leaving the page does not lose them; they are not graded and give no XP until handed in. Once
// an answer is checked it leaves the draft. Signing out removes all of it (clearPacks).

export const PRACTICE_DRAFT_PREFIX = 'scipal-practice-draft:';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type PracticeDraft = Record<string, PracticeResponse>;

const defaultStore = (): Store => globalThis.localStorage;
const key = (lessonId: string) => `${PRACTICE_DRAFT_PREFIX}${lessonId}`;

export function loadPracticeDraft(lessonId: string, store: Store = defaultStore()): PracticeDraft | null {
  try {
    const draft = JSON.parse(store.getItem(key(lessonId)) ?? 'null') as PracticeDraft | null;
    return draft && typeof draft === 'object' && Object.keys(draft).length > 0 ? draft : null;
  } catch {
    return null;
  }
}

/** Keeps `draft`; an empty draft removes the record. */
export function savePracticeDraft(lessonId: string, draft: PracticeDraft, store: Store = defaultStore()): void {
  try {
    if (Object.keys(draft).length === 0) store.removeItem(key(lessonId));
    else store.setItem(key(lessonId), JSON.stringify(draft));
  } catch {
    // Storage full or blocked: the answers just are not kept across a reload.
  }
}
