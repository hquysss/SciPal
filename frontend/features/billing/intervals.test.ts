import { describe, expect, it } from 'vitest';
import { approxDays, canAutoRenew, savePercent } from './intervals';

const prices = [
  { interval: 'month', amountVnd: 39000 },
  { interval: 'quarter', amountVnd: 105000 },
  { interval: 'half_year', amountVnd: 199000 },
  { interval: 'year', amountVnd: 390000 },
] as const;

describe('billing intervals', () => {
  it('computes savings against paying monthly', () => {
    expect(savePercent(prices, 'month')).toBe(0);
    expect(savePercent(prices, 'quarter')).toBe(10);
    expect(savePercent(prices, 'half_year')).toBe(15);
    expect(savePercent(prices, 'year')).toBe(17);
  });
  it('allows auto-renew only for month and year', () => {
    expect(['month', 'quarter', 'half_year', 'year'].map((i) => canAutoRenew(i as never))).toEqual([true, false, false, true]);
    expect(approxDays('half_year')).toBe(180);
  });
});
