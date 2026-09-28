import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TranslationMark } from './TranslationMark';
import { AutoTranslateContext, AutoTranslatedNote } from './AutoTranslateContext';

const noop = () => {};

describe('TranslationMark', () => {
  it('shows nothing for English written by hand', () => {
    expect(renderToStaticMarkup(<TranslationMark mark={undefined} text={{ vi: 'Một', en: 'One' }} onRetranslate={noop} />)).toBe('');
    expect(renderToStaticMarkup(<TranslationMark mark={{ vi: 'Một', en: 'One' }} text={{ vi: 'Một', en: 'Edited' }} onRetranslate={noop} />)).toBe('');
  });

  it('says the English was translated automatically', () => {
    const html = renderToStaticMarkup(<TranslationMark mark={{ vi: 'Một', en: 'One' }} text={{ vi: 'Một', en: 'One' }} onRetranslate={noop} />);
    expect(html).toContain('Dịch tự động');
    expect(html).not.toContain('<button');
  });

  it('offers to translate again after the Vietnamese changed', () => {
    const html = renderToStaticMarkup(<TranslationMark mark={{ vi: 'Một', en: 'One' }} text={{ vi: 'Một nữa', en: 'One' }} onRetranslate={noop} />);
    expect(html).toContain('Tiếng Việt đã đổi');
    expect(html).toMatch(/<button[^>]*>Dịch lại<\/button>/);
  });
});

describe('AutoTranslatedNote', () => {
  const ctx = { marks: [{ vi: 'Một', en: 'One' }], retranslate: async () => null, addMarks: () => {} };

  it('finds the mark for the English on screen', () => {
    const html = renderToStaticMarkup(
      <AutoTranslateContext.Provider value={ctx}>
        <AutoTranslatedNote text={{ vi: 'Một', en: 'One' }} onEnglish={noop} />
      </AutoTranslateContext.Provider>,
    );
    expect(html).toContain('Dịch tự động');
  });

  it('shows nothing outside the lesson editor', () => {
    expect(renderToStaticMarkup(<AutoTranslatedNote text={{ vi: 'Một', en: 'One' }} onEnglish={noop} />)).toBe('');
  });
});
