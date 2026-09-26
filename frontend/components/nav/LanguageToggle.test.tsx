import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { LanguageToggle } from './LanguageToggle';

let lang: 'en' | 'vi' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, setLang: () => {}, t: (o: { en: string; vi: string }) => o[lang] }),
}));

const pressed = (label: string) =>
  new RegExp(`aria-label="${label}"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="${label}"`);

describe('LanguageToggle', () => {
  it('shows flags with spoken names instead of EN/VI text', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<LanguageToggle />);
    expect(html).toContain('src="/flags/vn.svg"');
    expect(html).toContain('src="/flags/gb.svg"');
    expect(html).toContain('aria-label="Tiếng Việt"');
    expect(html).toContain('aria-label="English"');
    expect(html).not.toMatch(/>\s*(EN|VI)\s*</);
    expect(html).toMatch(pressed('Tiếng Việt'));
  });

  it('marks English pressed when English is active', () => {
    lang = 'en';
    expect(renderToStaticMarkup(<LanguageToggle />)).toMatch(pressed('English'));
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<LanguageToggle />)).total).toBe(0);
  });
});
