import { describe, expect, it } from 'vitest';
import { paidThrough, quotaPeriod } from '../billing/periods.js';

describe('billing periods', () => {
  it('starts the monthly quota period at midnight Vietnam time', () => {
    expect(quotaPeriod(new Date('2026-09-30T16:59:59.999Z'))).toEqual({
      start: '2026-08-31T17:00:00.000Z',
      end: '2026-09-30T17:00:00.000Z',
    });
    expect(quotaPeriod(new Date('2026-09-30T17:00:00.000Z'))).toEqual({
      start: '2026-09-30T17:00:00.000Z',
      end: '2026-10-31T17:00:00.000Z',
    });
  });

  it('adds one month without overflowing the last day of the month', () => {
    expect(paidThrough(new Date('2026-01-31T17:00:00.000Z'), 'month'))
      .toBe('2026-02-28T17:00:00.000Z');
    expect(paidThrough(new Date('2024-01-31T17:00:00.000Z'), 'month'))
      .toBe('2024-02-29T17:00:00.000Z');
  });

  it('adds twelve months for annual billing, with the same end-of-month rule', () => {
    expect(paidThrough(new Date('2024-02-29T17:00:00.000Z'), 'year'))
      .toBe('2025-02-28T17:00:00.000Z');
  });

  it('rejects invalid dates', () => {
    expect(() => quotaPeriod(new Date(Number.NaN))).toThrow(RangeError);
  });
});

describe('paidThrough for 3-month and 6-month plans', () => {
  it('adds 3 and 6 calendar months, clamping the day', () => {
    expect(paidThrough(new Date('2026-10-31T00:00:00Z'), 'quarter')).toBe('2027-01-31T00:00:00.000Z');
    expect(paidThrough(new Date('2026-08-31T00:00:00Z'), 'half_year')).toBe('2027-02-28T00:00:00.000Z');
  });
});
