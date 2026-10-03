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

  it('keeps the chips to one row: the five busiest subjects, the rest behind "+n more"', () => {
    const terms = Array.from({ length: 8 }, (_, i) =>
      Array.from({ length: 8 - i }, (_, k) => ({ ...TERM, id: `t${i}-${k}`, subject_slug: `s${i}`, subject_name_en: `Subject${i}`, subject_order: i })),
    ).flat();
    const html = renderToStaticMarkup(<GlossarySearch terms={terms} />);
    for (const i of [0, 1, 2, 3, 4]) expect(html).toContain(`Subject${i}`);
    for (const i of [5, 6, 7]) expect(html).not.toContain(`Subject${i}`);
    expect(html).toMatch(/aria-expanded="false"[^>]*>\+3 more subjects/);
  });

  it('each term can be heard in both languages, saved and linked to', () => {
    const html = renderToStaticMarkup(<GlossarySearch terms={[TERM]} />);
    expect(html).toContain('aria-label="Listen in English: algorithm"');
    expect(html).toContain('aria-label="Listen in Vietnamese: thuật toán"');
    expect(html).toContain('aria-label="Save algorithm"');
    expect(html).toContain('aria-label="Copy link to algorithm"');
    expect(countRawColors(html).total).toBe(0);
  });
});
