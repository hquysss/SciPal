// A counted quota runs per Vietnam day or per Vietnam month, as the plan (or an admin) sets it.
// Messages and "n left" counts name the period the ledger actually uses.

export type QuotaPeriod = 'day' | 'month';

export const periodOf = (kind: string | null | undefined): QuotaPeriod => (kind === 'daily' ? 'day' : 'month');

/** "hôm nay" / "today", or "tháng này" / "this month". */
export const periodWords = (period: QuotaPeriod) =>
  period === 'day' ? { vi: 'hôm nay', en: 'today' } : { vi: 'tháng này', en: 'this month' };
