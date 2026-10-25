// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChallengeCardView } from './ChallengeCard';
import { daysLeft, type Challenge } from './challengesApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

afterEach(cleanup);

const c = (over: Partial<Challenge>): Challenge => ({
  id: 'c1', status: 'active', incoming: false, starts_on: '2026-11-03', ends_on: '2026-11-09', winner: null,
  my_xp: 0, their_xp: 0, other: { user_id: 'u2', display_name: 'Bình', avatar_url: null }, ...over,
});

describe('daysLeft', () => {
  it('counts today, and is null before the start or when not running', () => {
    expect(daysLeft(c({}), '2026-11-03')).toBe(7);
    expect(daysLeft(c({}), '2026-11-09')).toBe(1);
    expect(daysLeft(c({}), '2026-11-02')).toBeNull();
    expect(daysLeft(c({ status: 'done' }), '2026-11-05')).toBeNull();
  });
});

describe('ChallengeCardView', () => {
  it('lets the challenged friend accept or decline', () => {
    const onAnswer = vi.fn();
    render(<ChallengeCardView list={{ today: '2026-11-01', challenges: [c({ status: 'pending', incoming: true, starts_on: null, ends_on: null })] }} onAnswer={onAnswer} />);
    expect(screen.getByText('Bình thách đấu bạn: ai nhiều XP hơn trong 7 ngày?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận' }));
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    expect(onAnswer.mock.calls).toEqual([['c1', 'accept'], ['c1', 'decline']]);
  });

  it('shows the challenger it is waiting, with no buttons', () => {
    render(<ChallengeCardView list={{ today: '2026-11-01', challenges: [c({ status: 'pending', starts_on: null, ends_on: null })] }} onAnswer={vi.fn()} />);
    expect(screen.getByText('Đang chờ Bình trả lời.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows both XP totals and the days left while running', () => {
    render(<ChallengeCardView list={{ today: '2026-11-05', challenges: [c({ my_xp: 120, their_xp: 80 })] }} onAnswer={vi.fn()} />);
    expect(screen.getByText('Còn 5 ngày')).toBeTruthy();
    expect(screen.getByText('120 XP')).toBeTruthy();
    expect(screen.getByText('80 XP')).toBeTruthy();
  });

  it('names the winner or a tie when done, and invites a challenge when empty', () => {
    const { rerender } = render(<ChallengeCardView list={{ today: '2026-11-12', challenges: [c({ status: 'done', winner: 'me' })] }} onAnswer={vi.fn()} />);
    expect(screen.getByText('Bạn thắng!')).toBeTruthy();
    rerender(<ChallengeCardView list={{ today: '2026-11-12', challenges: [c({ status: 'done', winner: null })] }} onAnswer={vi.fn()} />);
    expect(screen.getByText('Hoà!')).toBeTruthy();
    rerender(<ChallengeCardView list={{ today: '2026-11-12', challenges: [] }} onAnswer={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Thách đấu một bạn' })).toBeTruthy();
  });
});
