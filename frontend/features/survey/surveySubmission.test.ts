import { afterEach, describe, expect, it, vi } from 'vitest';
import { postSurvey } from '../../lib/api';

describe('postSurvey', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects when the API responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(postSurvey({ type: 'demand', payload: { subjects: ['math'], grade: 10 } }))
      .rejects.toThrow('survey failed: 500');
  });

  it('resolves for a successful no-content response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(postSurvey({ type: 'demand', payload: { subjects: ['math'], grade: 10 } }))
      .resolves.toBeUndefined();
  });
});
