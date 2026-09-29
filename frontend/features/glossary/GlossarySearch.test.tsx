import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { GlossaryHeader } from './GlossaryHeader';
import { GlossarySearch } from './GlossarySearch';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'en', t: (o: { en: string; vi: string }) => o.en }),
}));

describe('Glossary', () => {
  it('header is bilingual and uses tokens only', () => {
    const html = renderToStaticMarkup(<GlossaryHeader />);
    expect(html).toMatch(/<h1[^>]*>Glossary<\/h1>/);
    expect(countRawColors(html).total).toBe(0);
  });

  it('search has a labelled 44px input and tokens only', () => {
    const html = renderToStaticMarkup(<GlossarySearch terms={[]} />);
    expect(html).toMatch(/<label[^>]*for="glossary-search"/);
    expect(html).toContain('id="glossary-search"');
    expect(html).toContain('min-h-11');
    expect(countRawColors(html).total).toBe(0);
    expect(html).not.toContain('uppercase');
  });

  const TERM = {
    id: 't1', term_en: 'algorithm', term_vi: 'thuật toán', part_of_speech: 'noun',
    definition_en: 'Steps', definition_vi: 'Các bước', example_en: null, example_vi: null, subject_slug: 'informatics',
    subject_name_en: 'Informatics', subject_name_vi: 'Tin học', subject_order: 1,
  };

  it('offers only subjects that have terms, with their counts, plus saved terms', () => {
    const html = renderToStaticMarkup(<GlossarySearch terms={[TERM]} />);
    expect(html).toContain('Informatics');
    expect(html).not.toContain('>Chemistry');
    expect(html).toMatch(/Informatics[^<]*<span[^>]*>1<\/span>/);
    expect(html).toContain('Saved');
  });

  it('each term can be heard in both languages, saved and linked to', () => {
    const html = renderToStaticMarkup(<GlossarySearch terms={[TERM]} />);
    expect(html).toContain('aria-label="Listen: algorithm"');
    expect(html).toContain('aria-label="Listen: thuật toán"');
    expect(html).toContain('aria-label="Save algorithm"');
    expect(html).toContain('aria-label="Copy link to algorithm"');
    expect(countRawColors(html).total).toBe(0);
  });
});
