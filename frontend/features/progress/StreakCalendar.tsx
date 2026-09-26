'use client';

import type { CSSProperties } from 'react';
import { Flame } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { ProgressSummary } from './progressQueries';

type StreakRow = ProgressSummary['streaks'][number];

const DAY_LABELS = [
  { en: 'Sun', vi: 'CN' },
  { en: 'Mon', vi: 'T2' },
  { en: 'Tue', vi: 'T3' },
  { en: 'Wed', vi: 'T4' },
  { en: 'Thu', vi: 'T5' },
  { en: 'Fri', vi: 'T6' },
  { en: 'Sat', vi: 'T7' },
];

/** Heatmap cell colour: four levels of the level's action colour. */
export function streakCellClass(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return 'bg-surface-sunken';
  if (count === 1) return 'bg-[color-mix(in_srgb,var(--action)_30%,var(--surface))]';
  if (count <= 3) return 'bg-[color-mix(in_srgb,var(--action)_60%,var(--surface))]';
  return 'bg-action';
}

const DAY_MS = 86_400_000;

/** Subjects whose current streak covers `dateStr` (the streak ends on `last_active`). */
export function activeSubjectsOn(streaks: StreakRow[], dateStr: string): number {
  const day = Date.parse(dateStr);
  return streaks.filter((s) => {
    if (!s.last_active || s.current_streak <= 0) return false;
    const end = Date.parse(s.last_active.slice(0, 10));
    const start = end - (s.current_streak - 1) * DAY_MS;
    return day >= start && day <= end;
  }).length;
}

export function StreakCalendar({ streaks }: { streaks: StreakRow[] }) {
  const { lang, t } = useLanguage();
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    return {
      dateStr,
      dayLabel: t(DAY_LABELS[d.getDay()]),
      isToday: i === 6,
      count: activeSubjectsOn(streaks, dateStr),
    };
  });

  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">{t({ en: 'Learning streak', vi: 'Chuỗi ngày học liên tục' })}</h2>
          <p className="text-sm text-ink-muted">{t({ en: 'Last 7 days', vi: '7 ngày gần nhất' })}</p>
        </div>
        <Flame aria-hidden="true" className="h-6 w-6 text-warning" />
      </div>

      {/* 7-day heat track */}
      <ol className="grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((d) => {
          const label = t({
            en: `${d.dateStr}: ${d.count} ${d.count === 1 ? 'subject' : 'subjects'} active`,
            vi: `${d.dateStr}: ${d.count} môn có hoạt động`,
          });
          return (
            <li key={d.dateStr} className="flex flex-col items-center gap-1.5">
              <span className="text-sm text-ink-muted">{d.dayLabel}</span>
              <div
                role="img"
                title={label}
                aria-label={label}
                className={`flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold ${streakCellClass(d.count)} ${
                  d.count >= 4 ? 'text-action-ink' : 'text-ink'
                } ${d.isToday ? 'outline outline-2 outline-offset-2 outline-focus' : ''}`}
              >
                {d.count > 0 ? d.count : ''}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-sm text-ink-muted" aria-hidden="true">
        <span>{t({ en: 'Less', vi: 'Ít' })}</span>
        {[0, 1, 2, 4].map((n) => (
          <span key={n} className={`h-3 w-3 rounded-sm border border-line ${streakCellClass(n)}`} />
        ))}
        <span>{t({ en: 'More', vi: 'Nhiều' })}</span>
      </div>

      {/* Subject streak chips */}
      {streaks.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2.5 border-t border-line pt-4">
          {streaks.map((s) => (
            <li
              key={s.subject_id}
              data-subject-scope=""
              style={{ '--accent': s.subjects?.accent_color ?? 'var(--action)' } as CSSProperties}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-sunken px-3.5 py-1.5 text-sm"
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
              <span className="font-semibold text-ink">
                {(lang === 'en' ? s.subjects?.name_en : s.subjects?.name_vi) ?? t({ en: 'Subject', vi: 'Môn học' })}:
              </span>
              <span className="font-bold tabular-nums text-ink">
                {t({ en: `${s.current_streak} ${s.current_streak === 1 ? 'day' : 'days'}`, vi: `${s.current_streak} ngày` })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
