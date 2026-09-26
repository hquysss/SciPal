import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClassRoster, getTeacherClasses } from './classQueries';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('class queries', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the teacher token when listing classes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ classes: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await getTeacherClasses('tok-1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/classes$/);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it('reports an error instead of demo classes when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'nope' }, 401)));
    await expect(getTeacherClasses('tok-1')).resolves.toEqual({ kind: 'error' });
  });

  it('reports an error when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(getTeacherClasses('tok-1')).resolves.toEqual({ kind: 'error' });
  });

  it('maps a 404 roster to not_found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'x' }, 404)));
    await expect(getClassRoster('c1', 'tok-1')).resolves.toEqual({ kind: 'not_found' });
  });

  it('returns the real roster', async () => {
    const members = [{ student_id: 's1', display_name: 'An', joined_at: '2026-09-20', total_xp: 30, completed_lessons: 1 }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({
      class_room: { id: 'c1', name: '10A1', subject_id: 's', invite_code: 'ABC123' },
      members,
    })));
    await expect(getClassRoster('c1', 'tok-1')).resolves.toEqual({
      kind: 'ready',
      classRoom: { name: '10A1', invite_code: 'ABC123' },
      members,
    });
  });
});
