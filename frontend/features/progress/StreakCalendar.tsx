'use client';

import type { CSSProperties } from 'react';
import { Flame } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { ProgressSummary } from './progressQueries';
import type { Habit } from '../habit/habitApi';

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

/** Heatmap cell colour: four warm steps from pale sun to coral; the count on top stays --ink. */
export function streakCellClass(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return 'bg-surface-sunken';
  if (count === 1) return 'bg-[color-mix(in_srgb,var(--sun)_45%,var(--surface))]';
  if (count <= 3) return 'bg-sun';
  return 'bg-coral';
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

/** Heat step of a study day's XP, on the same four colours as the subject count. */
export function xpStep(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  return xp < 20 ? 1 : xp < 50 ? 2 : 4;
}

type Cell = { dateStr: string; dayLabel: string; isToday: boolean; step: number; label: string; text: string; freeze: boolean };

/**
 * The last 7 days. With the habit (server study days, Vietnam dates) a cell shows that day's XP and a
 * freeze; without it (the habit API is not there) it falls back to the subjects whose streak covers the day.
 */
export function StreakCalendar({ streaks, habit }: { streaks: StreakRow[]; habit?: Habit | null }) {
  const { lang, t } = useLanguage();
  const end = habit ? new Date(`${habit.today}T00:00:00Z`) : new Date();
  const days: Cell[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const base = { dateStr, dayLabel: t(DAY_LABELS[d.getUTCDay()]), isToday: i === 6 };
    if (habit) {
      const day = habit.days.find((x) => x.day === dateStr);
      const xp = day?.xp ?? 0;
      if (day?.freeze) return { ...base, step: 0, freeze: true, text: '❄', label: t({ en: `${dateStr}: streak freeze used`, vi: `${dateStr}: đã dùng đóng băng chuỗi` }) };
      return { ...base, step: xpStep(xp), freeze: false, text: xp > 0 ? String(xp) : '', label: t({ en: `${dateStr}: ${xp} XP`, vi: `${dateStr}: ${xp} XP` }) };
    }
    const count = activeSubjectsOn(streaks, dateStr);
    return {
      ...base,
      step: count,
      freeze: false,
      text: count > 0 ? String(count) : '',
      label: t({ en: `${dateStr}: ${count} ${count === 1 ? 'subject' : 'subjects'} active`, vi: `${dateStr}: ${count} môn có hoạt động` }),
    };
  });

  const best = habit ? habit.streak : streaks.reduce((max, s) => Math.max(max, s.current_streak), 0);

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sun to-coral text-ink"><Flame className="h-5 w-5" /></span>
          <div>
            <h2 className="text-lg font-bold text-ink">{t({ en: 'Learning streak', vi: 'Chuỗi ngày học liên tục' })}</h2>
            <p className="text-sm text-ink-muted">{t({ en: 'Last 7 days', vi: '7 ngày gần nhất' })}</p>
          </div>
        </div>
        <p className="text-right leading-none">
          <span className="block text-3xl font-extrabold tabular-nums text-ink">{best}</span>
          <span className="text-sm text-ink-muted">{t({ en: best === 1 ? 'day in a row' : 'days in a row', vi: 'ngày liên tiếp' })}</span>
        </p>
      </div>

      {/* 7-day heat track */}
      <ol className="grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((d) => (
          <li key={d.dateStr} className="flex flex-col items-center gap-1.5">
            <span className="text-sm text-ink-muted">{d.dayLabel}</span>
            <div
              role="img"
              title={d.label}
              aria-label={d.label}
              className={`flex h-14 w-full items-center justify-center rounded-xl text-sm font-bold tabular-nums text-ink transition-transform duration-300 ease-out hover:-translate-y-0.5 motion-reduce:transition-none ${d.freeze ? 'border-2 border-dashed border-sky bg-surface-sunken' : streakCellClass(d.step)} ${d.isToday ? 'outline outline-2 outline-offset-2 outline-focus' : ''}`}
            >
              {d.text}
            </div>
          </li>
        ))}
      </ol>
      {habit && (
        <p className="mt-3 text-sm text-ink-muted">
          {t({
            en: `Best ${habit.longest} days · ${habit.freezes} streak ${habit.freezes === 1 ? 'freeze' : 'freezes'} (❄ keeps a missed day)`,
            vi: `Kỷ lục ${habit.longest} ngày · ${habit.freezes} lần đóng băng (❄ giữ chuỗi khi lỡ một ngày)`,
          })}
        </p>
      )}
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
