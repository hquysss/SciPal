import { afterEach, describe, expect, it, vi } from 'vitest';
import { forgetExamAttempt, startExamAttempt } from './examAttempt';

const store = new Map<string, string>();
const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
});

describe('startExamAttempt', () => {
  it('starts one attempt and reuses its id after a reload', async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => reply(200, { attempt_id: JSON.parse(String(init.body)).attempt_id, status: 'started', remaining: 2, period: 'day' }));
    vi.stubGlobal('fetch', fetchMock);
    const first = await startExamAttempt('bp-1', 'token', storage);
    expect(first).toMatchObject({ ok: true, remaining: 2, period: 'day' });
    const again = await startExamAttempt('bp-1', 'token', storage);
    expect(again.ok && first.ok && again.attemptId === first.attemptId).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/exam\/bp-1\/attempts$/);
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token' });
  });

  it('says when the month’s attempts are used up, in both languages', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(429, { code: 'QUOTA_EXCEEDED', error: 'Em đã dùng hết 3 lượt thi chấm điểm tháng này.', error_en: 'You have used your 3 graded exam attempts this month.' })));
    const res = await startExamAttempt('bp-1', 'token', storage);
    expect(res).toEqual({ ok: false, blocked: true, error: { vi: 'Em đã dùng hết 3 lượt thi chấm điểm tháng này.', en: 'You have used your 3 graded exam attempts this month.' } });
  });

  it('starts over with a new id once the stored attempt was submitted, and forgets it on demand', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(200, { attempt_id: 'x', status: 'submitted', remaining: null })));
    await startExamAttempt('bp-1', 'token', storage);
    expect(store.size).toBe(0);
    store.set('scipal-exam-attempt:bp-1', 'y');
    forgetExamAttempt('bp-1', storage);
    expect(store.size).toBe(0);
  });

  it('reports a network failure as not blocked', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    const res = await startExamAttempt('bp-1', 'token', storage);
    expect(res).toMatchObject({ ok: false, blocked: false });
  });
});
