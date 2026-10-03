import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authoringCall } from '@/features/authoring/apiClient';
import { EMPTY_DRAFT, createTerms, type TermDraft } from './api';

vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));
vi.mock('@/features/authoring/apiClient', () => ({ authoringCall: vi.fn(), queryString: () => '' }));

const drafts = (count: number): TermDraft[] => Array.from({ length: count }, (_, i) => ({ ...EMPTY_DRAFT, term_en: `term ${i}` }));
const okBatch = (sent: unknown) => {
  const terms = (sent as { terms: unknown[] }).terms;
  return { ok: true as const, data: { saved: terms.length, results: terms.map((_, index) => ({ index, ok: true as const, id: `id${index}` })) } };
};
const call = vi.mocked(authoringCall);

beforeEach(() => { call.mockReset(); });

describe('createTerms', () => {
  it('sends a short list in one request', async () => {
    call.mockImplementation((async (_path: string, _method: string, body: unknown) => okBatch(body)) as never);
    const result = await createTerms(drafts(5));
    expect(call).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, data: { saved: 5 } });
  });

  it('splits a long list into requests of at most 200, keeping row numbers of the whole list', async () => {
    call.mockImplementation((async (_path: string, _method: string, body: unknown) => okBatch(body)) as never);
    const result = await createTerms(drafts(450));
    expect(call.mock.calls.map(([, , body]) => (body as { terms: unknown[] }).terms.length)).toEqual([200, 200, 50]);
    if (!result.ok) throw new Error('expected success');
    expect(result.data.saved).toBe(450);
    expect(result.data.results.map((r) => r.index)).toEqual(Array.from({ length: 450 }, (_, i) => i));
  });

  it('offsets a refused row to its place in the whole list', async () => {
    call
      .mockResolvedValueOnce(okBatch({ terms: drafts(200) }) as never)
      .mockResolvedValueOnce({ ok: true, data: { saved: 0, results: [{ index: 3, ok: false, error: 'Trùng', error_en: 'Duplicate' }] } } as never);
    const result = await createTerms(drafts(250));
    if (!result.ok) throw new Error('expected success');
    expect(result.data.results.find((r) => !r.ok)).toMatchObject({ index: 203, error_en: 'Duplicate' });
  });

  it('stops after a failed request and leaves the later rows unsaved with the reason', async () => {
    call
      .mockResolvedValueOnce(okBatch({ terms: drafts(200) }) as never)
      .mockResolvedValueOnce({ ok: false, status: 0, error: { vi: 'Mất kết nối', en: 'Offline' } } as never);
    const result = await createTerms(drafts(450));
    expect(call).toHaveBeenCalledTimes(2);
    if (!result.ok) throw new Error('expected a partial result');
    expect(result.data.saved).toBe(200);
    const failed = result.data.results.filter((r) => !r.ok);
    expect(failed).toHaveLength(250);
    expect(failed[0]).toMatchObject({ index: 200, error_en: 'Offline' });
  });

  it('reports the error when the first request fails', async () => {
    call.mockResolvedValueOnce({ ok: false, status: 403, error: { vi: 'Không được', en: 'Not allowed' } } as never);
    expect(await createTerms(drafts(300))).toMatchObject({ ok: false, status: 403 });
  });
});
