import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { LandingPage } from './LandingPage';
import type { EducationLevel } from './educationLevel';
import type { LandingCatalog } from './getLandingData';

let lang: 'en' | 'vi' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, t: (o: { en: string; vi: string }) => o[lang] }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/features/subjects/SubjectGrid', () => ({ SubjectGrid: () => <div data-subject-grid="" /> }));
vi.mock('@/features/survey/DemandPollBanner', () => ({ DemandPollBanner: () => <div data-poll="" /> }));
vi.mock('./hero/HeroStage', () => ({ HeroStage: ({ level }: { level: string }) => <div data-hero-stage={level} /> }));

const render = (level: EducationLevel) =>
  renderToStaticMarkup(
    <LandingPage
      level={level}
      levelSource="session"
      catalog={[] as unknown as LandingCatalog}
      informatics={{ kind: 'empty' }}
    />,
  );

describe('LandingPage', () => {
  it.each<[EducationLevel, string, string]>([
    ['primary', 'Bắt đầu từ', 'điều em tò mò.'],
    ['lower_secondary', 'Từng câu hỏi', 'mở rộng hiểu biết.'],
    ['upper_secondary', 'Hiểu khoa học', 'từ câu hỏi đầu tiên.'],
  ])('hero copy for %s', (level, first, second) => {
    lang = 'vi';
    const html = render(level);
    const h1 = html.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? '';
    expect(h1).toContain(first);
    expect(h1).toContain(second);
    expect(html).toContain('Bài học song ngữ, theo đúng chương trình của em.');
    expect(html).toMatch(/<a[^>]*href="#mon-hoc"[^>]*>[\s\S]*?Xem môn học/);
    expect(html).toMatch(/<a[^>]*href="\/\?chooseLevel=1"[^>]*>[\s\S]*?Đổi cấp/);
    expect(html).toContain(`data-hero-stage="${level}"`);
  });

  it('sections in order: hero, subjects, how, tutor, final CTA, footer', () => {
    lang = 'vi';
    const html = render('upper_secondary');
    const order = ['data-hero-stage', 'id="mon-hoc"', 'id="cach-hoc"', 'Hỏi bất cứ lúc nào', 'Sẵn sàng chưa?', '<footer'];
    const positions = order.map((marker) => html.indexOf(marker));
    positions.forEach((position, index) => expect(position, order[index]).toBeGreaterThan(-1));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain('Môn học của bạn');
    expect(html).toContain('data-subject-grid');
    expect(html).toMatch(/<a[^>]*href="#mon-hoc"[^>]*>[\s\S]*?Bắt đầu học/);
  });

  it('no "in preparation" copy at any level and the poll on every level', () => {
    for (const level of ['primary', 'lower_secondary', 'upper_secondary'] as const) {
      lang = 'vi';
      const vi = render(level);
      expect(vi).not.toMatch(/đang (được )?chuẩn bị|Sắp ra mắt|FIELD NOTE/i);
      expect(vi).toContain('data-poll');
      lang = 'en';
      expect(render(level)).not.toMatch(/in development|coming soon/i);
    }
    lang = 'vi';
  });

  it('English hero', () => {
    lang = 'en';
    const html = render('upper_secondary');
    expect(html).toContain('Make sense of science,');
    expect(html).toContain('one question at a time.');
    expect(html).toContain('Bilingual lessons that follow your curriculum.');
    lang = 'vi';
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(render('primary')).total).toBe(0);
  });
});
