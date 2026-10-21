import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPracticeRemaining } from './practiceRemaining';

const lesson = { lesson_id: 'l1', slug: 'bai-1', subject_slug: 'informatics', title: { en: 'Lesson 1', vi: 'Bài 1' }, total: 5, done: 3, remaining: 2, last_at: '2026-10-21T08:00:00Z' };

afterEach(() => vi.unstubAllGlobals());

describe('getPracticeRemaining', () => {
  it('asks with the learner’s session and returns the lessons', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ lessons: [lesson] }) });
    vi.stubGlobal('fetch', fetchMock);
    expect(await getPracticeRemaining('tok')).toEqual([lesson]);
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/api/practice/remaining');
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer tok');
  });

  it('returns nothing, without asking, when there is no session', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await getPracticeRemaining(undefined)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns nothing when the server fails or answers something else, so the page still shows', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    expect(await getPracticeRemaining('tok')).toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ lessons: 'x' }) }));
    expect(await getPracticeRemaining('tok')).toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await getPracticeRemaining('tok')).toEqual([]);
  });
});
