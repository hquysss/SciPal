import { afterEach, describe, expect, it, vi } from 'vitest';

const getAccessToken = vi.fn<() => Promise<string | undefined>>();
vi.mock('../../lib/session', () => ({ getAccessToken: () => getAccessToken() }));

import { postSurvey } from '../../lib/api';

describe('postSurvey', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    getAccessToken.mockReset();
  });

  it('rejects when the API responds with an error status', async () => {
    getAccessToken.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(postSurvey({ type: 'demand', payload: { subjects: ['math'], grade: 10 } }))
      .rejects.toThrow('survey failed: 500');
  });

  it('resolves for a successful no-content response', async () => {
    getAccessToken.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(postSurvey({ type: 'demand', payload: { subjects: ['math'], grade: 10 } }))
      .resolves.toBeUndefined();
  });

  it('attaches the current session token when none is passed', async () => {
    getAccessToken.mockResolvedValue('session-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await postSurvey({ type: 'demand', payload: {} });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer session-token');
  });

  it('sends anonymously when there is no session', async () => {
    getAccessToken.mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await postSurvey({ type: 'demand', payload: {} });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).not.toHaveProperty('Authorization');
  });
});
