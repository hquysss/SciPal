import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SubjectGrid } from './SubjectGrid';
import type { LandingSubject } from '../landing/getLandingData';

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (copy: { en: string; vi: string }) => copy.vi }) }));
vi.mock('@scipal/ui', () => ({ SubjectProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const subjects: LandingSubject[] = ['informatics', 'math', 'physics'].map((slug, sort_order) => ({
  id: slug,
  slug,
  name_en: slug,
  name_vi: slug,
  icon: slug.slice(0, 1),
  icon_url: null,
  accent_color: '#16a34a',
  sort_order,
  education_level: 'upper_secondary',
  status: slug === 'physics' ? 'upcoming' : 'active',
  liveGrades: slug === 'physics' ? [] : [10],
}));

describe('SubjectGrid', () => {
  it('shows each upper-secondary subject once in a static, navigable grid', () => {
    const html = renderToStaticMarkup(<SubjectGrid level="upper_secondary" catalog={{ kind: 'ready', subjects }} informatics={{ kind: 'available', lesson: { slug: 'binary-search', title_en: 'Binary search', title_vi: 'Tìm kiếm nhị phân' } }} />);
    expect(html.match(/<article/g)).toHaveLength(3);
    expect(html.match(/href="\/informatics#lop-10"/g)).toHaveLength(1);
    expect(html.match(/href="\/math#lop-10"/g)).toHaveLength(1);
    expect(html).not.toContain('href="/physics');
    expect(html.match(/Có bài học/g)).toHaveLength(2);
    expect(html.match(/Đang biên soạn/g)?.length).toBeGreaterThanOrEqual(1);
    expect(html.match(/data-landing-reveal=""/g)).toHaveLength(3);
    expect(html).not.toContain('duplicate');
  });

  it('lets a card with a subject scope fill its grid cell like the others', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('features/subjects/subject-grid.module.css', 'utf8');
    expect(css).toMatch(/\.levelGrid \.cardScope \{[^}]*width: 100%/);
  });
});

