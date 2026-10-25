import type { SupabaseClient } from '@supabase/supabase-js';

import { touchStudyDay } from './studyDay.js';
import { addDays, vnDay } from './vnDay.js';

/**
 * Marks today (Vietnam time) as an active day in a subject, and as a study day with `xp` for the
 * streak across subjects and the daily goal (see studyDay.ts): +1 after yesterday, unchanged on the same day,
 * back to 1 after a gap; a day before the last active one leaves it as it is. Returns the current
 * streak, or 0 when it could not be read or saved (the activity
 * itself is already saved by then, so a streak failure is logged, not raised).
 */
export async function touchStreak(
  supabase: SupabaseClient,
  userId: string,
  subjectId: string,
  now: Date,
  log: { warn: (obj: object, msg: string) => void },
  xp = 0,
): Promise<number> {
  const today = vnDay(now);
  const yesterday = addDays(today, -1);
  try {
    await touchStudyDay(supabase, userId, today, xp, log);
  } catch (err) {
    log.warn({ err }, 'Study day update failed');
  }
  const { data: streak, error } = await supabase
    .from('streaks')
    .select('current_streak, longest_streak, last_active')
    .eq('user_id', userId)
    .eq('subject_id', subjectId)
    .maybeSingle();
  if (error) {
    log.warn({ err: error }, 'Streak lookup failed');
    return 0;
  }
  const row = streak as { current_streak: number; longest_streak: number; last_active: string } | null;
  // A day before the last active one (an offline answer synced late) changes nothing.
  if (row && row.last_active > today) return row.current_streak;
  const current = row?.last_active === yesterday ? row.current_streak + 1 : row?.last_active === today ? row.current_streak : 1;
  const { error: writeError } = await supabase.from('streaks').upsert(
    {
      user_id: userId,
      subject_id: subjectId,
      current_streak: current,
      longest_streak: Math.max(current, row?.longest_streak ?? 0),
      last_active: today,
    },
    { onConflict: 'user_id,subject_id' },
  );
  if (writeError) {
    log.warn({ err: writeError }, 'Streak update failed');
    return 0;
  }
  return current;
}
