import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllTerms } from './termQueries';

const { read, columns } = vi.hoisted(() => ({ read: vi.fn(), columns: [] as string[] }));
vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({
    from: () => ({
      select: (c: string) => {
        columns.push(c);
        const chain = { order: () => chain, range: (from: number, to: number) => read(from, to) };
        return chain;
      },
    }),
  }),
}));

const allele = {
  id: 'biology-allele', term_en: 'Allele', term_vi: 'Alen', part_of_speech: 'Noun',
  definition_en: 'An alternative version of a gene.', definition_vi: 'Một dạng khác nhau của cùng một gen.',
  example_en: null, example_vi: null,
  subjects: { slug: 'biology', name_en: 'Biology', name_vi: 'Sinh học', sort_order: 16 },
};

describe('glossary database reads', () => {
  beforeEach(() => { read.mockReset(); });

  it('keeps a genuinely empty database empty instead of returning sample terms', async () => {
    read.mockResolvedValue({ data: [], error: null });
    expect(await getAllTerms()).toEqual([]);
  });

  it('reports a database error instead of replacing it with sample terms', async () => {
    read.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });
    await expect(getAllTerms()).rejects.toThrow();
  });

  it('preserves real term text and subject metadata', async () => {
    read.mockResolvedValue({ data: [allele], error: null });
    const terms = await getAllTerms();
    expect(terms).toEqual([{
      id: allele.id, term_en: allele.term_en, term_vi: allele.term_vi, part_of_speech: allele.part_of_speech,
      definition_en: allele.definition_en, definition_vi: allele.definition_vi,
      example_en: null, example_vi: null,
      subject_slug: 'biology', subject_name_en: 'Biology', subject_name_vi: 'Sinh học', subject_order: 16,
    }]);
  });

  it('reads the IPA', async () => {
    read.mockResolvedValue({ data: [], error: null });
    await getAllTerms();
    expect(columns.at(-1)).toContain('ipa');
  });

  it('reads past the 1000-row page limit, page by page', async () => {
    const page = (n: number, from: number) => Array.from({ length: n }, (_, i) => ({ ...allele, id: `t${from + i}` }));
    read.mockImplementation(async (from: number) => ({ data: from === 0 ? page(1000, 0) : page(904, 1000), error: null }));
    const terms = await getAllTerms();
    expect(terms).toHaveLength(1904);
    expect(read.mock.calls).toEqual([[0, 999], [1000, 1999]]);
  });

  it('reads newly added terms on the next request', async () => {
    read.mockResolvedValueOnce({ data: [], error: null });
    read.mockResolvedValueOnce({ data: [allele], error: null });
    expect(await getAllTerms()).toHaveLength(0);
    expect(await getAllTerms()).toHaveLength(1);
    expect(read).toHaveBeenCalledTimes(2);
  });
});
