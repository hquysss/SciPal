import { describe, expect, it } from 'vitest';
import { subjectTermIndex } from './termIndexQuery';

/** A stand-in client that records the chain and answers with one result. */
function client(result: { data?: unknown; error?: unknown }) {
  const seen: Record<string, unknown[]> = {};
  const chain: any = {};
  for (const m of ['select', 'eq', 'order', 'limit']) chain[m] = (...a: unknown[]) => ((seen[m] = a), chain);
  chain.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null, ...result }).then(ok);
  return { seen, from: (table: string) => ((seen.from = [table]), chain) };
}

describe('subjectTermIndex', () => {
  it('reads the id and both names of the subject\'s terms by its slug', async () => {
    const c = client({ data: [{ id: 'a', term_en: 'loop', term_vi: 'vòng lặp', subjects: { slug: 'informatics' } }] });
    expect(await subjectTermIndex(c as never, 'informatics')).toEqual([{ id: 'a', term_en: 'loop', term_vi: 'vòng lặp' }]);
    expect(c.seen.from).toEqual(['terms']);
    expect(c.seen.eq).toEqual(['subjects.slug', 'informatics']);
  });

  it('is empty, never an error, when the read fails: the lesson still shows', async () => {
    expect(await subjectTermIndex(client({ error: { message: 'x' } }) as never, 'informatics')).toEqual([]);
  });
});
