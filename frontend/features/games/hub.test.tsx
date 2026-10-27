// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Habit } from '@/features/habit/habitApi';
import { GamesListView } from './GamesList';
import { HubShortcutsView } from './HubShortcuts';
import { PlayerHeroView } from './PlayerHero';
import type { GameCard } from './gamesApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@/lib/sfx', () => ({ playSfx: () => {} }));

afterEach(cleanup);

const habit = (over: Partial<Habit> = {}): Habit => ({ today: '2026-11-02', streak: 4, longest: 6, today_xp: 10, goal_xp: 20, freezes: 1, days: [], ...over });
const game = (id: string, kind: GameCard['kind'], title = id): GameCard => ({ id, kind, title: { vi: title, en: title }, classId: null, timeLimitS: null, createdAt: '2026-11-01' });

describe('PlayerHeroView', () => {
  it('shows level, XP to the next level, streak, goal and freezes', () => {
    // 772 XP: level 4 (600), level 5 at 1000.
    render(<PlayerHeroView xp={772} habit={habit()} />);
    expect(screen.getByText('Cấp')).toBeTruthy();
    expect(screen.getByText('Còn 228 XP nữa lên cấp 5')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Tiến tới cấp 5' }).getAttribute('aria-valuenow')).toBe('43');
    expect(screen.getByText('ngày liên tiếp')).toBeTruthy();
    expect(screen.getByText('Hôm nay 10/20 XP')).toBeTruthy();
    expect(screen.getByText('1 đóng băng')).toBeTruthy();
  });

  it('hides what it does not have, and everything for a guest', () => {
    const { container, rerender } = render(<PlayerHeroView xp={50} habit={habit({ freezes: 0 })} />);
    expect(screen.queryByText(/đóng băng/)).toBeNull();
    rerender(<PlayerHeroView xp={null} habit={habit()} />);
    expect(screen.queryByText('Cấp')).toBeNull();
    rerender(<PlayerHeroView xp={null} habit={null} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('HubShortcutsView', () => {
  it('links to the three blocks on the progress page, with counts when known', () => {
    render(<HubShortcutsView counts={{ challenges: 2, badges: { earned: 3, total: 20 } }} />);
    expect(screen.getByRole('link', { name: /Thử thách tuần/ }).getAttribute('href')).toBe('/progress#challenges');
    expect(screen.getByRole('link', { name: /Bảng xếp hạng/ }).getAttribute('href')).toBe('/progress#leaderboard');
    expect(screen.getByRole('link', { name: /Huy hiệu/ }).getAttribute('href')).toBe('/progress#badges');
    expect(screen.getByText('2 đang diễn ra')).toBeTruthy();
    expect(screen.getByText('Đã mở 3/20')).toBeTruthy();
  });

  it('falls back to words when the counts are missing', () => {
    render(<HubShortcutsView counts={{ challenges: null, badges: null }} />);
    expect(screen.getByText('Thách đấu một bạn')).toBeTruthy();
    expect(screen.getByText('Bộ sưu tập của em')).toBeTruthy();
  });
});

describe('GamesListView', () => {
  const lists = {
    classGames: [{ ...game('c1', 'crossword', 'Ô chữ lớp'), className: '10A1' }],
    publicGames: [game('p1', 'quiz', 'Đố vui A'), game('p2', 'crossword', 'Ô chữ B')],
  };

  it('offers only the kinds present, and filters both sections', () => {
    render(<GamesListView lists={lists} isAdmin={false} onCreate={() => {}} />);
    const group = screen.getByRole('group', { name: 'Loại game' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tất cả', 'Đố vui', 'Ô chữ']);
    fireEvent.click(within(group).getByRole('button', { name: 'Đố vui' }));
    expect(screen.queryByText('Ô chữ lớp')).toBeNull();
    expect(screen.queryByText('Ô chữ B')).toBeNull();
    expect(screen.getByText('Đố vui A')).toBeTruthy();
    fireEvent.click(within(group).getByRole('button', { name: 'Tất cả' }));
    expect(screen.getByText('Ô chữ lớp')).toBeTruthy();
  });

  it('links each card to its game and shows the class', () => {
    render(<GamesListView lists={lists} isAdmin={false} onCreate={() => {}} />);
    expect(screen.getByRole('link', { name: /Ô chữ lớp/ }).getAttribute('href')).toBe('/games/c1');
    expect(screen.getByText('10A1')).toBeTruthy();
  });

  it('lets an admin delete a public game, and nobody else', () => {
    const onDelete = vi.fn();
    const { rerender } = render(<GamesListView lists={lists} isAdmin={false} onCreate={() => {}} onDelete={onDelete} />);
    expect(screen.queryByRole('button', { name: /^Xóa/ })).toBeNull();
    rerender(<GamesListView lists={lists} isAdmin onCreate={() => {}} onDelete={onDelete} />);
    expect(screen.getAllByRole('button', { name: /^Xóa/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Xóa Đố vui A' }));
    expect(onDelete).toHaveBeenCalledWith(lists.publicGames[0]);
  });

  it('has no filter for one kind, and an empty state that lets an admin create', () => {
    const onCreate = vi.fn();
    const { rerender } = render(<GamesListView lists={{ classGames: [], publicGames: [game('p1', 'quiz')] }} isAdmin={false} onCreate={onCreate} />);
    expect(screen.queryByRole('group', { name: 'Loại game' })).toBeNull();
    rerender(<GamesListView lists={{ classGames: [], publicGames: [] }} isAdmin onCreate={onCreate} />);
    expect(screen.getByText('Chưa có game nào ở đây')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo game' }));
    expect(onCreate).toHaveBeenCalled();
  });
});
