import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { FaqSection, FAQ } from './FaqSection';
import { FeaturesSection } from './FeaturesSection';
import { CommunitySection } from './CommunitySection';

let lang: 'vi' | 'en' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, t: (o: { en: string; vi: string }) => o[lang] }),
}));

describe('FeaturesSection', () => {
  it('links the six features in both languages', () => {
    lang = 'vi';
    const vi = renderToStaticMarkup(<FeaturesSection />);
    for (const href of ['/exam', '/lab', '/games', '/progress', '/community', '/teacher']) expect(vi).toContain(`href="${href}"`);
    expect(vi).toContain('Hơn cả bài học');
    lang = 'en';
    expect(renderToStaticMarkup(<FeaturesSection />)).toContain('Practice exams');
  });
});

describe('CommunitySection', () => {
  it('introduces the community in both languages and links to it, on theme tokens', () => {
    lang = 'vi';
    const vi = renderToStaticMarkup(<CommunitySection />);
    expect(vi).toContain('Học cùng nhau');
    expect(vi).toContain('Thủ khoa tuần');
    expect(vi).toContain('href="/community"');
    expect(countRawColors(vi).total).toBe(0);
    lang = 'en';
    expect(renderToStaticMarkup(<CommunitySection />)).toContain('Learn together');
  });
});

describe('FaqSection', () => {
  it('has six questions, each answered in both languages', () => {
    expect(FAQ).toHaveLength(6);
    for (const { q, a } of FAQ) for (const copy of [q, a]) expect(copy.vi && copy.en).toBeTruthy();
    lang = 'vi';
    const html = renderToStaticMarkup(<FaqSection />);
    expect(html.match(/<details/g)).toHaveLength(6);
    expect(html).toContain('Câu hỏi thường gặp');
  });

  it('keeps both sections on theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<><FeaturesSection /><FaqSection /></>)).total).toBe(0);
  });
});
