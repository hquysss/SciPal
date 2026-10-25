import type { SupabaseClient } from '@supabase/supabase-js';
import { levelOfXp } from '../schemas/level.js';
import { longestStreak } from '../streaks/habit.js';
import { vnDay } from '../streaks/vnDay.js';
import { isEarned, type BadgeStats } from './evaluate.js';

// The one place badges are evaluated and awarded (the server decides, invariant #4).

export const BADGE_COLUMNS = 'id, slug, name_vi, name_en, description_vi, description_en, icon, category, tier, is_system, sort_order, condition';
export type BadgeRow = {
  id: string; slug: string | null; name_vi: string; name_en: string; description_vi: string; description_en: string;
  icon: string; category: string; tier: string; is_system: boolean; sort_order: number; condition: unknown;
};
/** What an unlock moment shows. */
export type NewBadge = Pick<BadgeRow, 'slug' | 'name_vi' | 'name_en' | 'icon' | 'tier'>;

/** What an action added: counts, and `xp` from which a level and a reached daily goal are worked out. */
export type BadgeAction = Partial<Omit<BadgeStats, 'level' | 'goalDays'>> & { xp?: number };

type Log = { warn: (obj: object, msg: string) => void };
type Measured = { stats: BadgeStats; totalXp: number; todayXp: number; goal: number };

async function measure(supabase: SupabaseClient, id: string): Promise<Measured | null> {
  // ponytail: reads every xp_log row of the learner per call; a running total if this gets slow.
  const [studyDays, profile, exams, friends, lessons, practice, xp, wins] = await Promise.all([
    supabase.from('study_days').select('day, xp, freeze').eq('user_id', id),
    supabase.from('profiles').select('daily_goal_xp').eq('id', id).maybeSingle(),
    supabase.from('exam_attempts').select('score').eq('user_id', id).eq('status', 'submitted'),
    supabase.from('friendships').select('id', { count: 'exact', head: true }).or(`user_a.eq.${id},user_b.eq.${id}`).eq('status', 'accepted'),
    supabase.from('progress').select('id', { count: 'exact', head: true }).eq('user_id', id).not('completed_at', 'is', null),
    supabase.from('practice_attempts').select('question_id', { count: 'exact', head: true }).eq('user_id', id).eq('correct', true),
    supabase.from('xp_log').select('delta, reason').eq('user_id', id),
    supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('winner', id),
  ]);
  if ([studyDays, profile, exams, friends, lessons, practice, xp, wins].some((r) => r.error)) return null;
  const days = (studyDays.data ?? []) as Array<{ day: string; xp: number; freeze: boolean }>;
  const goal = (profile.data as { daily_goal_xp?: number } | null)?.daily_goal_xp ?? 20;
  const scores = ((exams.data ?? []) as Array<{ score: number | string | null }>).map((e) => Number(e.score ?? 0));
  const log = (xp.data ?? []) as Array<{ delta: number; reason: string }>;
  const totalXp = log.reduce((sum, r) => sum + (r.delta ?? 0), 0);
  const today = vnDay(new Date());
  return {
    stats: {
      bestStreak: longestStreak(days),
      examCount: scores.length,
      bestExamScore: Math.max(0, ...scores),
      friends: friends.count ?? 0,
      lessonsDone: lessons.count ?? 0,
      practiceRight: practice.count ?? 0,
      level: levelOfXp(totalXp).level,
      goalDays: days.filter((d) => !d.freeze && d.xp >= goal).length,
      codeAc: log.filter((r) => r.reason?.startsWith('code_ac:')).length,
      challengeWins: wins.count ?? 0,
    },
    totalXp,
    todayXp: days.find((d) => d.day === today && !d.freeze)?.xp ?? 0,
    goal,
  };
}

/** The numbers the rules are checked against; null when any lookup fails, so nothing is awarded on a guess. */
export async function badgeStats(supabase: SupabaseClient, id: string): Promise<BadgeStats | null> {
  return (await measure(supabase, id))?.stats ?? null;
}

/** The numbers as they were before `action`. */
function before({ stats, totalXp, todayXp, goal }: Measured, action: BadgeAction): BadgeStats {
  const { xp = 0, ...counts } = action;
  const out = { ...stats };
  for (const [key, value] of Object.entries(counts) as Array<[keyof BadgeStats, number]>) out[key] = stats[key] - (value ?? 0);
  out.level = levelOfXp(totalXp - xp).level;
  if (todayXp >= goal && todayXp - xp < goal) out.goalDays = stats.goalDays - 1;
  return out;
}

/**
 * Awards every badge whose rule is now met and not owned yet. Returns the ones to show as an unlock
 * moment: only those `action` itself earned. Badges met before it (new badges caught up on) are awarded
 * quietly, and without an action nothing is shown. Never throws: a failure is logged and shows nothing.
 */
export async function awardBadges(supabase: SupabaseClient, userId: string, log: Log, action?: BadgeAction): Promise<{ stats: BadgeStats | null; shown: NewBadge[] }> {
  try {
    // Each read starts inside an async function, so one that throws while being built still rejects
    // through Promise.all instead of leaving the others unhandled.
    const [measured, badges, owned] = await Promise.all([
      measure(supabase, userId),
      (async () => supabase.from('badges').select(BADGE_COLUMNS).not('slug', 'is', null).order('sort_order'))(),
      (async () => supabase.from('user_badges').select('badge_id').eq('user_id', userId))(),
    ]);
    const stats = measured?.stats ?? null;
    if (!measured || !stats || badges.error || owned.error) return { stats, shown: [] };
    const have = new Set(((owned.data ?? []) as Array<{ badge_id: string }>).map((o) => o.badge_id));
    const fresh = ((badges.data ?? []) as BadgeRow[]).filter((b) => !have.has(b.id) && isEarned(b.condition, stats));
    if (fresh.length === 0) return { stats, shown: [] };
    const inserted = await supabase
      .from('user_badges')
      .upsert(fresh.map((b) => ({ user_id: userId, badge_id: b.id })), { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
    if (inserted.error) {
      log.warn({ err: inserted.error }, 'New badges were not saved');
      return { stats, shown: [] };
    }
    const prior = action ? before(measured, action) : null;
    const shown = prior ? fresh.filter((b) => !isEarned(b.condition, prior)) : [];
    return { stats, shown: shown.map(({ slug, name_vi, name_en, icon, tier }) => ({ slug, name_vi, name_en, icon, tier })) };
  } catch (err) {
    log.warn({ err }, 'Badge award failed');
    return { stats: null, shown: [] };
  }
}
