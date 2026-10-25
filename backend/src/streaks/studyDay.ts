import type { SupabaseClient } from '@supabase/supabase-js';
import { currentStreak, freezePlan, freezesEarned, MAX_FREEZES } from './habit.js';
import { addDays } from './vnDay.js';

type Log = { warn: (obj: object, msg: string) => void };

/**
 * Records study on `day` (Vietnam date) with `xp`. On the first study of a new day it first fills
 * missed days with freezes (all or nothing) and then grants a freeze for each multiple of 7 reached.
 * A day older than the latest one (an offline answer synced late) only adds its XP.
 */
export async function touchStudyDay(supabase: SupabaseClient, userId: string, day: string, xp: number, log: Log): Promise<void> {
  const { data: latest, error } = await supabase
    .from('study_days')
    .select('day')
    .eq('user_id', userId)
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    log.warn({ err: error }, 'Study day lookup failed');
    return;
  }
  const latestDay = (latest as { day: string } | null)?.day ?? null;
  const newDay = !latestDay || latestDay < day;

  let stored = 0;
  let freezes = 0;
  if (newDay) {
    const { data: profile } = await supabase.from('profiles').select('streak_freezes').eq('id', userId).maybeSingle();
    stored = freezes = (profile as { streak_freezes: number } | null)?.streak_freezes ?? 0;
    const fill = freezePlan(latestDay, day, freezes);
    if (fill.length) {
      const { error: fillError } = await supabase
        .from('study_days')
        .upsert(fill.map((d) => ({ user_id: userId, day: d, xp: 0, freeze: true })), { onConflict: 'user_id,day', ignoreDuplicates: true });
      if (fillError) log.warn({ err: fillError }, 'Streak freeze fill failed');
      else freezes -= fill.length;
    }
  }

  const { error: bumpError } = await supabase.rpc('bump_study_day', { p_user: userId, p_day: day, p_xp: Math.max(0, xp) });
  if (bumpError) {
    log.warn({ err: bumpError }, 'Study day update failed');
    return;
  }
  if (!newDay) return;

  const { data: recent } = await supabase.from('study_days').select('day').eq('user_id', userId).gte('day', addDays(day, -400));
  const after = currentStreak((recent ?? []) as Array<{ day: string }>, day);
  const next = Math.min(MAX_FREEZES, freezes + freezesEarned(after - 1, after));
  if (next === stored) return;
  const { error: freezeError } = await supabase.from('profiles').update({ streak_freezes: next }).eq('id', userId);
  if (freezeError) log.warn({ err: freezeError }, 'Streak freeze update failed');
}
