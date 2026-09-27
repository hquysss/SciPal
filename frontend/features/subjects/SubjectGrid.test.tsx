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
  status: slug === 'informatics' ? 'active' : 'upcoming',
}));

describe('SubjectGrid', () => {
  it('shows each upper-secondary subject once in a static, navigable grid', () => {
    const html = renderToStaticMarkup(<SubjectGrid level="upper_secondary" catalog={{ kind: 'ready', subjects }} informatics={{ kind: 'available', lesson: { slug: 'binary-search', title_en: 'Binary search', title_vi: 'Tìm kiếm nhị phân' } }} />);
    expect(html.match(/<article/g)).toHaveLength(3);
    expect(html.match(/href="\/informatics"/g)).toHaveLength(1);
    expect(html).not.toContain('data-landing-reveal="" data-landing-reveal');
    expect(html).not.toContain('duplicate');
  });
});
