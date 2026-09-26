import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { SubjectHeader } from './SubjectHeader';
import { TopicAccordion } from './TopicAccordion';

let lang: 'en' | 'vi' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, t: (o: { en: string; vi: string }) => o[lang] }),
}));

const subject = { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', icon: '</>', levels: ['upper_secondary' as const] };

describe('SubjectHeader', () => {
  it('is bilingual with counts and a breadcrumb', () => {
    lang = 'vi';
    let html = renderToStaticMarkup(<SubjectHeader subject={subject} topicCount={4} lessonCount={12} />);
    expect(html).toMatch(/<h1[^>]*>Tin học<\/h1>/);
    expect(html).toContain('4 chủ đề, 12 bài học');
    expect(html).toContain('Trang chủ');
    lang = 'en';
    html = renderToStaticMarkup(<SubjectHeader subject={subject} topicCount={1} lessonCount={1} />);
    expect(html).toMatch(/<h1[^>]*>Informatics<\/h1>/);
    expect(html).toContain('1 topic, 1 lesson');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('TopicAccordion', () => {
  const topics = [
    {
      id: 't1',
      name_en: 'Algorithms',
      name_vi: 'Thuật toán',
      lessons: [{ id: 'l1', slug: 'tim-kiem', title_en: 'Search', title_vi: 'Tìm kiếm', sort_order: 1 }],
    },
  ];

  it('links the whole lesson row and uses tokens only', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<TopicAccordion topics={topics} subjectSlug="informatics" />);
    expect(html).toContain('href="/informatics/tim-kiem"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('1 bài học');
    expect(html).not.toContain('Học ngay');
    expect(html).not.toContain('→');
    expect(countRawColors(html).total).toBe(0);
  });
});
