// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityPage } from './CommunityPage';

const nav = vi.hoisted(() => ({ query: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.query),
  useRouter: () => ({ replace: nav.replace }),
}));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('./CommunityRoom', () => ({ CommunityRoom: () => <div>community-content</div> }));
vi.mock('../friends/FriendsTab', () => ({ FriendsTab: ({ dm }: { dm: string | null }) => <div>friends-content dm={String(dm)}</div> }));

afterEach(() => { cleanup(); nav.query = ''; nav.replace.mockClear(); });

describe('CommunityPage', () => {
  it('opens on the community room and switches to friends by URL', () => {
    render(<CommunityPage />);
    expect(screen.getByRole('tab', { name: 'Cộng đồng' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('community-content')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Bạn bè' }));
    expect(nav.replace).toHaveBeenCalledWith('/community?tab=friends');
  });

  it('shows the friends tab, with a direct chat open, from the URL', () => {
    nav.query = 'tab=friends&dm=abc';
    render(<CommunityPage />);
    expect(screen.getByRole('tab', { name: 'Bạn bè' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('friends-content dm=abc')).toBeTruthy();
  });
});
