const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
type BillingInterval = 'month' | 'year';

function assertValidDate(date: Date): void {
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid date');
}

export function quotaPeriod(now: Date): { start: string; end: string } {
  assertValidDate(now);
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const year = vietnamNow.getUTCFullYear();
  const month = vietnamNow.getUTCMonth();
  const start = Date.UTC(year, month, 1) - VIETNAM_OFFSET_MS;
  const end = Date.UTC(year, month + 1, 1) - VIETNAM_OFFSET_MS;

  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

export function paidThrough(start: Date, interval: BillingInterval): string {
  assertValidDate(start);
  const months = interval === 'month' ? 1 : 12;
  const targetMonth = start.getUTCMonth() + months;
  const targetYear = start.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const result = new Date(start);
  result.setUTCDate(1);
  result.setUTCFullYear(targetYear, normalizedMonth, Math.min(start.getUTCDate(), lastDay));
  return result.toISOString();
}
