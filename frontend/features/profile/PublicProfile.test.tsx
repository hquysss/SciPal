// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicProfile } from './PublicProfile';
import type { PublicProfile as Profile } from './profileApi';

const getProfile = vi.fn();
const sendRequest = vi.fn();
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('./profileApi', async (orig) => ({ ...(await orig<object>()), getProfile: (...a: unknown[]) => getProfile(...a) }));
vi.mock('../friends/friendsApi', () => ({ sendRequest: (...a: unknown[]) => sendRequest(...a) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const profile = (over: Partial<Profile> = {}): Profile => ({
  user_id: 'u2', display_name: 'Bình', avatar_url: null, cover_url: null, role: 'student', grade: 11, school: 'THPT B', bio: 'Thích Tin học',
  show_school: null, show_bio: null, is_me: false, relation: 'none', friendship_id: null, streak: { current: 3, best: 9 }, ...over,
});

describe('PublicProfile', () => {
  it('shows grade, school, bio and streak, and sends a friend request', async () => {
    getProfile.mockResolvedValue({ ok: true, data: profile() });
    sendRequest.mockResolvedValue({ ok: true, data: { id: 'f1', status: 'pending' } });
    render(<PublicProfile userId="u2" />);
    expect(await screen.findByRole('heading', { name: 'Bình' })).toBeTruthy();
    expect(screen.getByText('Lớp 11')).toBeTruthy();
    expect(screen.getByText('THPT B')).toBeTruthy();
    expect(screen.getByText('Thích Tin học')).toBeTruthy();
    expect(screen.getByText('ngày liên tiếp').parentElement?.textContent).toBe('3ngày liên tiếp');
    expect(screen.getByText('ngày kỉ lục').parentElement?.textContent).toBe('9ngày kỉ lục');
    fireEvent.click(screen.getByRole('button', { name: 'Kết bạn' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đã gửi lời mời' })).toBeTruthy());
    expect(sendRequest).toHaveBeenCalledWith('u2');
  });

  it('shows the role, the leaderboard place and the weekly trophy for first place', async () => {
    getProfile.mockResolvedValue({ ok: true, data: profile({ role: 'admin', rank: { position: 2, xp: 500, week: 1 } }) });
    render(<PublicProfile userId="u2" />);
    expect(await screen.findByText('Admin')).toBeTruthy();
    expect(screen.getByText('trên bảng xếp hạng').parentElement?.textContent).toBe('#2trên bảng xếp hạng');
    expect(screen.getByText('Thủ khoa tuần')).toBeTruthy();
    cleanup();
    getProfile.mockResolvedValue({ ok: true, data: profile({ rank: { position: 4, xp: 90, week: 3 } }) });
    render(<PublicProfile userId="u2" />);
    expect(await screen.findByText('Học sinh')).toBeTruthy();
    expect(screen.queryByText('Thủ khoa tuần')).toBeNull();
  });

  it('links a friend to their direct chat and hides the school when it is null', async () => {
    getProfile.mockResolvedValue({ ok: true, data: profile({ relation: 'friend', friendship_id: 'f9', school: null }) });
    render(<PublicProfile userId="u2" />);
    const link = await screen.findByRole('link', { name: 'Nhắn tin' });
    expect(link.getAttribute('href')).toBe('/community?tab=friends&dm=f9');
    expect(screen.queryByText('THPT B')).toBeNull();
  });

  it('shows the error when the profile cannot be loaded, and no action for a blocked person', async () => {
    getProfile.mockResolvedValue({ ok: false, status: 404, error: { en: 'Not found.', vi: 'Không tìm thấy.' } });
    render(<PublicProfile userId="u2" />);
    expect(await screen.findByText('Không tìm thấy.')).toBeTruthy();
    cleanup();
    getProfile.mockResolvedValue({ ok: true, data: profile({ relation: 'blocked' }) });
    render(<PublicProfile userId="u2" />);
    await screen.findByRole('heading', { name: 'Bình' });
    expect(screen.queryByRole('button')).toBeNull();
  });
});
