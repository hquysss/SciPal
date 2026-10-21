import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { accountLinks, communityLink, getAvatarUrl, learnLinks, moreLinks, NavBar, roleLinks, tutorLink } from './NavBar';

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
    expect(html).toMatch(/<a[^>]*href="\/subjects"[^>]*>.*Môn học/);
  });

  it('sorts the pages into categories: Học tập and Tra cứu menus, each with a heading and a hint per page', () => {
    const html = renderToStaticMarkup(<NavBar />);
    expect(html).toContain('aria-controls="desktop-learn-navigation"');
    expect(html).toContain('aria-controls="desktop-more-navigation"');
    // Learn pages come before the reference pages.
    const order = ['/subjects', '/lab', '/exam', '/tutor', '/glossary', '/pricing', '/help'].map((href) => html.indexOf(`href="${href}"`));
    expect(order).toEqual([...order].sort((x, y) => x - y));
    expect(order, JSON.stringify(order)).not.toContain(-1);
    expect(html).toContain('Bài học theo môn');
    expect(html).toContain('Thuật ngữ khoa học song ngữ');
    // The mobile menu uses the same categories, each with its own heading.
    expect(html).toContain('aria-label="Học tập"');
    expect(html).toContain('aria-label="Tra cứu"');
    expect(html).not.toContain('aria-label="Của tôi"');
    expect(html).not.toContain('aria-label="Kết nối"'); // members only
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
    // An admin sees every class, so the menu needs a way in.
    expect(roleLinks('admin', 'vi', 0).adminLinks).toEqual([
      { href: '/admin', label: 'Quản trị' },
      { href: '/teacher/classes', label: 'Lớp học' },
    ]);
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

describe('learnLinks', () => {
  it('holds what a student opens to study, each with a hint', () => {
    expect(learnLinks('vi').map((l) => l.href)).toEqual(['/subjects', '/lab', '/exam', '/tutor']);
    expect(learnLinks('en').every((l) => l.hint.length > 0)).toBe(true);
    expect(communityLink('vi')).toEqual({ href: '/community', label: 'Cộng đồng' });
  });
});

describe('moreLinks', () => {
  it('is reference pages only, the same for everyone', () => {
    expect(moreLinks('vi').map((l) => l.href)).toEqual(['/glossary', '/pricing', '/help']);
    expect(moreLinks('en').map((l) => l.label)).toEqual(['Glossary', 'Pricing', 'Help']);
  });
});

describe('accountLinks', () => {
  it('splits what is personal into learning and account sections', () => {
    const by = (group: string) => accountLinks('vi', 'student').filter((l) => l.group === group).map((l) => l.href);
    expect(by('study')).toEqual(['/progress', '/games', '/classes']);
    expect(by('account')).toEqual(['/profile', '/profile/plan', '/profile/orders']);
  });

  it('gives students their classes and plan; teachers keep theirs in the teacher menu', () => {
    expect(accountLinks('en', 'student').map((l) => l.label)).toEqual(expect.arrayContaining(['My classes', 'My plan']));
    expect(accountLinks('vi', 'teacher').map((l) => l.href)).toEqual(['/progress', '/games', '/profile', '/profile/orders']);
    expect(accountLinks('vi', 'admin').map((l) => l.href)).toEqual(['/progress', '/games', '/profile']);
  });
});

describe('community link', () => {
  it('shows how many friend requests wait, in both languages', async () => {
    const { communityLabel } = await import('./NavBar');
    expect(communityLabel('vi', 0)).toBe('Cộng đồng');
    expect(communityLabel('vi', 2)).toBe('Cộng đồng (2)');
    expect(communityLabel('en', 3)).toBe('Community (3)');
    expect(communityLabel('vi', 2, 5)).toBe('Cộng đồng (2), 5 tin nhắn mới');
    expect(communityLabel('en', 0, 150)).toBe('Community, 99+ new messages');
  });
});
