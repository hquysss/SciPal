import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SubjectsPage, subjectsForGrade } from './SubjectsPage';
import type { LandingSubject } from '../landing/getLandingData';

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (copy: { en: string; vi: string }) => copy.vi }) }));
vi.mock('@scipal/ui', () => ({
  LevelScope: ({ level, children }: { level: string; children: React.ReactNode }) => <div data-level={level}>{children}</div>,
  SubjectProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const subject = (
  slug: string,
  level: LandingSubject['education_level'],
  grades: number[],
  liveGrades: number[] = [],
): LandingSubject => ({
  id: slug,
  slug,
  name_en: slug,
  name_vi: `Môn ${slug}`,
  icon: 'x',
  icon_url: null,
  accent_color: '#16a34a',
  sort_order: 0,
  education_level: level,
  status: liveGrades.length > 0 ? 'active' : 'upcoming',
  grades,
  liveGrades,
});

const catalog = {
  kind: 'ready' as const,
  subjects: [
    subject('informatics', 'upper_secondary', [10, 11, 12], [11]),
    subject('math', 'upper_secondary', [10, 12]),
    subject('reading', 'primary', [1, 2]),
  ],
};

describe('subjectsForGrade', () => {
  it('keeps only subjects taught in that grade', () => {
    expect(subjectsForGrade(catalog, 11).map((s) => s.slug)).toEqual(['informatics']);
    expect(subjectsForGrade(catalog, 10).map((s) => s.slug)).toEqual(['informatics', 'math']);
    expect(subjectsForGrade(catalog, 7)).toEqual([]);
  });
});

describe('SubjectsPage', () => {
  it('offers only the grades of the chosen level and opens on its first grade', () => {
    const html = renderToStaticMarkup(<SubjectsPage accountLevel="primary" catalog={catalog} />);
    const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? '';
    for (let grade = 1; grade <= 5; grade += 1) expect(main).toContain(`aria-label="Lớp ${grade}"`);
    for (let grade = 6; grade <= 12; grade += 1) expect(main).not.toContain(`aria-label="Lớp ${grade}"`);
    expect(main.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(main).toMatch(/aria-pressed="true"[^>]*aria-label="Lớp 1"|aria-label="Lớp 1"[^>]*aria-pressed="true"/);
    expect(main).toContain('Môn reading');
    expect(main).not.toContain('Môn informatics');
  });

  it('offers every grade 1–12 while no level is chosen yet', () => {
    const html = renderToStaticMarkup(<SubjectsPage accountLevel={null} catalog={catalog} />);
    for (let grade = 1; grade <= 12; grade += 1) expect(html).toContain(`aria-label="Lớp ${grade}"`);
    expect(html).toMatch(/aria-pressed="true"[^>]*aria-label="Lớp 10"|aria-label="Lớp 10"[^>]*aria-pressed="true"/);
  });

  it('links a subject only in a grade with published lessons, straight to that grade', () => {
    const html = renderToStaticMarkup(<SubjectsPage accountLevel="upper_secondary" catalog={catalog} />);
    // Grade 10: informatics has no lessons there yet, so no link.
    expect(html).not.toContain('href="/informatics#lop-10"');
    expect(html).toContain('Đang biên soạn');
  });
});
