import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RequireAdmin } from './RequireAdmin';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/accounts',
}));

// Mock @scipal/hooks
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ t: (o: { en: string }) => o.en, lang: 'en' }),
}));

describe('RequireAdmin', () => {
  it('renders loading when status is loading', () => {
    const html = renderToStaticMarkup(
      <RequireAdmin authStatus="loading" appRole={undefined}>
        <div>secret</div>
      </RequireAdmin>
    );
    expect(html).not.toContain('secret');
    expect(html).toMatch(/verifying/i);
  });

  it('renders access denied when authenticated but not admin', () => {
    const html = renderToStaticMarkup(
      <RequireAdmin authStatus="authenticated" appRole="student">
        <div>secret</div>
      </RequireAdmin>
    );
    expect(html).not.toContain('secret');
    expect(html).toMatch(/access denied/i);
  });

  it('renders children when admin', () => {
    const html = renderToStaticMarkup(
      <RequireAdmin authStatus="authenticated" appRole="admin">
        <div>secret</div>
      </RequireAdmin>
    );
    expect(html).toContain('secret');
  });
});
