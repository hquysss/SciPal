import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    render(
      <RequireAdmin authStatus="loading" appRole={undefined}>
        <div>secret</div>
      </RequireAdmin>
    );
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByText(/verifying/i)).toBeTruthy();
  });

  it('renders access denied when authenticated but not admin', () => {
    render(
      <RequireAdmin authStatus="authenticated" appRole="student">
        <div>secret</div>
      </RequireAdmin>
    );
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByText(/access denied/i)).toBeTruthy();
  });

  it('renders children when admin', () => {
    render(
      <RequireAdmin authStatus="authenticated" appRole="admin">
        <div>secret</div>
      </RequireAdmin>
    );
    expect(screen.getByText('secret')).toBeTruthy();
  });
});
