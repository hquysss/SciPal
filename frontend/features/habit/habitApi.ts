'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAccessToken } from '../../lib/session';

// The learner's streak across subjects and daily goal (backend GET/PATCH /api/me/habit). Server numbers only.

export type StudyDay = { day: string; xp: number; freeze: boolean };
export type Habit = {
  today: string;
  streak: number;
  longest: number;
  today_xp: number;
  goal_xp: number;
  freezes: number;
  days: StudyDay[];
};
export const DAILY_GOALS = [20, 50, 100] as const;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

/** null for guests or when the server cannot answer: pages show without it. */
export async function getHabit(token: string | undefined): Promise<Habit | null> {
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/me/habit`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as Habit;
    return Array.isArray(data?.days) ? data : null;
  } catch {
    return null;
  }
}

export async function saveDailyGoal(goal: (typeof DAILY_GOALS)[number]): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/api/me/habit`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_xp: goal }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The habit once on mount; `reload` asks again (after a goal change). */
export function useHabit() {
  const [habit, setHabit] = useState<Habit | null>(null);
  const reload = useCallback(async () => {
    setHabit(await getHabit(await getAccessToken()));
  }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const next = await getHabit(await getAccessToken());
      if (alive) setHabit(next);
    })();
    return () => {
      alive = false;
    };
  }, []);
  return { habit, reload };
}

/** Today has no study yet and a streak of 2+ days ends yesterday: it breaks at midnight. */
export function streakAtRisk(habit: Habit | null): boolean {
  return !!habit && habit.today_xp === 0 && !habit.days.some((d) => d.day === habit.today) && habit.streak >= 2;
}
