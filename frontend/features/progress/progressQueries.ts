import { createServerClient } from '@scipal/supabase';
import { cookies } from 'next/headers';

export interface ProgressSummary {
  completedLessons: Array<{
    id: string;
    score: number | null;
    lessons: { title_vi: string; title_en?: string; subjects?: { name_vi: string; name_en?: string } | null } | null;
  }>;
  streaks: Array<{
    subject_id: string;
    current_streak: number;
    last_active: string | null;
    subjects: { name_vi: string; name_en?: string; accent_color: string } | null;
  }>;
  totalXP: number;
  badges: Array<{
    earned_at: string;
    badges: { name_vi: string; name_en?: string; icon: string } | null;
  }>;
  /** True when any query failed; the lists are then empty, not real values. */
  loadFailed: boolean;
}

function failed(): ProgressSummary {
  return { completedLessons: [], streaks: [], totalXP: 0, badges: [], loadFailed: true };
}

export async function getUserProgress(userId: string): Promise<ProgressSummary> {
  try {
    const supabase = createServerClient(await cookies());

    const [progressRes, streaksRes, xpRes, badgesRes] = await Promise.all([
      supabase
        .from('progress')
        .select('*, lessons(title_vi, title_en, subjects(name_vi, name_en))')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false }),
      supabase
        .from('streaks')
        .select('*, subjects(name_vi, name_en, accent_color)')
        .eq('user_id', userId),
      supabase
        .from('xp_log')
        .select('delta, subject_id, reason, created_at')
        .eq('user_id', userId),
      supabase
        .from('user_badges')
        .select('earned_at, badges(name_vi, name_en, icon)')
        .eq('user_id', userId),
    ]);

    if (progressRes.error || streaksRes.error || xpRes.error || badgesRes.error) {
      console.warn('getUserProgress query failed:', progressRes.error ?? streaksRes.error ?? xpRes.error ?? badgesRes.error);
      return failed();
    }

    return {
      completedLessons: (progressRes.data ?? []) as unknown as ProgressSummary['completedLessons'],
      streaks: (streaksRes.data ?? []) as unknown as ProgressSummary['streaks'],
      totalXP: (xpRes.data ?? []).reduce((sum, row) => sum + row.delta, 0),
      badges: (badgesRes.data ?? []) as unknown as ProgressSummary['badges'],
      loadFailed: false,
    };
  } catch (err) {
    console.warn('getUserProgress failed:', err);
    return failed();
  }
}
