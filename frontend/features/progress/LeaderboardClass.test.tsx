// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Leaderboard } from './Leaderboard';
import type { LeaderRow } from './progressQueries';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

afterEach(cleanup);

const row = (rank: number, name: string, me = false): LeaderRow => ({ rank, display_name: name, xp: 100 - rank, is_me: me });
const classes = [{ id: 'c1', name: '10A1' }, { id: 'c2', name: '10A2' }];

describe('Leaderboard class tab', () => {
  it('loads the chosen class once and shows its students', async () => {
    const loadClass = vi.fn(async (id: string) => ({ week: [row(1, id === 'c1' ? 'An' : 'Bình', true)], all: [] }));
    render(<Leaderboard board={null} classes={classes} loadClass={loadClass} />);
    expect(await screen.findByText('An')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c2' } });
    expect(await screen.findByText('Bình')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c1' } });
    expect(await screen.findByText('An')).toBeTruthy();
    expect(loadClass.mock.calls).toEqual([['c1'], ['c2']]);
  });

  it('says so when the class board cannot be loaded', async () => {
    render(<Leaderboard board={null} classes={classes.slice(0, 1)} loadClass={async () => null} />);
    expect(await screen.findByText(/Chưa tải được bảng xếp hạng/)).toBeTruthy();
  });

  it('moves between tabs with the arrow keys', () => {
    render(<Leaderboard board={{ week: [], all: [] }} />);
    const everyone = screen.getByRole('tab', { name: 'Toàn hệ thống' });
    expect(everyone.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(everyone, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Bạn bè' }).getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Bạn bè' }));
  });
});
