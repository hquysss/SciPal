'use client';

import type { ComplexityPattern } from '@scipal/types';
import { formatCount } from './complexityChart';
import { count } from './engines/complexity';
import { pick, type Lang } from './types';
import styles from './complexity.module.css';

type Bilingual = { en: string; vi: string };

/** A fast home computer, roughly: a billion simple operations a second. */
export const OPS_PER_SECOND = 1e9;
/** Data sizes the card looks ahead to, past what the field can draw. */
export const TIME_N = [10, 20, 50, 100] as const;

const YEAR = 365.25 * 86_400;
const UNITS: ReadonlyArray<{ seconds: number; vi: string; en: [string, string] }> = [
  { seconds: 1e-9, vi: 'nano giây', en: ['nanosecond', 'nanoseconds'] },
  { seconds: 1e-6, vi: 'micro giây', en: ['microsecond', 'microseconds'] },
  { seconds: 1e-3, vi: 'mili giây', en: ['millisecond', 'milliseconds'] },
  { seconds: 1, vi: 'giây', en: ['second', 'seconds'] },
  { seconds: 60, vi: 'phút', en: ['minute', 'minutes'] },
  { seconds: 3_600, vi: 'giờ', en: ['hour', 'hours'] },
  { seconds: 86_400, vi: 'ngày', en: ['day', 'days'] },
  { seconds: YEAR, vi: 'năm', en: ['year', 'years'] },
];

/** "10 micro giây", "26,1 ngày", "77 năm", "3 × 10¹⁴¹ năm": the largest unit that is at least 1. */
export function humanDuration(seconds: number, lang: Lang): string {
  const unit = UNITS.findLast((u) => seconds >= u.seconds) ?? UNITS[0]!;
  const value = seconds / unit.seconds;
  // Years are whole (a tenth of a year says nothing); a thousand years and more go compact.
  const amount =
    unit.seconds === YEAR
      ? value >= 1000
        ? formatCount(value, lang)
        : Math.round(value).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')
      : value.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 });
  return `${amount} ${lang === 'vi' ? unit.vi : unit.en[amount === '1' ? 0 : 1]}`;
}

export type TimeAnchor = 'blink' | 'lifetime' | 'earth' | 'universe';

/** Something a student can picture next to a duration, or null when nothing fits. */
export function timeAnchor(seconds: number): TimeAnchor | null {
  const years = seconds / YEAR;
  if (years >= 1.38e10) return 'universe';
  if (years >= 4.54e9) return 'earth';
  if (years >= 70) return 'lifetime';
  return seconds <= 0.1 ? 'blink' : null;
}

const ANCHOR_TEXT: Record<TimeAnchor, Bilingual> = {
  blink: { en: 'quicker than a blink', vi: 'nhanh hơn một cái chớp mắt' },
  lifetime: { en: 'a whole lifetime', vi: 'cả một đời người' },
  earth: { en: 'longer than the Earth has existed', vi: 'lâu hơn tuổi Trái Đất' },
  universe: { en: 'longer than the age of the universe', vi: 'lâu hơn tuổi vũ trụ' },
};

const TITLE: Bilingual = { en: 'A computer doing a billion operations a second needs', vi: 'Máy tính làm 1 tỉ phép toán mỗi giây sẽ mất' };

/** The data explosion in time: the chosen pattern's operations at n = 10…100, as a computer would spend them. */
export function TimeCard({ pattern, lang }: { pattern: ComplexityPattern; lang: Lang }) {
  const t = pick(lang);
  return (
    <section aria-label={t(TITLE)} className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink">{t(TITLE)}</p>
      <ul key={pattern} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TIME_N.map((m, i) => {
          const seconds = count(pattern, m) / OPS_PER_SECOND;
          const anchor = timeAnchor(seconds);
          return (
            <li
              key={m}
              className={`flex flex-col gap-0.5 rounded-lg border p-3 ${styles.flip} ${
                anchor === 'universe' ? 'border-[var(--accent,var(--action))] bg-[color-mix(in_oklch,var(--accent,var(--action))_10%,transparent)]' : 'border-line'
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="text-xs font-semibold tabular-nums text-ink-muted">n = {m}</span>
              <span className="text-lg font-bold tabular-nums text-ink">{humanDuration(seconds, lang)}</span>
              {anchor && <span className="text-xs text-ink-muted">{t(ANCHOR_TEXT[anchor])}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
