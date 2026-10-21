import type { BlueprintSummary } from '@/features/exam/examQueries';
import { PAGES_CACHE } from './cacheNames';
import { dropRun } from './examRun';
import type { DraftAnswer, ExamQuestionItem } from '@/features/exam/ExamRunner';

// "Tải đề để thi offline": one exam of a graded attempt the learner already started (the attempt is
// counted then), with what grades it, kept on this device for that learner. The answers inside are
// readable by anyone with the device (an accepted risk); they only give a provisional score. The
// answers being written are kept per attempt so closing the tab loses nothing. Signing out removes
// all of it (clearPacks).

export const EXAM_PACK_PREFIX = 'scipal-exam-pack:';
export const EXAM_DRAFT_PREFIX = 'scipal-exam-draft:';
/**
 * Who saved lessons or exams on this device. Offline the session may have expired (its token
 * cannot be refreshed without a connection), so the saved work is found by this id instead.
 */
export const OFFLINE_USER_KEY = 'scipal-offline-user';

export type ExamPack = {
  user_id: string;
  blueprint_id: string;
  attempt_id: string;
  blueprint: BlueprintSummary;
  questions: ExamQuestionItem[];
  keys: Record<string, { type: string; data: Record<string, unknown> }>;
  /** When the learner first started this exam: the clock keeps running across reopening the page. */
  started_at?: string;
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

export function rememberOfflineUser(userId: string, store: Store = defaultStore()): void {
  write(store, OFFLINE_USER_KEY, userId);
}

export const lastOfflineUser = (store: Store = defaultStore()) => read<string>(store, OFFLINE_USER_KEY);

/** False when the pack could not be kept (storage full or blocked). */
export function saveExamPack(pack: ExamPack, store: Store = defaultStore()): boolean {
  if (!write(store, packKey(pack.user_id, pack.blueprint_id), pack)) return false;
  rememberOfflineUser(pack.user_id, store);
  return true;
}

export const loadExamPack = (userId: string, blueprintId: string, store: Store = defaultStore()) => read<ExamPack>(store, packKey(userId, blueprintId));

export const saveDraft = (attemptId: string, answers: Record<number, DraftAnswer>, store: Store = defaultStore()) => write(store, draftKey(attemptId), answers);

export const loadDraft = (attemptId: string, store: Store = defaultStore()) => read<Record<number, DraftAnswer>>(store, draftKey(attemptId));

/** Removes the exam list and exam pages the service worker kept (they may show a class's exam) when the learner signs out. */
export async function clearExamPages(cachesApi: CacheStorage | undefined = globalThis.caches): Promise<void> {
  try {
    if (!cachesApi) return;
    const cache = await cachesApi.open(PAGES_CACHE);
    for (const request of await cache.keys()) {
      const { pathname } = new URL(request.url);
      if (pathname === '/exam' || pathname.startsWith('/exam/')) await cache.delete(request);
    }
  } catch {
    // No caches here: nothing was kept.
  }
}

/** The exam was submitted (or its result came back): its pack and draft are no longer needed. */
export function dropExam(userId: string, blueprintId: string, attemptId: string, store: Store = defaultStore()): void {
  try {
    store.removeItem(packKey(userId, blueprintId));
    store.removeItem(draftKey(attemptId));
    dropRun(attemptId, store);
  } catch {
    // Storage blocked: nothing was kept.
  }
}
