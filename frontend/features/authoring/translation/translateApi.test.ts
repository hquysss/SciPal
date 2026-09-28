import { beforeEach, describe, expect, it, vi } from 'vitest';

const call = vi.fn();
vi.mock('../apiClient', () => ({ authoringCall: (...args: unknown[]) => call(...args) }));

import { translateTexts } from './translateApi';

beforeEach(() => call.mockReset());

/** Answers each batch with its texts mapped (vitest may also call the mock with no args while matching). */
const echo = (map: (t: string) => string) => async (_p?: string, _m?: string, body?: { texts: string[] }) => ({ ok: true, data: { texts: (body?.texts ?? []).map(map) } });

describe('translateTexts', () => {
  it('sends batches of at most 40 texts and joins the results in order', async () => {
    call.mockImplementation(echo((t) => t.toUpperCase()));
    const texts = Array.from({ length: 41 }, (_, i) => `t${i}`);
    const res = await translateTexts(texts);
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[0]).toEqual(['/api/authoring/translate', 'POST', { from: 'vi', to: 'en', texts: texts.slice(0, 40) }]);
    expect(res).toEqual({ ok: true, data: { texts: texts.map((t) => t.toUpperCase()) } });
  });

  it('keeps each batch under 20 000 characters', async () => {
    call.mockImplementation(echo((t) => t));
    await translateTexts(['a'.repeat(8000), 'b'.repeat(8000), 'c'.repeat(8000)]);
    expect(call.mock.calls.map((c) => (c[2] as { texts: string[] }).texts.length)).toEqual([2, 1]);
  });

  it('stops at the first failing batch and returns its error', async () => {
    const error = { ok: false, status: 429, error: { vi: 'Hết lượt', en: 'Used up' } };
    call.mockResolvedValueOnce(error);
    const res = await translateTexts(Array.from({ length: 41 }, () => 'x'));
    expect(res).toEqual(error);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('makes no call for nothing', async () => {
    expect(await translateTexts([])).toEqual({ ok: true, data: { texts: [] } });
    expect(call).not.toHaveBeenCalled();
  });
});
