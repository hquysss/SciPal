'use client';

import { useEffect, useState } from 'react';
import { Flame, Snowflake } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { levelOfXp } from '@scipal/types';
import { GlitchBackdrop } from '@/components/GlitchBackdrop';
import { DailyGoalRing } from '@/features/habit/DailyGoalRing';
import { useHabit, type Habit } from '@/features/habit/habitApi';
import { useTotalXp } from '@/features/lessons/useTotalXp';
import styles from './games.module.css';

/** Counts up to `to` once; jumps straight there when the reader prefers less motion. */
function useCountUp(to: number, ms = 800) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof requestAnimationFrame !== 'function') {
      setShown(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setShown(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return shown;
}

/** The number counts up on screen; readers hear the final value once. */
function Count({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  return (
    <span className={className}>
      <span aria-hidden="true">{shown.toLocaleString()}</span>
      <span className="sr-only">{value.toLocaleString()}</span>
    </span>
  );
}

/** The player's card on the games hub: level and XP to the next one, streak, today's goal, freezes. Server numbers only. */
export function PlayerHeroView({ xp, habit }: { xp: number | null; habit: Habit | null }) {
  const { t } = useLanguage();
  if (xp === null && !habit) return null;
  const info = xp === null ? null : levelOfXp(xp);
  const share = info ? info.intoLevel / (info.intoLevel + info.toNext) : 0;

  return (
    <section aria-label={t({ en: 'Your player card', vi: 'Thẻ người chơi của em' })} className={`${styles.hero} flex flex-col gap-6 p-5 sm:p-7 md:flex-row md:items-center md:justify-between`}>
      <GlitchBackdrop />
      {info && (
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className={styles.levelBadge}>
            <div className="text-center leading-none">
              <div className="text-[0.65rem] font-bold uppercase tracking-wider">{t({ en: 'Level', vi: 'Cấp' })}</div>
              <Count value={info.level} className="text-3xl font-extrabold tabular-nums" />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-sm font-semibold text-ink-muted">
              <Count value={xp!} className="text-2xl font-extrabold tabular-nums text-ink" /> XP
            </p>
            <div
              role="progressbar"
              aria-label={t({ en: `Progress to level ${info.level + 1}`, vi: `Tiến tới cấp ${info.level + 1}` })}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(share * 100)}
              className={styles.xpTrack}
            >
              <div className={styles.xpFill} style={{ width: `${Math.max(share * 100, 3)}%` }} />
            </div>
            <p className="text-sm text-ink-muted">
              {t({ en: `${info.toNext.toLocaleString()} XP to level ${info.level + 1}`, vi: `Còn ${info.toNext.toLocaleString()} XP nữa lên cấp ${info.level + 1}` })}
            </p>
          </div>
        </div>
      )}
      {habit && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className={`grid h-11 w-11 place-items-center rounded-2xl ${habit.streak > 0 ? 'bg-[color-mix(in_srgb,var(--coral)_30%,var(--surface))]' : 'bg-surface-sunken'} text-ink`}>
              <Flame className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <Count value={habit.streak} className="block text-2xl font-extrabold tabular-nums text-ink" />
              <span className="text-sm text-ink-muted">{t({ en: 'day streak', vi: 'ngày liên tiếp' })}</span>
            </span>
          </div>
          <DailyGoalRing day={habit.today} xp={habit.today_xp} goal={habit.goal_xp} />
          {habit.freezes > 0 && (
            <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold text-ink" title={t({ en: 'Streak freezes', vi: 'Lượt đóng băng chuỗi' })}>
              <Snowflake aria-hidden="true" className="h-4 w-4 text-sky" />
              {t({ en: `${habit.freezes} freeze${habit.freezes > 1 ? 's' : ''}`, vi: `${habit.freezes} đóng băng` })}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

export function PlayerHero() {
  const xp = useTotalXp();
  const { habit } = useHabit();
  return <PlayerHeroView xp={xp} habit={habit} />;
}
