import { createServerClient } from '@scipal/supabase';
import { cookies } from 'next/headers';

export interface UserProfileData {
  profile: {
    id: string;
    display_name?: string | null;
    role?: 'student' | 'teacher' | string;
    avatar_url?: string | null;
  } | null;
  stats: {
    totalXP: number;
    completedLessons: number;
    longestStreak: number;
  };
  /** True when any stats query failed; stats are then zeros, not real values. */
  loadFailed: boolean;
}

const EMPTY_STATS: UserProfileData['stats'] = { totalXP: 0, completedLessons: 0, longestStreak: 0 };

export async function getUserProfile(userId: string): Promise<UserProfileData> {
  try {
    const supabase = createServerClient(await cookies());

    const [profileRes, xpRes, progressRes, streakRes] = await Promise.all([
      supabase.from('profiles').select('id, display_name, role, avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('xp_log').select('delta').eq('user_id', userId),
      supabase.from('progress').select('id').eq('user_id', userId),
      supabase.from('streaks').select('longest_streak').eq('user_id', userId),
    ]);

    if (profileRes.error || xpRes.error || progressRes.error || streakRes.error) {
      console.warn('getUserProfile query failed:', profileRes.error ?? xpRes.error ?? progressRes.error ?? streakRes.error);
      return { profile: profileRes.data ?? null, stats: EMPTY_STATS, loadFailed: true };
    }

    return {
      profile: profileRes.data ?? null,
      stats: {
        totalXP: (xpRes.data ?? []).reduce((sum, row) => sum + (row.delta ?? 0), 0),
        completedLessons: (progressRes.data ?? []).length,
        longestStreak: (streakRes.data ?? []).reduce((max, s) => Math.max(max, s.longest_streak ?? 0), 0),
      },
      loadFailed: false,
    };
  } catch (err) {
    console.warn('getUserProfile failed:', err);
    return { profile: null, stats: EMPTY_STATS, loadFailed: true };
  }
}
