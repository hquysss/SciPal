import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllTerms } from './termQueries';

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => ({
    from: () => ({ select: () => ({ order: () => read() }) }),
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

  it('reads newly added terms on the next request', async () => {
    read.mockResolvedValueOnce({ data: [], error: null });
    read.mockResolvedValueOnce({ data: [allele], error: null });
    expect(await getAllTerms()).toHaveLength(0);
    expect(await getAllTerms()).toHaveLength(1);
    expect(read).toHaveBeenCalledTimes(2);
  });
});
