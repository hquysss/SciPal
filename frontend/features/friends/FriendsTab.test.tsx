// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FriendsTabView, type FriendsState } from './FriendsTab';
import type { FriendEntry, SearchUser } from './friendsApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

afterEach(cleanup);

const person = (id: string, name: string | null): FriendEntry => ({ id, user_id: `u-${id}`, display_name: name, avatar_url: null });
const ready = (patch: Partial<Extract<FriendsState, { status: 'ready' }>> = {}): FriendsState => ({
  status: 'ready', friends: [], incoming: [], outgoing: [], results: null, ...patch,
});
const handlers = () => ({ onSearch: vi.fn(), onSend: vi.fn(), onAccept: vi.fn(), onRemove: vi.fn() });

describe('FriendsTabView', () => {
  it('invites you to search when there are no friends yet', () => {
    render(<FriendsTabView state={ready()} {...handlers()} />);
    expect(screen.getByText('Chưa có bạn bè')).toBeTruthy();
  });

  it('accepts or declines an incoming request by the row id', () => {
    const h = handlers();
    render(<FriendsTabView state={ready({ incoming: [person('r1', 'An')] })} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: /Chấp nhận/ }));
    fireEvent.click(screen.getByRole('button', { name: /Từ chối/ }));
    expect(h.onAccept).toHaveBeenCalledWith('r1');
    expect(h.onRemove).toHaveBeenCalledWith('r1');
  });

  it('removes a friend and cancels a request you sent', () => {
    const h = handlers();
    render(<FriendsTabView state={ready({ friends: [person('f1', 'Bình')], outgoing: [person('o1', 'Chi')] })} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: /Huỷ kết bạn/ }));
    fireEvent.click(screen.getByRole('button', { name: /Huỷ lời mời/ }));
    expect(h.onRemove).toHaveBeenCalledWith('f1');
    expect(h.onRemove).toHaveBeenCalledWith('o1');
  });

  it('offers Kết bạn only to people you have no link with', () => {
    const h = handlers();
    const user = (id: string, relation: SearchUser['relation']): SearchUser => ({ user_id: id, display_name: `Tên ${id}`, avatar_url: null, relation, friendship_id: null });
    render(<FriendsTabView state={ready({ results: [user('a', 'none'), user('b', 'friend'), user('c', 'pending_out'), user('d', 'pending_in')] })} {...h} />);
    expect(screen.getAllByRole('button', { name: 'Kết bạn' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Kết bạn' }));
    expect(h.onSend).toHaveBeenCalledWith('a');
    expect(screen.getByText('Đã là bạn')).toBeTruthy();
    expect(screen.getByText('Đã gửi lời mời')).toBeTruthy();
    expect(screen.getByText('Chờ bạn trả lời')).toBeTruthy();
  });

  it('shows a fallback name for an account with no display name', () => {
    render(<FriendsTabView state={ready({ friends: [person('f1', null)] })} {...handlers()} />);
    expect(screen.getByText('Người dùng')).toBeTruthy();
  });

  it('ignores a search shorter than 2 characters and searches on submit otherwise', () => {
    const h = handlers();
    render(<FriendsTabView state={ready()} {...h} />);
    const box = screen.getByRole('searchbox');
    fireEvent.change(box, { target: { value: 'a' } });
    fireEvent.submit(box.closest('form')!);
    expect(h.onSearch).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: ' an ' } });
    fireEvent.submit(box.closest('form')!);
    expect(h.onSearch).toHaveBeenCalledWith('an');
  });
});
