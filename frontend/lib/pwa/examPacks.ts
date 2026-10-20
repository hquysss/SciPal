import type { BlueprintSummary } from '@/features/exam/examQueries';
import type { DraftAnswer, ExamQuestionItem } from '@/features/exam/ExamRunner';

// "Tải đề để thi offline": one exam of a graded attempt the learner already started (the attempt is
// counted then), with what grades it, kept on this device for that learner. The answers inside are
// readable by anyone with the device (an accepted risk); they only give a provisional score. The
// answers being written are kept per attempt so closing the tab loses nothing. Signing out removes
// all of it (clearPacks).

export const EXAM_PACK_PREFIX = 'scipal-exam-pack:';
export const EXAM_DRAFT_PREFIX = 'scipal-exam-draft:';

export type ExamPack = {
  user_id: string;
  blueprint_id: string;
  attempt_id: string;
  blueprint: BlueprintSummary;
  questions: ExamQuestionItem[];
  keys: Record<string, { type: string; data: Record<string, unknown> }>;
};

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const defaultStore = (): Store => globalThis.localStorage;
const packKey = (userId: string, blueprintId: string) => `${EXAM_PACK_PREFIX}${userId}:${blueprintId}`;
const draftKey = (attemptId: string) => `${EXAM_DRAFT_PREFIX}${attemptId}`;

function read<T>(store: Store, key: string): T | null {
  try {
    return (JSON.parse(store.getItem(key) ?? 'null') as T | null) ?? null;
  } catch {
    return null;
  }
}

function write(store: Store, key: string, value: unknown): boolean {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** False when the pack could not be kept (storage full or blocked). */
export const saveExamPack = (pack: ExamPack, store: Store = defaultStore()) => write(store, packKey(pack.user_id, pack.blueprint_id), pack);

export const loadExamPack = (userId: string, blueprintId: string, store: Store = defaultStore()) => read<ExamPack>(store, packKey(userId, blueprintId));

export const saveDraft = (attemptId: string, answers: Record<number, DraftAnswer>, store: Store = defaultStore()) => write(store, draftKey(attemptId), answers);

export const loadDraft = (attemptId: string, store: Store = defaultStore()) => read<Record<number, DraftAnswer>>(store, draftKey(attemptId));

/** The exam was submitted (or its result came back): its pack and draft are no longer needed. */
export function dropExam(userId: string, blueprintId: string, attemptId: string, store: Store = defaultStore()): void {
  try {
    store.removeItem(packKey(userId, blueprintId));
    store.removeItem(draftKey(attemptId));
  } catch {
    // Storage blocked: nothing was kept.
  }
}
