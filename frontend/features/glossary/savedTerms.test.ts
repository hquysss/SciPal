// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  session: null as null | { access_token: string },
  broken: false,
  rows: [] as Array<{ term_id: string }>,
  call: vi.fn(),
}));

vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => {
    if (mocks.broken) throw new Error('no Supabase URL');
    return {
    auth: {
      getSession: async () => ({ data: { session: mocks.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({ select: async () => ({ data: mocks.rows, error: null }) }),
    };
  },
}));
vi.mock('@/features/authoring/apiClient', () => ({ authoringCall: mocks.call }));

import { resetSavedTermsForTest, useSavedTerms } from './savedTerms';

const KEY = 'scipal-saved-terms';
const ok = (data: unknown) => ({ ok: true, data });
const fail = (status: number) => ({ ok: false, status, error: { en: 'x', vi: 'x' } });

async function ready() {
  const hook = renderHook(() => useSavedTerms());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

beforeEach(() => {
  resetSavedTermsForTest();
  window.localStorage.clear();
  mocks.session = null;
  mocks.broken = false;
  mocks.rows = [];
  mocks.call.mockReset();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useSavedTerms', () => {
  it('a guest keeps saved terms in this browser', async () => {
    const { result } = await ready();
    await act(async () => {
      expect(await result.current.save('a')).toBe(true);
    });
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual(['a']);
    expect(result.current.ids.has('a')).toBe(true);
    expect(result.current.signedIn).toBe(false);
    expect(mocks.call).not.toHaveBeenCalled();
  });

  it('without a Supabase client it works as a guest list', async () => {
    mocks.broken = true;
    const { result } = await ready();
    expect(result.current.signedIn).toBe(false);
  });

  it('a signed-in learner reads the list from the server', async () => {
    mocks.session = { access_token: 't' };
    mocks.rows = [{ term_id: 'a' }];
    const { result } = await ready();
    expect(result.current.signedIn).toBe(true);
    expect(result.current.ids.has('a')).toBe(true);
  });

  it("moves the browser's terms up once on sign-in", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(['a', 'b']));
    mocks.session = { access_token: 't' };
    mocks.call.mockResolvedValue(ok({ saved: ['a'] }));
    mocks.rows = [{ term_id: 'a' }];
    const { result } = await ready();
    expect(mocks.call).toHaveBeenCalledWith('/api/me/terms', 'POST', { term_ids: ['a', 'b'] });
    expect(result.current.ids.has('a')).toBe(true);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("keeps the browser's terms when the move fails", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(['a', 'b']));
    mocks.session = { access_token: 't' };
    mocks.call.mockResolvedValue(fail(0));
    await ready();
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual(['a', 'b']);
  });

  it('undoes a save the server refused', async () => {
    mocks.session = { access_token: 't' };
    const { result } = await ready();
    mocks.call.mockResolvedValue(fail(401));
    await act(async () => {
      expect(await result.current.save('c')).toBe(false);
    });
    expect(result.current.ids.has('c')).toBe(false);
  });

  it('a refused id is not kept', async () => {
    mocks.session = { access_token: 't' };
    const { result } = await ready();
    mocks.call.mockResolvedValue(ok({ saved: [] }));
    await act(async () => {
      expect(await result.current.save('x')).toBe(false);
    });
    expect(result.current.ids.has('x')).toBe(false);
  });

  it('unsave removes at once and calls DELETE; a failure puts it back', async () => {
    mocks.session = { access_token: 't' };
    mocks.rows = [{ term_id: 'a' }];
    const { result } = await ready();
    mocks.call.mockResolvedValue(ok({}));
    await act(async () => {
      expect(await result.current.unsave('a')).toBe(true);
    });
    expect(mocks.call).toHaveBeenCalledWith('/api/me/terms/a', 'DELETE');
    expect(result.current.ids.has('a')).toBe(false);

    mocks.call.mockResolvedValue(ok({ saved: ['a'] }));
    await act(async () => {
      expect(await result.current.save('a')).toBe(true);
    });
    mocks.call.mockResolvedValue(fail(500));
    await act(async () => {
      expect(await result.current.unsave('a')).toBe(false);
    });
    expect(result.current.ids.has('a')).toBe(true);
  });
});
