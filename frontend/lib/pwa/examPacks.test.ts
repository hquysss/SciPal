import { describe, expect, it, vi } from 'vitest';
import { clearExamPages, dropExam, loadDraft, loadExamPack, saveDraft, saveExamPack, type ExamPack } from './examPacks';
import { lastOfflineUser } from './practicePacks';
import { clearPacks } from './practicePacks';
import { flushExams, pendingExamsFor, queueExam, type PendingExam } from './pendingPractice';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}
const pack = (user_id = 'u1'): ExamPack => ({
  user_id,
  blueprint_id: 'bp1',
  attempt_id: 'a1',
  blueprint: { id: 'bp1', name: 'Đề 1' } as ExamPack['blueprint'],
  questions: [],
  keys: { q1: { type: 'mc', data: { answer: 'a' } } },
});
const exam = (attempt_id: string, user_id = 'u1'): PendingExam => ({
  user_id,
  attempt_id,
  blueprint_id: 'bp1',
  answers: [{ question_id: 'q1', selected_option: 'a' }],
  finished_at: '2026-10-20T08:00:00.000Z',
});
const fail = (status?: number) => Object.assign(new Error('x'), status === undefined ? {} : { status });

describe('exam packs', () => {
  it('keeps a pack per user and exam, and a draft per attempt', () => {
    const store = memory();
    expect(saveExamPack(pack(), store)).toBe(true);
    expect(loadExamPack('u1', 'bp1', store)?.attempt_id).toBe('a1');
    expect(loadExamPack('u2', 'bp1', store)).toBeNull();
    saveDraft('a1', { 0: { option: 'a' } }, store);
    expect(loadDraft('a1', store)).toEqual({ 0: { option: 'a' } });
    dropExam('u1', 'bp1', 'a1', store);
    expect(loadExamPack('u1', 'bp1', store)).toBeNull();
    expect(loadDraft('a1', store)).toBeNull();
  });

  it('are cleared with the practice packs when the learner signs out', () => {
    const store = memory();
    saveExamPack(pack(), store);
    saveDraft('a1', { 0: { option: 'a' } }, store);
    clearPacks(store);
    expect(loadExamPack('u1', 'bp1', store)).toBeNull();
    expect(loadDraft('a1', store)).toBeNull();
  });
});

describe('signing out', () => {
  it('removes kept exam pages, and leaves lesson pages', async () => {
    const urls = ['https://scipal.io.vn/exam/bp1', 'https://scipal.io.vn/informatics/vong-lap', 'https://scipal.io.vn/exam/bp2'];
    const cache = { keys: async () => urls.map((url) => ({ url })), delete: vi.fn(async () => true) };
    await clearExamPages({ open: async () => cache } as unknown as CacheStorage);
    expect(cache.delete.mock.calls.map(([r]) => (r as { url: string }).url)).toEqual([urls[0], urls[2]]);
  });

  it('remembers who saved for offline until then', () => {
    const store = memory();
    saveExamPack(pack(), store);
    expect(lastOfflineUser(store)).toBe('u1');
    clearPacks(store);
    expect(lastOfflineUser(store)).toBeNull();
  });
});

describe('exams submitted offline', () => {
  it('queues each attempt once and keeps users apart', () => {
    const store = memory();
    expect(queueExam(exam('a1'), store)).toBe('queued');
    expect(queueExam(exam('a1'), store)).toBe('kept');
    queueExam(exam('a2', 'u2'), store);
    expect(pendingExamsFor('u1', store)).toHaveLength(1);
  });

  it('sends them; a removed exam is dropped and reported, the rest still go', async () => {
    const store = memory();
    for (const id of ['gone', 'a2']) queueExam(exam(id), store);
    const post = async (row: PendingExam) => {
      if (row.attempt_id === 'gone') throw fail(404);
      return { score: 8, max_score: 10, xp_earned: 15 };
    };
    const res = await flushExams('u1', post, store);
    expect(res.results).toEqual([
      { blueprint_id: 'bp1', attempt_id: 'gone', gone: true },
      { blueprint_id: 'bp1', attempt_id: 'a2', result: { score: 8, max_score: 10, xp_earned: 15 } },
    ]);
    expect(res.synced).toBe(1);
    expect(pendingExamsFor('u1', store)).toEqual([]);
  });

  it('keeps every exam when the connection drops, the session is gone or the server fails', async () => {
    for (const error of [fail(), fail(401), fail(503)]) {
      const store = memory();
      queueExam(exam('a1'), store);
      const res = await flushExams('u1', async () => { throw error; }, store);
      expect(res.synced).toBe(0);
      expect(pendingExamsFor('u1', store)).toHaveLength(1);
    }
  });
});
