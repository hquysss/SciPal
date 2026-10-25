'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { playSfx } from '../../lib/sfx';
import styles from './habit.module.css';

const R = 16;
const C = 2 * Math.PI * R;

/** Whether the "goal reached" moment was already shown today on this device. */
function celebrated(day: string): boolean {
  try {
    return window.localStorage.getItem(`scipal:goal-done:${day}`) === '1';
  } catch {
    return true;
  }
}

function markCelebrated(day: string) {
  try {
    window.localStorage.setItem(`scipal:goal-done:${day}`, '1');
  } catch {
    // Storage blocked: it may show again on the next page.
  }
}

/** "Today X/Y XP" as a ring. `xp` is the server's today XP (plus this visit's server XP); reaching the goal is marked once a day. */
export function DailyGoalRing({ day, xp, goal }: { day: string; xp: number; goal: number }) {
  const { t } = useLanguage();
  const done = xp >= goal;
  const [justDone, setJustDone] = useState(false);
  useEffect(() => {
    if (!done || celebrated(day)) return;
    markCelebrated(day);
    setJustDone(true);
    playSfx('levelUp');
  }, [done, day]);
  const share = Math.min(1, Math.max(0, xp / goal));
  return (
    <div className="inline-flex items-center gap-2 text-sm">
      <svg
        role="progressbar"
        aria-label={t({ en: 'Daily goal', vi: 'Mục tiêu hôm nay' })}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(xp, goal)}
        viewBox="0 0 40 40"
        className={`size-10 shrink-0 -rotate-90 ${justDone ? styles.pop : ''}`}
      >
        <circle cx="20" cy="20" r={R} fill="none" strokeWidth="5" className="stroke-surface-sunken" />
        <circle cx="20" cy="20" r={R} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - share)} className={`${styles.ring} ${done ? 'stroke-success' : 'stroke-action'}`} />
      </svg>
      <span aria-live="polite" className="font-semibold tabular-nums text-ink">
        {done
          ? t({ en: `Daily goal reached · ${xp} XP`, vi: `Đạt mục tiêu hôm nay · ${xp} XP` })
          : t({ en: `Today ${xp}/${goal} XP`, vi: `Hôm nay ${xp}/${goal} XP` })}
      </span>
    </div>
  );
}
