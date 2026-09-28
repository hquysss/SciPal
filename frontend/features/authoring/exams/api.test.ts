import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }),
}));
import { approveExam, drawExamQuestions, rejectExam, updateExam } from './api';

afterEach(() => {
  vi.restoreAllMocks();
});


describe('exam api', () => {
  it('posts the draw, review actions and versioned updates to the exam routes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ question_ids: [], shortfalls: [] }), { status: 200 }));
    await drawExamQuestions({ subject_id: 's', counts: [{ type: 'mc', difficulty: 1, n: 2 }] });
    await approveExam('e1');
    await rejectExam('e1', 'Thêm câu');
    await updateExam('e1', { duration_minutes: 60, expected_updated_at: 't' });
    const calls = fetchSpy.mock.calls.map(([url, init]) => [String(url).replace(/^.*\/api/, '/api'), init?.method, init?.body]);
    expect(calls).toEqual([
      ['/api/authoring/exams/draw', 'POST', JSON.stringify({ subject_id: 's', counts: [{ type: 'mc', difficulty: 1, n: 2 }] })],
      ['/api/authoring/exams/e1/approve', 'POST', undefined],
      ['/api/authoring/exams/e1/reject', 'POST', JSON.stringify({ note: 'Thêm câu' })],
      ['/api/authoring/exams/e1', 'PATCH', JSON.stringify({ duration_minutes: 60, expected_updated_at: 't' })],
    ]);
  });
});
