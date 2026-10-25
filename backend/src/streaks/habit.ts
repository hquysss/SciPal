import { addDays } from './vnDay.js';

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7;

export type StudyDay = { day: string; xp: number; freeze: boolean };

/** Days in a row with a study (or freeze) day, ending today or yesterday; 0 otherwise. */
export function currentStreak(days: Array<Pick<StudyDay, 'day'>>, today: string): number {
  const set = new Set(days.map((d) => d.day));
  let end = set.has(today) ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null;
  let count = 0;
  while (end && set.has(end)) {
    count++;
    end = addDays(end, -1);
  }
  return count;
}

/** The longest run of consecutive days. */
export function longestStreak(days: Array<Pick<StudyDay, 'day'>>): number {
  const sorted = [...new Set(days.map((d) => d.day))].sort();
  let best = 0;
  let run = 0;
  sorted.forEach((day, i) => {
    run = i > 0 && addDays(sorted[i - 1]!, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/**
 * The missed days between the last study day and today that freezes fill. All or nothing:
 * a gap longer than the freezes left breaks the streak and spends none.
 */
export function freezePlan(lastDay: string | null, today: string, freezes: number): string[] {
  if (!lastDay || lastDay >= today) return [];
  const missed: string[] = [];
  for (let d = addDays(lastDay, 1); d < today; d = addDays(d, 1)) missed.push(d);
  return missed.length <= freezes ? missed : [];
}

/** Freezes gained when the streak goes from `before` to `after` (one per multiple of 7 crossed). */
export function freezesEarned(before: number, after: number): number {
  return Math.max(0, Math.floor(after / FREEZE_EVERY) - Math.floor(before / FREEZE_EVERY));
}
