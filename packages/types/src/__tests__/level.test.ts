import { describe, expect, it } from 'vitest';
import { levelOfXp, xpForLevel } from '../level.js';

describe('xpForLevel', () => {
  it('follows 50 × n × (n − 1)', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(xpForLevel(5)).toBe(1000);
  });
});

describe('levelOfXp', () => {
  it.each([
    [0, 1, 0, 100],
    [99, 1, 99, 1],
    [100, 2, 0, 200],
    [299, 2, 199, 1],
    [300, 3, 0, 300],
    [1000, 5, 0, 500],
  ])('xp %i → level %i', (xp, level, intoLevel, toNext) => {
    expect(levelOfXp(xp)).toEqual({ level, intoLevel, toNext });
  });

  it('handles very large totals', () => {
    const { level, intoLevel, toNext } = levelOfXp(10_000_000);
    expect(xpForLevel(level)).toBeLessThanOrEqual(10_000_000);
    expect(xpForLevel(level + 1)).toBeGreaterThan(10_000_000);
    expect(intoLevel + toNext).toBe(xpForLevel(level + 1) - xpForLevel(level));
  });

  it('treats invalid totals as zero', () => {
    for (const bad of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(levelOfXp(bad)).toEqual({ level: 1, intoLevel: 0, toNext: 100 });
    }
  });
});
