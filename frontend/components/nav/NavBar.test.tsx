import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NavBar } from './NavBar';

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

describe('NavBar', () => {
  it('marks the current route and uses drawn icons for the compact menu', () => {
    const html = renderToStaticMarkup(<NavBar />);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Từ điển');
    expect(html).toContain('aria-label="Mở menu"');
    expect(html).not.toContain('☰');
    expect(html).not.toContain('EdTech');
  });
});
