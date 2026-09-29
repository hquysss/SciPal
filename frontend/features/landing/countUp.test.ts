import { describe, expect, it } from 'vitest';
import { countUpValue } from './countUp';

describe('countUpValue', () => {
  it('eases from zero to the price and lands on it exactly, in whole thousands', () => {
    expect(countUpValue(39000, 0)).toBe(0);
    expect(countUpValue(39000, 1)).toBe(39000);
    expect(countUpValue(39000, 2)).toBe(39000);
    const mid = countUpValue(39000, 0.5);
    expect(mid).toBeGreaterThan(19500); // ease-out: past halfway at half time
    expect(mid % 1000).toBe(0);
    expect(countUpValue(990000, 0.3) % 1000).toBe(0);
  });

  it('keeps small amounts whole', () => {
    expect(countUpValue(500, 0.5) % 1).toBe(0);
    expect(countUpValue(0, 0.5)).toBe(0);
  });
});
