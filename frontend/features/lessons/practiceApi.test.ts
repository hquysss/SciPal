import { afterEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('../../lib/session', () => ({ getAccessToken: async () => session.token }));
import { checkPractice, fetchLessonPractice, runCode, submitCode } from './practiceApi';

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

describe('code API', () => {
  const code = { language: 'python' as const, source: 'print(1)' };

  it('asks a visitor to sign in without calling the server', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await submitCode('q1', code);
    expect(res).toMatchObject({ ok: false, signIn: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('submits the code with the token and returns the verdicts', async () => {
    session.token = 'tok';
    const result = { correct: true, code: { status: 'AC', tests: [] } };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    expect(await submitCode('q1', code)).toEqual({ ok: true, result });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/practice\/code\/submit$/);
    expect(JSON.parse(String(init!.body))).toEqual({ question_id: 'q1', language: 'python', source: 'print(1)' });
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('runs the code on the typed input and keeps the server message when it refuses', async () => {
    session.token = 'tok';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ status: 'AC', stdout: '6\n', stderr: '', time_ms: 5, memory_kb: 100 }), { status: 200 }));
    expect(await runCode('q1', code, '3\n')).toMatchObject({ ok: true, run: { stdout: '6\n' } });
    expect(JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body))).toMatchObject({ stdin: '3\n' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Đợi một phút.', error_en: 'Wait a minute.' }), { status: 429 }));
    expect(await runCode('q1', code, '')).toEqual({ ok: false, signIn: false, error: { vi: 'Đợi một phút.', en: 'Wait a minute.' } });
  });
});
