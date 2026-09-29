import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { ProfileCard } from './ProfileCard';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const render = (role: 'student' | 'teacher' | 'admin') =>
  renderToStaticMarkup(
    <ProfileCard
      displayName="Lê An"
      role={role}
      email="an@gmail.com"
      joinedAt="2026-09-01T00:00:00Z"
      avatarUrl={null}
      stats={{ totalXP: 1300, completedLessons: 4, longestStreak: 3 }}
    />,
  );

describe('ProfileCard', () => {
  it('introduces the learner: name, role, e-mail and since when', () => {
    const html = render('student');
    expect(html).toContain('Lê An');
    expect(html).toContain('Học sinh');
    expect(html).toContain('an@gmail.com');
    expect(html).toContain('Tham gia 9/2026');
    expect(html).toContain('>LA<');
  });

  it('shows the learning numbers', () => {
    const html = render('student');
    expect(html).toMatch(/1[.,]300/);
    expect(html).toContain('Bài đã học');
    expect(html).toContain('Chuỗi ngày kỉ lục');
  });

  it('has shortcuts to learning, progress, the tutor and the plan', () => {
    const html = render('student');
    for (const href of ['/subjects', '/progress', '/tutor', '/profile/plan']) expect(html).toContain(`href="${href}"`);
  });

  it('keeps the teaching and review tools for staff', () => {
    expect(render('teacher')).toContain('href="/teacher/classes"');
    expect(render('admin')).toContain('href="/admin/accounts"');
    expect(render('student')).not.toContain('href="/teacher/classes"');
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(render('admin')).total).toBe(0);
  });
});
