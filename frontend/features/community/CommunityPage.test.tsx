// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommunityPage, conversationFromParams, conversationHref } from './CommunityPage';

const nav = vi.hoisted(() => ({ query: '', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.query),
  useRouter: () => ({ replace: nav.replace }),
}));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('./ChatPane', () => ({ ChatPane: ({ title }: { title: string }) => <div>chat:{title}</div> }));
vi.mock('../friends/FriendsTab', () => ({ FriendsTab: () => <div>friends-manager</div> }));
const api = vi.hoisted(() => ({ grades: [] as number[], setChatGrade: vi.fn() }));
vi.mock('./chatApi', () => ({
  getChatRooms: async () => ({ ok: true, data: { grade: null, grades: api.grades } }),
  listChatClasses: async () => ({ ok: true, data: { classes: [{ id: 'c1', name: 'Lớp 10A' }] } }),
  setChatGrade: api.setChatGrade,
}));
vi.mock('../friends/friendsApi', () => ({
  FRIENDS_CHANGED_EVENT: 'x',
  listFriends: async () => ({ ok: true, data: { friends: [{ id: 'f1', user_id: 'u1', display_name: 'An', avatar_url: null }], incoming: [], outgoing: [] } }),
}));

afterEach(() => { cleanup(); nav.query = ''; nav.replace.mockClear(); api.grades = []; api.setChatGrade.mockReset(); });

describe('conversation URLs', () => {
  it('round-trips every kind and keeps the old links working', () => {
    for (const c of [{ kind: 'room', grade: null }, { kind: 'room', grade: 11 }, { kind: 'class', id: 'c1' }, { kind: 'dm', id: 'f9' }, { kind: 'friends' }] as const) {
      expect(conversationFromParams(new URLSearchParams(conversationHref(c).split('?')[1]))).toEqual(c);
    }
    expect(conversationHref({ kind: 'dm', id: 'f9' })).toBe('/community?tab=friends&dm=f9');
    expect(conversationFromParams(new URLSearchParams('room=9'))).toBeNull();
    expect(conversationFromParams(new URLSearchParams(''))).toBeNull();
  });
});

describe('CommunityPage', () => {
  it('lists rooms, classes and friends, shows the shared room by default, and opens a row by URL', async () => {
    render(<CommunityPage />);
    expect(screen.getByText('chat:Tất cả')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: /Lớp 10A/ }));
    expect(nav.replace).toHaveBeenCalledWith('/community?tab=classes&class=c1');
    fireEvent.click(screen.getByRole('button', { name: /^An/ }));
    expect(nav.replace).toHaveBeenCalledWith('/community?tab=friends&dm=f1');
  });

  it('names an open direct chat after the friend, and shows the friends manager on tab=friends', async () => {
    nav.query = 'tab=friends&dm=f1';
    const { unmount } = render(<CommunityPage />);
    expect(await screen.findByText('chat:An')).toBeTruthy();
    unmount();
    nav.query = 'tab=friends';
    render(<CommunityPage />);
    expect(screen.getByText('friends-manager')).toBeTruthy();
  });

  it('filters the list by the search box', async () => {
    render(<CommunityPage />);
    await screen.findByRole('button', { name: /Lớp 10A/ });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'lớp' } });
    expect(screen.queryByRole('button', { name: /^An/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Lớp 10A/ })).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.getByText('Không có cuộc trò chuyện nào khớp.')).toBeTruthy();
  });

  it('asks for a grade until one is picked, then opens that room', async () => {
    api.setChatGrade.mockResolvedValue({ ok: true, data: { grade: 11 } });
    render(<CommunityPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Khối 11' }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/community?room=11'));
    expect(api.setChatGrade).toHaveBeenCalledWith(11);
  });
});
