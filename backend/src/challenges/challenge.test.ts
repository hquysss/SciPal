import { describe, expect, it } from 'vitest';
import { challengeScore, challengeWindow, settle } from './challenge.js';

describe('challengeWindow', () => {
  it('starts the Vietnam day after acceptance and runs 7 days', () => {
    // 23:30 UTC on 1 Nov is 06:30 on 2 Nov in Vietnam.
    expect(challengeWindow(new Date('2026-11-01T23:30:00Z'))).toEqual({ starts_on: '2026-11-03', ends_on: '2026-11-09' });
    expect(challengeWindow(new Date('2026-12-28T03:00:00Z'))).toEqual({ starts_on: '2026-12-29', ends_on: '2027-01-04' });
  });
});

describe('challengeScore', () => {
  const window = { starts_on: '2026-11-03', ends_on: '2026-11-09' };
  it('adds the XP of the study days inside the window, not freezes', () => {
    const days = [
      { day: '2026-11-02', xp: 100, freeze: false },
      { day: '2026-11-03', xp: 20, freeze: false },
      { day: '2026-11-05', xp: 0, freeze: true },
      { day: '2026-11-09', xp: 15, freeze: false },
      { day: '2026-11-10', xp: 90, freeze: false },
    ];
    expect(challengeScore(days, window)).toBe(35);
    expect(challengeScore([], window)).toBe(0);
  });
});

describe('settle', () => {
  it('names the one with more XP, and nobody on a tie', () => {
    expect(settle({ id: 'a', xp: 40 }, { id: 'b', xp: 25 })).toBe('a');
    expect(settle({ id: 'a', xp: 10 }, { id: 'b', xp: 25 })).toBe('b');
    expect(settle({ id: 'a', xp: 25 }, { id: 'b', xp: 25 })).toBeNull();
  });
});
