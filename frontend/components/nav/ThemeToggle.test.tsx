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

  it('is one labelled switch, light until the client resolves the preference', () => {
    const html = renderToStaticMarkup(<ThemeToggle enabled />);
    expect(html.match(/<input/g)).toHaveLength(1);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-label="Chế độ tối"');
    expect(html).not.toContain('checked');
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<ThemeToggle enabled />)).total).toBe(0);
  });
});
