import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { accountLinks, getAvatarUrl, moreLinks, NavBar, primaryLinks, roleLinks, tutorLink } from './NavBar';

vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...props }: { href: string; children: React.ReactNode; prefetch?: boolean }) =>
    <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/image', () => ({ default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} /> }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/glossary',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
}));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', setLang: () => {}, t: (copy: { en: string; vi: string }) => copy.vi }) }));
vi.mock('@/lib/supabase', () => ({ createBrowserClient: vi.fn() }));

describe('getAvatarUrl', () => {
  it('reads an https avatar from the account, and nothing else', () => {
    const user = (avatar_url: unknown) => ({ id: 'u', user_metadata: { avatar_url } }) as never;
    expect(getAvatarUrl(user('https://m.test/profiles/u/avatar-1.webp'))).toBe('https://m.test/profiles/u/avatar-1.webp');
    expect(getAvatarUrl(user('javascript:alert(1)'))).toBeNull();
    expect(getAvatarUrl(user(null))).toBeNull();
    expect(getAvatarUrl(null)).toBeNull();
  });
});

describe('NavBar', () => {
  it('marks the current route and uses drawn icons for the compact menu', () => {
    const html = renderToStaticMarkup(<NavBar />);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Từ điển');
    expect(html).toContain('Hướng dẫn');
    expect(html).toContain('aria-label="Mở menu"');
    expect(html).not.toContain('☰');
    expect(html).not.toContain('EdTech');
    expect(html).not.toContain('Trực tuyến');
    expect(html).toMatch(/<a[^>]*href="\/subjects"[^>]*>Môn học<\/a>/);
  });

  it('keeps the daily links on the bar and the reference pages in "Thêm", in both menus', () => {
    const html = renderToStaticMarkup(<NavBar />);
    const order = [...html.matchAll(/<a[^>]*href="(\/|\/subjects|\/lab|\/exam|\/tutor)"[^>]*>/g)].map((m) => m[1]);
    expect(order.slice(1, 6)).toEqual(['/', '/subjects', '/lab', '/exam', '/tutor']);
    expect(html).toContain('aria-controls="desktop-more-navigation"');
    expect(html.indexOf('desktop-more-navigation')).toBeLessThan(html.indexOf('href="/pricing"'));
    // The mobile menu uses the same groups, each with its own heading.
    expect(html).toContain('aria-label="Học"');
    expect(html).toContain('aria-label="Thêm"');
    expect(html).not.toContain('aria-label="Của tôi"'); // members only
  });
});

describe('admin link', () => {
  it('shows how many simulation requests wait for an admin', async () => {
    const { adminLinkLabel } = await import('./NavBar');
    expect(adminLinkLabel('vi', 0)).toBe('Quản trị');
    expect(adminLinkLabel('vi', 3)).toBe('Quản trị (3)');
    expect(adminLinkLabel('en', 12)).toBe('Admin (12)');
  });
});

describe('role menus', () => {
  it('keeps the menus short: authoring and prices live on their own pages', () => {
    // Authoring lives on the Subjects and Exams pages, plan prices on Pricing: not in the menus.
    for (const role of ['teacher', 'admin']) {
      const { teacherLinks, adminLinks } = roleLinks(role, 'vi', 0);
      const hrefs = [...teacherLinks, ...adminLinks].map((l) => l.href);
      expect(hrefs).not.toContain('/teacher/lessons');
      expect(hrefs).not.toContain('/exam/manage');
      expect(hrefs).not.toContain('/admin/plans');
    }
    expect(roleLinks('teacher', 'vi', 0).teacherLinks.map((l) => l.href)).toContain('/teacher/classes');
    expect(roleLinks('admin', 'vi', 0).adminLinks).toEqual([{ href: '/admin', label: 'Quản trị' }]);
    expect(roleLinks('teacher', 'vi', 0).teacherLinks.map((l) => l.href)).not.toContain('/admin/topics');
    expect(roleLinks('student', 'vi', 0)).toEqual({ teacherLinks: [], adminLinks: [] });
  });

  it('keeps glossary terms out of the menus: they open from the Glossary page', () => {
    expect(roleLinks('teacher', 'vi', 0).teacherLinks.map((l) => l.href)).not.toContain('/teacher/terms');
    expect(roleLinks('admin', 'vi', 0).adminLinks.map((l) => l.href)).not.toContain('/admin/terms');
  });

});

describe('tutorLink', () => {
  it('shows "Giáo sư" to everyone: visitors get a trial question', () => {
    expect(tutorLink('vi')).toEqual({ href: '/tutor', label: 'Giáo sư' });
    expect(tutorLink('en')).toEqual({ href: '/tutor', label: 'Professor' });
  });
});

describe('primaryLinks', () => {
  it('holds only what a student opens every day, and adds Community for members', () => {
    expect(primaryLinks('vi').map((l) => l.href)).toEqual(['/lab', '/exam', '/tutor']);
    expect(primaryLinks('vi', true).map((l) => l.href)).toEqual(['/lab', '/exam', '/tutor', '/community']);
  });
});

describe('moreLinks', () => {
  it('is reference pages only, the same for everyone', () => {
    expect(moreLinks('vi').map((l) => l.href)).toEqual(['/glossary', '/pricing', '/help']);
    expect(moreLinks('en').map((l) => l.label)).toEqual(['Glossary', 'Pricing', 'Help']);
  });
});

describe('accountLinks', () => {
  it('keeps everything personal in the account menu', () => {
    expect(accountLinks('vi', 'student').map((l) => l.href)).toEqual(['/profile', '/progress', '/games', '/classes', '/profile/plan']);
  });

  it('gives students their classes and plan; teachers keep theirs in the teacher menu', () => {
    expect(accountLinks('vi', 'student')).toContainEqual({ href: '/classes', label: 'Lớp của em' });
    expect(accountLinks('en', 'student')).toContainEqual({ href: '/profile/plan', label: 'My plan' });
    for (const role of ['teacher', 'admin']) {
      expect(accountLinks('vi', role).map((l) => l.href)).toEqual(['/profile', '/progress', '/games']);
    }
  });
});

describe('community link', () => {
  it('shows how many friend requests wait, in both languages', async () => {
    const { communityLabel } = await import('./NavBar');
    expect(communityLabel('vi', 0)).toBe('Cộng đồng');
    expect(communityLabel('vi', 2)).toBe('Cộng đồng (2)');
    expect(communityLabel('en', 3)).toBe('Community (3)');
  });
});
