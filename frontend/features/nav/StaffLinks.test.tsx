import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StaffLinksView, staffLinks } from './StaffLinks';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/lib/supabase', () => ({ createBrowserClient: () => ({}) }));

const hrefs = (place: Parameters<typeof staffLinks>[0], role: string | null) => staffLinks(place, role).map((l) => l.href);

describe('staffLinks', () => {
  it('puts lesson authoring on Subjects for teachers and admins', () => {
    expect(hrefs('subjects', 'teacher')).toEqual(['/teacher/lessons']);
    expect(hrefs('subjects', 'admin')).toEqual(['/teacher/lessons', '/admin/lessons/review']);
    expect(hrefs('subjects', 'student')).toEqual([]);
    expect(hrefs('subjects', null)).toEqual([]);
  });

  it('puts exam authoring on Exams for teachers and admins', () => {
    expect(hrefs('exams', 'teacher')).toEqual(['/exam/manage']);
    expect(staffLinks('exams', 'teacher')[0].label.vi).toBe('Quản lý đề thi');
    expect(hrefs('exams', 'admin')).toEqual(['/exam/manage']);
    expect(hrefs('exams', 'student')).toEqual([]);
  });

  it('puts plan prices on Pricing for admins only', () => {
    expect(hrefs('pricing', 'admin')).toEqual(['/admin/plans']);
    expect(hrefs('pricing', 'teacher')).toEqual([]);
  });
});

describe('StaffLinksView', () => {
  it('renders the buttons with their labels', () => {
    const html = renderToStaticMarkup(<StaffLinksView links={staffLinks('pricing', 'admin')} />);
    expect(html).toMatch(/<a[^>]*href="\/admin\/plans"[^>]*>[\s\S]*Quản lý giá gói/);
  });

  it('renders nothing for people without these tools', () => {
    expect(renderToStaticMarkup(<StaffLinksView links={[]} />)).toBe('');
  });
});
