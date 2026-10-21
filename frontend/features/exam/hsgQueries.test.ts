import { afterEach, describe, expect, it, vi } from 'vitest';
import { getHsgProblems } from './hsgQueries';

afterEach(() => vi.unstubAllGlobals());

describe('getHsgProblems', () => {
  it('sends the viewer’s session, which the API now requires', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ subject: { slug: 'informatics' }, questions: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await getHsgProblems('informatics', 'tok');
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('reports a refused session as an error, not as a missing subject', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    await expect(getHsgProblems('informatics')).resolves.toEqual({ kind: 'error' });
  });
});
