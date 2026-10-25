'use client';

import { Flame } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { streakAtRisk, useHabit, type Habit } from './habitApi';

/** "Study today to keep your N-day streak", only while the streak ends yesterday and today has no study. */
export function StreakRiskBanner({ habit }: { habit: Habit | null }) {
  const { t } = useLanguage();
  if (!habit || !streakAtRisk(habit)) return null;
  const freezes = habit.freezes > 0
    ? t({ en: ` You have ${habit.freezes} streak ${habit.freezes === 1 ? 'freeze' : 'freezes'} left.`, vi: ` Bạn còn ${habit.freezes} lần đóng băng chuỗi.` })
    : '';
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm text-ink">
      <Flame aria-hidden="true" className="h-5 w-5 shrink-0 text-coral" />
      <p>
        <span className="font-semibold">{t({ en: `Study today to keep your ${habit.streak}-day streak.`, vi: `Học hôm nay để giữ chuỗi ${habit.streak} ngày.` })}</span>
        {freezes}
      </p>
    </div>
  );
}

/** The banner for pages that do not load the habit themselves (home). */
export function HomeStreakBanner() {
  const { habit } = useHabit();
  if (!streakAtRisk(habit)) return null;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <StreakRiskBanner habit={habit} />
    </div>
  );
}
