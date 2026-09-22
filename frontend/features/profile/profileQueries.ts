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
}

export async function getUserProfile(userId: string): Promise<UserProfileData> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore as any);

    const [{ data: profile }, { data: xpLogs }, { data: progress }, { data: streaks }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('xp_log').select('delta').eq('user_id', userId),
      supabase.from('progress').select('id, score').eq('user_id', userId),
      supabase.from('streaks').select('longest_streak').eq('user_id', userId),
    ]);

    const totalXP = (xpLogs ?? []).reduce((sum, row) => sum + (row.delta ?? 0), 0);
    const longestStreak = (streaks ?? []).reduce((max, s) => Math.max(max, s.longest_streak ?? 0), 0);

    return {
      profile: profile ?? {
        id: userId,
        display_name: 'Học viên SciPal',
        role: 'student',
        avatar_url: null,
      },
      stats: {
        totalXP,
        completedLessons: (progress ?? []).length,
        longestStreak,
      },
    };
  } catch (err) {
    console.warn('getUserProfile fetch error, using fallback:', err);
    return {
      profile: {
        id: userId,
        display_name: 'Học viên SciPal',
        role: 'student',
        avatar_url: null,
      },
      stats: {
        totalXP: 350,
        completedLessons: 4,
        longestStreak: 5,
      },
    };
  }
}
