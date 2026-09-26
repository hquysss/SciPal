import { describe, expect, it } from 'vitest';
import { activeSubjectsOn, streakCellClass } from './StreakCalendar';

describe('activeSubjectsOn', () => {
  const streaks = [
    { subject_id: 'a', current_streak: 3, last_active: '2026-09-26', subjects: null },
    { subject_id: 'b', current_streak: 1, last_active: '2026-09-24', subjects: null },
    { subject_id: 'c', current_streak: 0, last_active: '2026-09-26', subjects: null },
    { subject_id: 'd', current_streak: 5, last_active: null, subjects: null },
  ];

  it('counts a subject only on the days of its current streak', () => {
    expect(activeSubjectsOn(streaks, '2026-09-26')).toBe(1);
    expect(activeSubjectsOn(streaks, '2026-09-25')).toBe(1);
    expect(activeSubjectsOn(streaks, '2026-09-24')).toBe(2);
    expect(activeSubjectsOn(streaks, '2026-09-23')).toBe(0);
  });
});

describe('streakCellClass', () => {
  it('uses four levels of the action colour', () => {
    expect(streakCellClass(0)).toBe('bg-surface-sunken');
    expect(streakCellClass(1)).toBe('bg-[color-mix(in_srgb,var(--action)_30%,var(--surface))]');
    expect(streakCellClass(2)).toBe('bg-[color-mix(in_srgb,var(--action)_60%,var(--surface))]');
    expect(streakCellClass(3)).toBe('bg-[color-mix(in_srgb,var(--action)_60%,var(--surface))]');
    expect(streakCellClass(4)).toBe('bg-action');
    expect(streakCellClass(12)).toBe('bg-action');
  });

  it('treats negative and non-numeric counts as no activity', () => {
    expect(streakCellClass(-1)).toBe('bg-surface-sunken');
    expect(streakCellClass(Number.NaN)).toBe('bg-surface-sunken');
  });
});
