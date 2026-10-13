import { describe, expect, it } from 'vitest';
import { getReviewDeck } from './reviewQueries';

/** A stand-in client: each from('user_terms') call takes the next queued result and records its chain. */
function client(results: Array<{ data?: unknown; error?: unknown; count?: number }>) {
  const calls: Array<Record<string, unknown[]>> = [];
  return {
    calls,
    from: () => {
      const result = results.shift()!;
      const seen: Record<string, unknown[]> = {};
      calls.push(seen);
      const chain: any = {};
      for (const m of ['select', 'lte', 'gt', 'order', 'limit']) chain[m] = (...a: unknown[]) => ((seen[m] = a), chain);
      chain.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null, ...result }).then(ok);
      return chain;
    },
  };
}

const row = { term_id: 'a', due_at: '2026-10-13T00:00:00Z', terms: { term_en: 'loop', term_vi: 'vòng lặp', ipa: null, part_of_speech: null, definition_en: 'd', definition_vi: 'n', example_en: null, example_vi: null } };

describe('getReviewDeck', () => {
  it('returns up to 20 due cards in due order, whether the list has words, and the next due time', async () => {
    const c = client([{ data: [row] }, { count: 3 }, { data: [{ due_at: '2026-10-20T00:00:00Z' }] }]);
    const deck = await getReviewDeck(c as never, new Date('2026-10-13T12:00:00Z'));
    expect(deck.cards).toEqual([{ term_id: 'a', ...row.terms }]);
    expect(deck.hasWords).toBe(true);
    expect(deck.nextDue).toBe('2026-10-20T00:00:00Z');
    expect(c.calls[0]!.lte).toEqual(['due_at', '2026-10-13T12:00:00.000Z']);
    expect(c.calls[0]!.limit).toEqual([20]);
    expect(c.calls[2]!.gt).toEqual(['due_at', '2026-10-13T12:00:00.000Z']);
  });

  it('an empty word list has no words and nothing next', async () => {
    const deck = await getReviewDeck(client([{ data: [] }, { count: 0 }, { data: [] }]) as never, new Date());
    expect(deck).toEqual({ cards: [], hasWords: false, nextDue: null });
  });

  it('reports a read error', async () => {
    await expect(getReviewDeck(client([{ error: { message: 'x' } }, { count: 0 }, { data: [] }]) as never, new Date())).rejects.toThrow();
  });
});
