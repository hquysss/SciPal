import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SubjectMarquee, marqueeOrder } from './SubjectMarquee';
import type { LandingSubject } from '../landing/getLandingData';

vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (copy: { en: string; vi: string }) => copy.vi }) }));
vi.mock('@scipal/ui', () => ({ SubjectProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const subject = (slug: string, sort_order: number, live: boolean): LandingSubject => ({
  id: slug,
  slug,
  name_en: slug,
  name_vi: slug,
  icon: slug.slice(0, 1),
  icon_url: null,
  accent_color: '#16a34a',
  sort_order,
  education_level: 'upper_secondary',
  status: live ? 'active' : 'upcoming',
  liveGrades: live ? [10] : [],
});

const subjects = [subject('literature', 0, false), subject('math', 1, false), subject('physics', 2, true), subject('informatics', 3, true)];
const render = (list = subjects) =>
  renderToStaticMarkup(<SubjectMarquee level="upper_secondary" catalog={{ kind: 'ready', subjects: list }} />);

describe('marqueeOrder', () => {
  it('runs the subjects with lessons first, each group in catalog order', () => {
    expect(marqueeOrder(subjects).map((s) => s.slug)).toEqual(['physics', 'informatics', 'literature', 'math']);
  });
});

describe('SubjectMarquee', () => {
  it('lists each subject once for readers, subjects with lessons first', () => {
    const html = render();
    const shownItems = [...html.matchAll(/<li(?![^>]*aria-hidden)[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
    const shown = shownItems.join('');
    const names = shownItems.map((item) => item.match(/<h3>([^<]+)<\/h3>/)?.[1]);
    expect(names).toEqual(['physics', 'informatics', 'literature', 'math']);
    expect(shown.match(/href="\/physics#lop-10"/g)).toHaveLength(1);
    expect(html).toContain('Học ngay');
    expect(html).toContain('Đang biên soạn');
  });

  it('fills the loop with inert copies hidden from assistive technology', () => {
    const html = render([subject('informatics', 0, true)]);
    const copies = [...html.matchAll(/<li\b(?=[^>]*aria-hidden="true")(?=[^>]*inert="")([^>]*)>([\s\S]*?)<\/li>/g)];
    expect(copies.length).toBeGreaterThanOrEqual(7);
    expect(html.match(/<li\b(?![^>]*aria-hidden)/g)).toHaveLength(1);
    expect(copies.every((copy) => !/<a\b/i.test(copy[2]))).toBe(true);
    expect(html.match(/<a\b/g)).toHaveLength(1);
  });

  it('keeps the catalog messages', () => {
    expect(renderToStaticMarkup(<SubjectMarquee level="upper_secondary" catalog={{ kind: 'error' }} />)).toContain('Tải lại danh sách');
    expect(render([])).toContain('đang được chuẩn bị');
  });

  it('has no pause button and pauses the rail on hover or keyboard focus', async () => {
    const html = render();
    expect(html).not.toMatch(/<button[^>]*(pause|tạm dừng)|aria-label="[^\"]*(pause|tạm dừng)/i);
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="Các môn học; đưa tiêu điểm vào để dừng"');

    const { readFileSync } = await import('node:fs');
    const css = readFileSync('features/subjects/subject-marquee.module.css', 'utf8');
    expect(css).toContain('(hover: hover) and (pointer: fine)');
    expect(css).toMatch(/\.marquee:hover \.rail/);
    expect(css).toMatch(/\.marquee:focus-within \.rail/);
    expect(css).toMatch(/\.marquee:focus-within \.rail\s*\{[^}]*animation:\s*none;[^}]*translate:\s*0\s+0/);
    expect(css).toMatch(/\.marquee:focus-within\s*\{[^}]*mask-image:\s*none/);
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toMatch(/\(hover: none\), \(pointer: coarse\)/);
  });

  it('still gives keyboard users a stop target when every subject is in development', () => {
    const html = render([subject('literature', 0, false)]);
    expect(html).toContain('aria-label="Các môn học; đưa tiêu điểm vào để dừng"');
    expect(html).toContain('tabindex="0"');
    expect(html).not.toMatch(/<a\b/);
  });
});

describe('subject strip styles', () => {
  it('marks subjects with lessons in the warm sun → coral colours (no subject accent) at one card size', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('features/subjects/subject-marquee.module.css', 'utf8');
    expect(css).not.toContain('--accent');
    expect(css).toMatch(/\.live \{[^}]*var\(--coral\)/);
    expect(css).toMatch(/\.go \{[^}]*var\(--sun\)[^}]*var\(--coral\)/);
    // A card with lessons stands out by colour, not by size.
    expect(css).not.toMatch(/\.live \{[^}]*\swidth:/);
  });
});
