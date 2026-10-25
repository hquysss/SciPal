const VN_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' });

/** The Vietnam calendar day (YYYY-MM-DD) of an instant: study days, streaks and the daily goal use it. */
export function vnDay(at: Date): string {
  return VN_DAY.format(at);
}

/** The day `n` days after `day` (YYYY-MM-DD, negative goes back). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
