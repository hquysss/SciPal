import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { LessonHeader } from './LessonHeader';

let lang: 'en' | 'vi' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, t: (o: { en: string; vi: string }) => o[lang] }),
}));

const lesson = {
  title_en: 'Search algorithms',
  title_vi: 'Thuật toán tìm kiếm',
  grade: 10,
  topics: { name_en: 'Algorithms', name_vi: 'Thuật toán' },
  subjects: { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', icon: '</>', accent_color: '#16a34a' },
};

describe('LessonHeader', () => {
  it('shows Vietnamese first with the English title as a secondary line', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<LessonHeader lesson={lesson} />);
    expect(html).toMatch(/<h1[^>]*>Thuật toán tìm kiếm<\/h1>/);
    expect(html).toContain('Search algorithms');
    expect(html).toContain('Trang chủ');
    expect(html).toContain('href="/informatics"');
    expect(html).toContain('Tin học, lớp 10');
  });

  it('switches every label to English', () => {
    lang = 'en';
    const html = renderToStaticMarkup(<LessonHeader lesson={lesson} />);
    expect(html).toMatch(/<h1[^>]*>Search algorithms<\/h1>/);
    expect(html).toContain('Home');
    expect(html).toContain('Informatics, grade 10');
    expect(html).toContain('aria-label="Breadcrumb"');
  });

  it('uses tokens and the accent only as a label', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<LessonHeader lesson={lesson} />);
    expect(countRawColors(html).total).toBe(0);
    expect(html).toContain('text-accent-ink');
    expect(html).not.toContain('font-mono');
    expect(html).not.toContain('uppercase');
  });
});
