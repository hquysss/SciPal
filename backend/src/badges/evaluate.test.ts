import { describe, expect, it } from 'vitest';
import { earnedBadgeIds, isEarned, type BadgeStats } from './evaluate.js';

const stats = (over: Partial<BadgeStats> = {}): BadgeStats => ({ bestStreak: 0, examCount: 0, bestExamScore: 0, friends: 0, ...over });

describe('isEarned', () => {
  it('meets a minimum at the boundary and not below it', () => {
    expect(isEarned({ type: 'streak', min: 7 }, stats({ bestStreak: 7 }))).toBe(true);
    expect(isEarned({ type: 'streak', min: 7 }, stats({ bestStreak: 6 }))).toBe(false);
    expect(isEarned({ type: 'exam_count', min: 5 }, stats({ examCount: 5 }))).toBe(true);
    expect(isEarned({ type: 'friends', min: 5 }, stats({ friends: 4 }))).toBe(false);
  });

  it('perfect score needs a 10', () => {
    expect(isEarned({ type: 'perfect_score' }, stats({ bestExamScore: 10 }))).toBe(true);
    expect(isEarned({ type: 'perfect_score' }, stats({ bestExamScore: 9.75 }))).toBe(false);
  });

  it('never earns a manual, unknown or malformed rule', () => {
    const big = stats({ bestStreak: 99, examCount: 99, bestExamScore: 10, friends: 99 });
    for (const c of [{ type: 'manual' }, { type: 'mystery' }, { type: 'streak' }, null, 'streak', 3]) expect(isEarned(c, big)).toBe(false);
  });
});

describe('earnedBadgeIds', () => {
  it('lists only the badges whose rule is met', () => {
    const badges = [
      { id: 'a', condition: { type: 'streak', min: 3 } },
      { id: 'b', condition: { type: 'streak', min: 30 } },
      { id: 'c', condition: { type: 'manual' } },
    ];
    expect(earnedBadgeIds(badges, stats({ bestStreak: 10 }))).toEqual(['a']);
  });
});
