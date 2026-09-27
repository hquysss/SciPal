import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } }),
}));
import { createInsertGuard, createSimulationRequest, listSimulationRequests, withdrawSimulationRequest } from './api';

afterEach(() => {
  vi.restoreAllMocks();
});

const LESSON = '22222222-2222-4222-8222-222222222222';

describe('simulation request API client', () => {
  it('sends the request for the lesson being edited', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ request: { id: 'r1' } }), { status: 201 }));
    const res = await createSimulationRequest(LESSON, { description: '  Tia sáng  ', reference_url: '' });
    expect(res.ok).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toMatch(new RegExp(`/api/authoring/lessons/${LESSON}/simulation-requests$`));
    expect(JSON.parse(String(init!.body))).toEqual({ description: 'Tia sáng' });
  });

  it('passes the server message in both languages, and a clear one for a lesson that is gone', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' }), { status: 404 }));
    const res = await createSimulationRequest(LESSON, { description: 'x' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(404);
      expect(res.error.vi).toMatch(/bài giảng/);
      expect(res.error.en).toBe('Lesson not found.');
    }
  });

  it('reports a network failure without throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    const res = await listSimulationRequests({ lesson_id: LESSON });
    expect(res.ok).toBe(false);
  });

  it('lists with filters and withdraws by id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ requests: [] }), { status: 200 }));
    await listSimulationRequests({ lesson_id: LESSON, status: 'open' });
    expect(String(fetchSpy.mock.calls[0]![0])).toMatch(/\?lesson_id=2222.*&status=open$/);
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));
    expect((await withdrawSimulationRequest('r1')).ok).toBe(true);
    expect(fetchSpy.mock.calls[1]![1]!.method).toBe('DELETE');
  });
});

describe('createInsertGuard', () => {
  it('inserts a result once, however many clicks arrive', () => {
    const insert = vi.fn();
    const guard = createInsertGuard(insert);
    guard('r1', { a: 1 });
    guard('r1', { a: 1 });
    guard('r2', { b: 2 });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(guard.done('r1')).toBe(true);
  });
});
