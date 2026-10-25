// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { streakAtRisk, type Habit } from './habitApi';
import { DailyGoalRing } from './DailyGoalRing';
import { StreakRiskBanner } from './StreakRiskBanner';
import { StreakCalendar, xpStep } from '../progress/StreakCalendar';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (text: { vi: string }) => text.vi }) }));
vi.mock('../../lib/session', () => ({ getAccessToken: async () => undefined }));

const habit = (over: Partial<Habit> = {}): Habit => ({
  today: '2026-10-25', streak: 4, longest: 9, today_xp: 0, goal_xp: 20, freezes: 1,
  days: [{ day: '2026-10-23', xp: 30, freeze: false }, { day: '2026-10-24', xp: 0, freeze: true }],
  ...over,
});

afterEach(cleanup);
beforeEach(() => window.localStorage.clear());

describe('streakAtRisk', () => {
  it('is on when today has no study and the streak is 2+', () => {
    expect(streakAtRisk(habit())).toBe(true);
    expect(streakAtRisk(habit({ today_xp: 5, days: [{ day: '2026-10-25', xp: 5, freeze: false }] }))).toBe(false);
    expect(streakAtRisk(habit({ streak: 1 }))).toBe(false);
    expect(streakAtRisk(null)).toBe(false);
  });
});

describe('StreakRiskBanner', () => {
  it('names the streak and the freezes left', () => {
    render(<StreakRiskBanner habit={habit()} />);
    expect(screen.getByRole('status').textContent).toBe('Học hôm nay để giữ chuỗi 4 ngày. Bạn còn 1 lần đóng băng chuỗi.');
  });
});

describe('DailyGoalRing', () => {
  it('shows progress toward the goal', () => {
    render(<DailyGoalRing day="2026-10-25" xp={12} goal={20} />);
    expect(screen.getByText('Hôm nay 12/20 XP')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('12');
  });

  it('marks the goal reached once a day', () => {
    render(<DailyGoalRing day="2026-10-25" xp={25} goal={20} />);
    expect(screen.getByText('Đạt mục tiêu hôm nay · 25 XP')).toBeTruthy();
    expect(window.localStorage.getItem('scipal:goal-done:2026-10-25')).toBe('1');
  });
});

describe('StreakCalendar with the habit', () => {
  it('colours days by XP and marks a freeze in words', () => {
    render(<StreakCalendar streaks={[]} habit={habit()} />);
    expect(screen.getByRole('img', { name: '2026-10-23: 30 XP' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '2026-10-24: đã dùng đóng băng chuỗi' }).textContent).toBe('❄');
    expect(screen.getByText(/Kỷ lục 9 ngày · 1 lần đóng băng/)).toBeTruthy();
  });

  it('steps XP like the subject count', () => {
    expect([0, 5, 20, 49, 50].map(xpStep)).toEqual([0, 1, 2, 2, 4]);
  });
});
