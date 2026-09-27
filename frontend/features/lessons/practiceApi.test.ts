import { afterEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('../../lib/session', () => ({ getAccessToken: async () => session.token }));
import { checkPractice, fetchLessonPractice } from './practiceApi';

afterEach(() => {
  vi.restoreAllMocks();
  session.token = null;
});

describe('practice API', () => {
  it('loads a lesson’s questions without signing in', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ questions: [{ id: 'q1' }] }), { status: 200 }));
    expect(await fetchLessonPractice('lesson-1')).toEqual({ ok: true, questions: [{ id: 'q1' }] });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/practice\/lessons\/lesson-1\/questions$/);
    expect((init?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  it('checks an answer, sending the token when there is a session', async () => {
    session.token = 'tok';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ correct: true }), { status: 200 }));
    expect(await checkPractice('q1', { selected_option: 'a' })).toEqual({ ok: true, result: { correct: true } });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/practice\/check$/);
    expect(JSON.parse(String(init!.body))).toEqual({ question_id: 'q1', response: { selected_option: 'a' } });
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('keeps the server message in both languages, and survives a network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Hãy nhập câu trả lời.', error_en: 'Type an answer.' }), { status: 400 }));
    expect(await checkPractice('q1', { short_answer: '' })).toEqual({ ok: false, error: { vi: 'Hãy nhập câu trả lời.', en: 'Type an answer.' } });
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    const offline = await fetchLessonPractice('lesson-1');
    expect(offline.ok).toBe(false);
  });
});
