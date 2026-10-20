import { describe, expect, it } from 'vitest';
import { estimateStreak, flushPractice, pendingFor, queueFirstAnswer, recordStreak, type PendingAnswer, type SyncResult } from './pendingPractice';

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}
const answer = (question_id: string, answered_at = '2026-10-20T08:00:00.000Z', user_id = 'u1'): PendingAnswer => ({
  user_id,
  question_id,
  lesson_id: 'l1',
  subject_id: 's1',
  response: { selected_option: 'a' },
  answered_at,
});
const fail = (status?: number) => Object.assign(new Error('x'), status === undefined ? {} : { status });
const ok = (question_id: string, xp = 10, new_streak = 0): SyncResult => ({ question_id, status: 'ok', correct: true, xp_earned: xp, new_streak });

describe('pending practice answers', () => {
  it('keeps the first answer of a question', () => {
    const store = memory();
    expect(queueFirstAnswer(answer('q1'), store)).toBe('queued');
    expect(queueFirstAnswer({ ...answer('q1'), response: { selected_option: 'b' } }, store)).toBe('kept');
    expect(pendingFor('u1', store)).toEqual([answer('q1')]);
  });

  it("returns only this user's answers", () => {
    const store = memory();
    queueFirstAnswer(answer('q1'), store);
    queueFirstAnswer(answer('q1', undefined, 'u2'), store);
    expect(pendingFor('u1', store)).toHaveLength(1);
    expect(pendingFor('u2', store)).toHaveLength(1);
  });

  it('says when the answer could not be saved', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(queueFirstAnswer(answer('q1'), full)).toBe('failed');
  });

  it('drops answers the server settled (ok, gone, rejected) and keeps an error', async () => {
    const store = memory();
    for (const id of ['a', 'b', 'c', 'd']) queueFirstAnswer(answer(id), store);
    const post = async () => [ok('a', 15, 3), { question_id: 'b', status: 'gone' }, { question_id: 'c', status: 'rejected' }, { question_id: 'd', status: 'error' }] as SyncResult[];
    const res = await flushPractice('u1', post, new Date('2026-10-20T09:00:00Z'), store);
    expect(res).toMatchObject({ synced: 1, xp: 15 });
    expect(pendingFor('u1', store).map((a) => a.question_id)).toEqual(['d']);
    expect(estimateStreak('u1', 's1', new Date('2026-10-20T10:00:00Z'), store)).toBe(3);
  });

  it('keeps the whole queue when the connection drops or the session is gone', async () => {
    for (const error of [fail(), fail(401), fail(503)]) {
      const store = memory();
      for (const id of ['a', 'b']) queueFirstAnswer(answer(id), store);
      const res = await flushPractice('u1', async () => { throw error; }, new Date(), store);
      expect(res.synced).toBe(0);
      expect(pendingFor('u1', store)).toHaveLength(2);
    }
  });

  it('sends answers in the order they were made, 100 at a time', async () => {
    const store = memory();
    for (let i = 149; i >= 0; i--) queueFirstAnswer(answer(`q${i}`, new Date(Date.UTC(2026, 9, 20, 0, i)).toISOString()), store);
    const batches: string[][] = [];
    await flushPractice('u1', async (attempts) => {
      batches.push(attempts.map((a) => a.question_id));
      return attempts.map((a) => ok(a.question_id, 0));
    }, new Date(), store);
    expect(batches.map((b) => b.length)).toEqual([100, 50]);
    expect(batches[0]![0]).toBe('q0');
    expect(batches[1]![49]).toBe('q149');
    expect(pendingFor('u1', store)).toEqual([]);
  });

  it('estimates the streak by the server rule (same UTC day, next day, gap)', () => {
    const store = memory();
    recordStreak('u1', 's1', 4, new Date('2026-10-20T08:00:00Z'), store);
    expect(estimateStreak('u1', 's1', new Date('2026-10-20T23:00:00Z'), store)).toBe(4);
    expect(estimateStreak('u1', 's1', new Date('2026-10-21T01:00:00Z'), store)).toBe(5);
    expect(estimateStreak('u1', 's1', new Date('2026-10-23T01:00:00Z'), store)).toBe(1);
    expect(estimateStreak('u1', 's2', new Date('2026-10-20T08:00:00Z'), store)).toBeNull();
  });
});
