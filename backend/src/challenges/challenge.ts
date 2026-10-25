import type { StudyDay } from '../streaks/habit.js';
import { addDays, vnDay } from '../streaks/vnDay.js';

// A weekly challenge: who earns more XP over 7 Vietnam days, starting the day after it is accepted.

export const CHALLENGE_DAYS = 7;
export type ChallengeWindow = { starts_on: string; ends_on: string };

export function challengeWindow(acceptedAt: Date): ChallengeWindow {
  const starts_on = addDays(vnDay(acceptedAt), 1);
  return { starts_on, ends_on: addDays(starts_on, CHALLENGE_DAYS - 1) };
}

/** XP from the study days inside the window; freeze days carry no XP of their own. */
export function challengeScore(days: StudyDay[], window: ChallengeWindow): number {
  return days
    .filter((d) => !d.freeze && d.day >= window.starts_on && d.day <= window.ends_on)
    .reduce((sum, d) => sum + d.xp, 0);
}

/** The winner's id, or null on a tie. */
export function settle(a: { id: string; xp: number }, b: { id: string; xp: number }): string | null {
  if (a.xp === b.xp) return null;
  return a.xp > b.xp ? a.id : b.id;
}
