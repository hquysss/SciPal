import type { BillingInterval } from '@scipal/types';

type Bilingual = { en: string; vi: string };

export const INTERVALS: readonly BillingInterval[] = ['month', 'quarter', 'half_year', 'year'];
export const INTERVAL_MONTHS: Record<BillingInterval, number> = { month: 1, quarter: 3, half_year: 6, year: 12 };

/** Segment-control label. */
export const INTERVAL_LABEL: Record<BillingInterval, Bilingual> = {
  month: { en: 'Monthly', vi: 'Theo tháng' },
  quarter: { en: '3 months', vi: '3 tháng' },
  half_year: { en: '6 months', vi: '6 tháng' },
  year: { en: 'Yearly', vi: 'Theo năm' },
};

/** "/ 3 tháng", "each 3 months": the period as a noun. */
export const INTERVAL_NOUN: Record<BillingInterval, Bilingual> = {
  month: { en: 'month', vi: 'tháng' },
  quarter: { en: '3 months', vi: '3 tháng' },
  half_year: { en: '6 months', vi: '6 tháng' },
  year: { en: 'year', vi: 'năm' },
};

/** "Paid up front for 3 months": what a single payment buys. */
export const INTERVAL_SPAN: Record<BillingInterval, Bilingual> = {
  month: { en: '1 month', vi: '1 tháng' },
  quarter: { en: '3 months', vi: '3 tháng' },
  half_year: { en: '6 months', vi: '6 tháng' },
  year: { en: '1 year', vi: '1 năm' },
};

/** Only monthly and yearly plans can renew automatically; 3 and 6 months are paid once. */
export const canAutoRenew = (interval: BillingInterval) => interval === 'month' || interval === 'year';

export const approxDays = (interval: BillingInterval) => (interval === 'year' ? 365 : INTERVAL_MONTHS[interval] * 30);

/** Percent saved against paying month by month; 0 when there is no saving. */
export function savePercent(prices: ReadonlyArray<{ interval: BillingInterval; amountVnd: number }>, interval: BillingInterval): number {
  const monthly = prices.find((p) => p.interval === 'month');
  const price = prices.find((p) => p.interval === interval);
  if (!monthly || !price || interval === 'month') return 0;
  return Math.max(0, Math.round((1 - price.amountVnd / (monthly.amountVnd * INTERVAL_MONTHS[interval])) * 100));
}
