import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/session', () => ({ getAccessToken: async () => 'token' }));

import { checkPractice } from './practiceApi';
import { savePack } from '../../lib/pwa/practicePacks';
import { pendingFor, queueFirstAnswer, recordStreak } from '../../lib/pwa/pendingPractice';

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
const explanation = { vi: 'Vì vậy.', en: 'Because.' };
function withPack() {
  const store = memory();
  savePack(
    {
      user_id: 'u1',
      lesson_id: 'l1',
      subject_id: 's1',
      downloaded_at: '2026-10-20T00:00:00.000Z',
      questions: [],
      keys: { q1: { type: 'mc', difficulty: 2, data: { answer: 'b', explanation } } },
    },
    store,
  );
  return store;
}
const deps = (store: ReturnType<typeof memory>, online: boolean, fetcher: typeof fetch = vi.fn()) => ({
  online: () => online,
  userId: async () => 'u1',
  store,
  now: () => new Date('2026-10-20T08:00:00.000Z'),
  fetch: fetcher,
  flush: vi.fn(async () => {}),
});

describe('checkPractice without a connection', () => {
  it('grades on the device from the pack, queues the first answer and estimates its XP', async () => {
    const store = withPack();
    const res = await checkPractice('l1', 'q1', { selected_option: 'b' }, deps(store, false));
    expect(res).toEqual({ ok: true, result: { correct: true, explanation }, provisional: { xp: 15, streak: null } });
    expect(pendingFor('u1', store)).toEqual([
      { user_id: 'u1', question_id: 'q1', lesson_id: 'l1', subject_id: 's1', response: { selected_option: 'b' }, answered_at: '2026-10-20T08:00:00.000Z' },
    ]);
  });

  it('shows a later answer but keeps the first one queued, with no XP', async () => {
    const store = withPack();
    await checkPractice('l1', 'q1', { selected_option: 'a' }, deps(store, false));
    const res = await checkPractice('l1', 'q1', { selected_option: 'b' }, deps(store, false));
    expect(res).toMatchObject({ ok: true, result: { correct: true }, provisional: { xp: 0 } });
    expect(pendingFor('u1', store)[0]!.response).toEqual({ selected_option: 'a' });
  });

  it('says to save the lesson when there is no pack', async () => {
    const res = await checkPractice('l1', 'q1', { selected_option: 'b' }, deps(memory(), false));
    expect(res).toEqual({ ok: false, error: { vi: 'Tải bài này khi có mạng để làm offline.', en: 'Save this lesson while online to practise offline.' } });
  });

  it('falls back the same way when the request fails for lack of a connection', async () => {
    const store = withPack();
    const res = await checkPractice('l1', 'q1', { selected_option: 'b' }, deps(store, true, vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))));
    expect(res).toMatchObject({ ok: true, provisional: { xp: 15 } });
  });

  it('estimates the streak only for an answer that earns XP', async () => {
    const store = withPack();
    recordStreak('u1', 's1', 4, new Date('2026-10-20T01:00:00.000Z'), store);
    const wrong = await checkPractice('l1', 'q1', { selected_option: 'a' }, deps(store, false));
    expect(wrong).toMatchObject({ provisional: { xp: 0, streak: null } });
    const store2 = withPack();
    recordStreak('u1', 's1', 4, new Date('2026-10-20T01:00:00.000Z'), store2);
    const right = await checkPractice('l1', 'q1', { selected_option: 'b' }, deps(store2, false));
    expect(right).toMatchObject({ provisional: { xp: 15, streak: 4 } });
  });

  it('online, sends a queued offline answer to the same question first, so it stays the first answer', async () => {
    const store = withPack();
    queueFirstAnswer({ user_id: 'u1', question_id: 'q1', lesson_id: 'l1', subject_id: 's1', response: { selected_option: 'a' }, answered_at: '2026-10-20T07:00:00.000Z' }, store);
    const order: string[] = [];
    const fetcher = vi.fn(async () => {
      order.push('check');
      return new Response(JSON.stringify({ correct: true }), { status: 200 });
    });
    const d = { ...deps(store, true, fetcher as unknown as typeof fetch), flush: vi.fn(async () => void order.push('flush')) };
    await checkPractice('l1', 'q1', { selected_option: 'b' }, d);
    expect(order).toEqual(['flush', 'check']);
  });

  it('online, does not wait for a sync when the question is not queued', async () => {
    const store = withPack();
    const d = deps(store, true, vi.fn().mockResolvedValue(new Response(JSON.stringify({ correct: true }), { status: 200 })));
    await checkPractice('l1', 'q1', { selected_option: 'b' }, d);
    expect(d.flush).not.toHaveBeenCalled();
  });

  it('uses the server when online, without queuing', async () => {
    const store = withPack();
    const server = { correct: true, xp_earned: 15, new_streak: 2, lesson_completed: false };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(server), { status: 200 }));
    const res = await checkPractice('l1', 'q1', { selected_option: 'b' }, deps(store, true, fetcher));
    expect(res).toEqual({ ok: true, result: server });
    expect(pendingFor('u1', store)).toEqual([]);
  });
});
