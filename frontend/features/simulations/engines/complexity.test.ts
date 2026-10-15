import { describe, expect, it } from 'vitest';
import { COMPLEXITY_MAX_N, COMPLEXITY_PATTERNS } from '@scipal/types';
import { clampN, count, operations, permutationAt } from './complexity';

describe('complexity patterns', () => {
  it.each(COMPLEXITY_PATTERNS)('%s: the closed form equals the operations drawn, for every allowed n', (pattern) => {
    for (let n = 1; n <= COMPLEXITY_MAX_N[pattern]; n += 1) {
      expect(operations(pattern, n).length, `n = ${n}`).toBe(count(pattern, n));
    }
  });

  it('matches the landmark counts', () => {
    expect(count('direct', 20)).toBe(1);
    expect(count('halving', 1)).toBe(1);
    expect(count('halving', 8)).toBe(4);
    expect(count('halving', 9)).toBe(5);
    expect(count('single-loop', 7)).toBe(7);
    expect(count('divide-conquer', 1)).toBe(0);
    expect(count('divide-conquer', 8)).toBe(24);
    expect(count('nested-loop', 5)).toBe(25);
    expect(count('branching', 4)).toBe(31);
    expect(count('permutations', 5)).toBe(120);
    expect(count('permutations', 8)).toBe(40320);
  });

  it('clamps n to what each pattern can draw', () => {
    expect(clampN('permutations', 30)).toBe(8);
    expect(clampN('branching', 13)).toBe(12);
    expect(clampN('single-loop', 0)).toBe(1);
    expect(clampN('nested-loop', 4.6)).toBe(5);
  });

  it('halving shrinks the range by half each step, ending at one', () => {
    expect(operations('halving', 9)).toEqual([8, 4, 2, 1, 0]);
  });

  it('lists permutations in order, all distinct', () => {
    expect(permutationAt(3, 0)).toEqual([1, 2, 3]);
    expect(permutationAt(3, 5)).toEqual([3, 2, 1]);
    const seen = new Set(Array.from({ length: 24 }, (_, k) => permutationAt(4, k).join('')));
    expect(seen.size).toBe(24);
  });
});
