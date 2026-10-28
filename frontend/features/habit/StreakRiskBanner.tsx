'use client';

import { useState } from 'react';
import { Flame, X } from 'lucide-react';
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
  const { t } = useLanguage();
  const { habit } = useHabit();
  const [closed, setClosed] = useState(false);
  if (closed || !streakAtRisk(habit)) return null;
  // A toast at the bottom: the hero is full-bleed under the nav bar, so a row above it leaves a
  // strip of page and anything laid over its top covers the hero cards.
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-xl shadow-lg [&>[role=status]]:pr-12">
      <StreakRiskBanner habit={habit} />
      <button type="button" onClick={() => setClosed(true)} aria-label={t({ en: 'Close', vi: 'Đóng' })} className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
