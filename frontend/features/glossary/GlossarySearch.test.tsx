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
});
