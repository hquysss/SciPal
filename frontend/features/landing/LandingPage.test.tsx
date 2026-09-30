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
vi.mock('@/features/subjects/SubjectMarquee', () => ({ SubjectMarquee: () => <div data-subject-grid="" /> }));
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
    ['primary', 'Bắt đầu từ', 'điều bạn tò mò.'],
    ['lower_secondary', 'Mỗi câu hỏi', 'là một bước hiểu thêm.'],
    ['upper_secondary', 'Hiểu từng bài,', 'tiến từng bước.'],
  ])('hero copy for %s', (level, first, second) => {
    lang = 'vi';
    const html = render(level);
    const h1 = html.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? '';
    expect(h1).toContain(first);
    expect(h1).toContain(second);
    expect(html).toContain('Học song ngữ Anh–Việt theo Chương trình GDPT 2018.');
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

  it('closes with a lively call to action that holds the subject poll', () => {
    lang = 'vi';
    const html = render('upper_secondary');
    const cta = html.match(/<section[^>]*aria-labelledby="start-title"[\s\S]*?<\/section>\s*<\/main>/)?.[0] ?? '';
    expect(cta).toContain('Mọi bài học đều miễn phí');
    expect(cta).toMatch(/<a[^>]*href="\/tutor"[^>]*>[\s\S]*?Hỏi Giáo sư SciPal/);
    expect(cta).toContain('data-poll');
    expect(cta.match(/data-cta-float/g)?.length).toBeGreaterThanOrEqual(4);
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
    expect(html).toContain('Understand each lesson.');
    expect(html).toContain('Move forward step by step.');
    expect(html).toContain('Learn in Vietnamese and English with Vietnam’s 2018 national curriculum.');
    lang = 'vi';
  });

  it('links the privacy policy from the footer', () => {
    lang = 'vi';
    const footer = render('upper_secondary').match(/<footer[\s\S]*<\/footer>/)?.[0] ?? '';
    expect(footer).toMatch(/<a[^>]*href="\/privacy"[^>]*>[\s\S]*?Quyền riêng tư/);
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(render('primary')).total).toBe(0);
  });

  it('lets a guest change level in place with a button instead of a link', () => {
    const html = renderToStaticMarkup(
      <LandingPage level="primary" levelSource="session" catalog={{ kind: 'ready', subjects: [] }} informatics={{ kind: 'empty' }} onChangeLevel={() => {}} />,
    );
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>[\s\S]*?Đổi cấp/);
    expect(html).not.toContain('href="/?chooseLevel=1"');
  });
});

