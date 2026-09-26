import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { ThemeToggle } from './ThemeToggle';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ t: (o: { en: string; vi: string }) => o.vi, lang: 'vi' }),
}));

describe('ThemeToggle', () => {
  it('renders nothing while dark mode is disabled', () => {
    expect(renderToStaticMarkup(<ThemeToggle enabled={false} />)).toBe('');
  });

  it('offers system, light and dark with system selected first', () => {
    const html = renderToStaticMarkup(<ThemeToggle enabled />);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Chế độ màu"');
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).toMatch(/aria-label="Theo hệ thống"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Theo hệ thống"/);
    expect(html).toContain('aria-label="Sáng"');
    expect(html).toContain('aria-label="Tối"');
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<ThemeToggle enabled tone="nav" />)).total).toBe(0);
    expect(countRawColors(renderToStaticMarkup(<ThemeToggle enabled tone="surface" />)).total).toBe(0);
  });
});
