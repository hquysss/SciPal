import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }),
}));
import { createQuestion, deleteQuestion, fetchQuestionsByIds, listPracticeQuestions, listQuestions, updateQuestion } from './api';

afterEach(() => {
  vi.restoreAllMocks();
});

const input = { usage: 'practice' as const, subject_id: 's', lesson_id: 'l', type: 'short' as const, difficulty: 1, data: { stem: { vi: 'A', en: 'A' }, answer_key: 'x' } };

describe('practice question API', () => {
  it('creates and updates with the teacher token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ question: { id: 'q1' } }), { status: 201 }));
    expect(await createQuestion(input)).toEqual({ ok: true, data: { question: { id: 'q1' } } });
    await updateQuestion('q1', input);
    const [[createUrl, createInit], [updateUrl, updateInit]] = fetchSpy.mock.calls as Array<[string, RequestInit]>;
    expect(createUrl).toMatch(/\/api\/authoring\/questions$/);
    expect(createInit.method).toBe('POST');
    expect(JSON.parse(String(createInit.body))).toEqual(input);
    expect((createInit.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(updateUrl).toMatch(/\/api\/authoring\/questions\/q1$/);
    expect(updateInit.method).toBe('PATCH');
  });

  it('searches published practice questions of a subject and loads questions by id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ questions: [] }), { status: 200 }));
    await listPracticeQuestions({ subject_id: 's1', q: 'đệ quy', page: 2 });
    await fetchQuestionsByIds(['a', 'b']);
    const [first, second] = fetchSpy.mock.calls.map(([url]) => new URL(String(url)));
    expect(Object.fromEntries(first!.searchParams)).toEqual({ usage: 'practice', status: 'published', subject_id: 's1', q: 'đệ quy', page: '2' });
    expect(Object.fromEntries(second!.searchParams)).toEqual({ usage: 'practice', ids: 'a,b' });
  });

  it('keeps the server’s message in both languages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Kiểm tra lại đáp án.', error_en: 'Check the answer.' }), { status: 400 }));
    expect(await createQuestion(input)).toEqual({ ok: false, status: 400, error: { vi: 'Kiểm tra lại đáp án.', en: 'Check the answer.' } });
  });
});

describe('listQuestions', () => {
  it('filters either pool and deletes by id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ questions: [] }), { status: 200 }));
    await listQuestions({ usage: 'exam', grade: 10, page: 2 });
    const url = new URL(String(fetchSpy.mock.calls[0]![0]), 'http://x');
    expect(Object.fromEntries(url.searchParams)).toEqual({ usage: 'exam', grade: '10', page: '2' });
    fetchSpy.mockImplementation(async () => new Response(null, { status: 204 }));
    expect((await deleteQuestion('q1')).ok).toBe(true);
    expect(String(fetchSpy.mock.calls[1]![0])).toContain('/api/authoring/questions/q1');
    expect(fetchSpy.mock.calls[1]![1]).toMatchObject({ method: 'DELETE' });
    fetchSpy.mockRestore();
  });
});
