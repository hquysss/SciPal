import { describe, expect, it } from 'vitest';
import { currentStreak, freezePlan, freezesEarned, longestStreak } from './habit.js';
import { addDays, vnDay } from './vnDay.js';

const days = (...list: string[]) => list.map((day) => ({ day }));

describe('vnDay', () => {
  it('counts 6:30 and 23:00 Vietnam time as one day', () => {
    expect(vnDay(new Date('2026-10-24T23:30:00Z'))).toBe('2026-10-25'); // 06:30 +07
    expect(vnDay(new Date('2026-10-25T16:00:00Z'))).toBe('2026-10-25'); // 23:00 +07
  });

  it('turns the day at midnight Vietnam time', () => {
    expect(vnDay(new Date('2026-10-25T16:59:00Z'))).toBe('2026-10-25'); // 23:59 +07
    expect(vnDay(new Date('2026-10-25T17:01:00Z'))).toBe('2026-10-26'); // 00:01 +07
  });

  it('adds days across months', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('currentStreak', () => {
  it('counts back from today or yesterday', () => {
    expect(currentStreak(days('2026-10-23', '2026-10-24', '2026-10-25'), '2026-10-25')).toBe(3);
    expect(currentStreak(days('2026-10-23', '2026-10-24'), '2026-10-25')).toBe(2);
    expect(currentStreak(days('2026-10-22'), '2026-10-25')).toBe(0);
  });
});

describe('longestStreak', () => {
  it('finds the longest run', () => {
    expect(longestStreak(days('2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'))).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe('freezePlan', () => {
  it('fills one missed day with one freeze', () => {
    expect(freezePlan('2026-10-23', '2026-10-25', 1)).toEqual(['2026-10-24']);
  });

  it('spends nothing when the gap is longer than the freezes', () => {
    expect(freezePlan('2026-10-22', '2026-10-25', 1)).toEqual([]);
  });

  it('needs nothing after yesterday, today or no history', () => {
    expect(freezePlan('2026-10-24', '2026-10-25', 2)).toEqual([]);
    expect(freezePlan('2026-10-25', '2026-10-25', 2)).toEqual([]);
    expect(freezePlan(null, '2026-10-25', 2)).toEqual([]);
  });
});

describe('freezesEarned', () => {
  it('gives one per multiple of 7 crossed', () => {
    expect(freezesEarned(6, 7)).toBe(1);
    expect(freezesEarned(7, 7)).toBe(0);
    expect(freezesEarned(13, 14)).toBe(1);
    expect(freezesEarned(0, 1)).toBe(0);
  });
});
