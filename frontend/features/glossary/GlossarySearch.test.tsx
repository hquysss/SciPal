import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { GlossaryHeader } from './GlossaryHeader';
import { GlossarySearch } from './GlossarySearch';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'en', t: (o: { en: string; vi: string }) => o.en }),
}));
const saved = vi.hoisted(() => ({ ids: new Set<string>() }));
vi.mock('./savedTerms', () => ({
  useSavedTerms: () => ({ ids: saved.ids, signedIn: true, ready: true, save: async () => true, unsave: async () => true }),
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
    subject_name_en: 'Informatics', subject_name_vi: 'Tin học', subject_order: 1, ipa: null as string | null,
  };

  it('offers only subjects that have terms, with their counts, plus saved terms', () => {
    const html = renderToStaticMarkup(<GlossarySearch terms={[TERM]} />);
    expect(html).toContain('Informatics');
    expect(html).not.toContain('>Chemistry');
    expect(html).toMatch(/Informatics[^<]*<span[^>]*>1<\/span>/);
    expect(html).toContain('My words');
  });

  it('shows the IPA next to the English term', () => {
    const html = renderToStaticMarkup(<GlossarySearch terms={[{ ...TERM, ipa: 'ˈæl.ɡə.rɪ.ðəm' }]} />);
    expect(html).toMatch(/<span lang="en"[^>]*>\/ˈæl\.ɡə\.rɪ\.ðəm\/<\/span>/);
  });

  it('a signed-in learner can start a review from the glossary', () => {
    const html = renderToStaticMarkup(<GlossarySearch terms={[TERM]} />);
    expect(html).toMatch(/<a[^>]*href="\/review"[^>]*>.*?Review words<\/a>/);
  });

  it('counts only listed terms in My words', () => {
    saved.ids = new Set(['t1', 'gone']);
    const html = renderToStaticMarkup(<GlossarySearch terms={[TERM]} />);
    saved.ids = new Set();
    expect(html).toMatch(/My words<span[^>]*>1<\/span>/);
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

  it('shows one page of terms with a "show more" button instead of the whole list', () => {
    const terms = Array.from({ length: 45 }, (_, i) => ({ ...TERM, id: `t${i}`, term_en: `term ${i}` }));
    const html = renderToStaticMarkup(<GlossarySearch terms={terms} />);
    expect(html.match(/<article /g)).toHaveLength(20);
    expect(html).toContain('45 terms found');
    expect(html).toContain('Showing 20 of 45');
    expect(html).toContain('Show 20 more');
  });

  it('has no "show more" when everything fits on the first page', () => {
    const html = renderToStaticMarkup(<GlossarySearch terms={[TERM]} />);
    expect(html).not.toContain('Show 20 more');
    expect(html).not.toContain('Showing');
  });
});
