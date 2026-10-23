import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { SelectionSection } from './SelectionSection';

const language = vi.hoisted(() => ({ lang: 'vi' as 'en' | 'vi' }));
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: language.lang, t: (o: { en: string; vi: string }) => o[language.lang] }),
}));

describe('SelectionSection', () => {
  it('shows the heading and the three ways to select', () => {
    const html = renderToStaticMarkup(<SelectionSection />);
    expect(html).toMatch(/<h2[^>]*>Bôi đen một từ, hiểu ngay nghĩa<\/h2>/);
    expect(html).toContain('Nhấp đúp');
    expect(html).toContain('Nhấn giữ');
  });

  it('picks one term out of the sample line and shows it in both languages', () => {
    const html = renderToStaticMarkup(<SelectionSection />);
    expect(html).toMatch(/<mark[^>]*>tìm kiếm nhị phân/);
    expect(html).toMatch(/lang="en"[^>]*>binary search</);
    expect(renderToStaticMarkup(<SelectionSection level="primary" />)).toMatch(/<mark[^>]*>điểm ảnh/);
  });

  it('follows the page language', () => {
    language.lang = 'en';
    const html = renderToStaticMarkup(<SelectionSection />);
    language.lang = 'vi';
    expect(html).toMatch(/<mark[^>]*>binary search/);
    expect(html).toMatch(/lang="vi"[^>]*>tìm kiếm nhị phân</);
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<SelectionSection />)).total).toBe(0);
  });
});

describe('LandingPage', () => {
  it('places the lookup section after the tutor section', () => {
    const page = readFileSync('features/landing/LandingPage.tsx', 'utf8');
    expect(page.indexOf('<SelectionSection')).toBeGreaterThan(page.indexOf('<TutorSection'));
  });
});
