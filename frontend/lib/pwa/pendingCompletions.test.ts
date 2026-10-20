import { describe, expect, it } from 'vitest';
import { estimateStreak, flushCompletions, pendingFor, queueCompletion, recordStreak } from './pendingCompletions';

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}
const row = (lesson_id: string, user_id = 'u1') => ({ user_id, lesson_id, subject: 'informatics', queued_at: '2026-10-20T00:00:00Z' });
const fail = (status?: number) => Object.assign(new Error('x'), status === undefined ? {} : { status });

describe('pending completions', () => {
  it('queues a lesson once per user and keeps users apart', () => {
    const store = memory();
    queueCompletion(row('a'), store);
    queueCompletion(row('a'), store);
    queueCompletion(row('a', 'u2'), store);
    expect(pendingFor('u1', store)).toHaveLength(1);
    expect(pendingFor('u2', store)).toHaveLength(1);
  });

  it('estimates the streak by the server rule (same UTC day, next day, gap)', () => {
    const store = memory();
    recordStreak('u1', 'informatics', 4, new Date('2026-10-20T08:00:00Z'), store);
    expect(estimateStreak('u1', 'informatics', new Date('2026-10-20T23:00:00Z'), store)).toBe(4);
    expect(estimateStreak('u1', 'informatics', new Date('2026-10-21T01:00:00Z'), store)).toBe(5);
    expect(estimateStreak('u1', 'informatics', new Date('2026-10-23T01:00:00Z'), store)).toBe(1);
    expect(estimateStreak('u1', 'physics', new Date('2026-10-20T08:00:00Z'), store)).toBeNull();
  });

  it('removes what the server answered, drops a missing lesson, keeps the rest when the connection is lost', async () => {
    const store = memory();
    for (const id of ['ok', 'gone', 'down', 'after']) queueCompletion(row(id), store);
    const post = async (id: string) => {
      if (id === 'gone') throw fail(404);
      if (id === 'down') throw fail();
      return { xp_earned: 100, new_streak: 2 };
    };
    const result = await flushCompletions('u1', post, new Date('2026-10-20T08:00:00Z'), store);
    expect(result).toEqual({ synced: 1, xp: 100 });
    expect(pendingFor('u1', store).map((r) => r.lesson_id)).toEqual(['down', 'after']);
    expect(estimateStreak('u1', 'informatics', new Date('2026-10-20T09:00:00Z'), store)).toBe(2);
  });

  it('keeps a lesson after a server error or sign-in failure and goes on', async () => {
    const store = memory();
    for (const id of ['a', 'b']) queueCompletion(row(id), store);
    const post = async (id: string) => {
      if (id === 'a') throw fail(503);
      return { xp_earned: 0, new_streak: 1 };
    };
    expect(await flushCompletions('u1', post, new Date(), store)).toEqual({ synced: 1, xp: 0 });
    expect(pendingFor('u1', store).map((r) => r.lesson_id)).toEqual(['a']);
  });
});
