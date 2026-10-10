import { createServerClient } from '@scipal/supabase';
import { cookies } from 'next/headers';
import type { TopicRow } from '../lessons/subjectPageQuery';
import { buildRoadmap, continueTarget, estimateMinutes, type ExamResult, type SubjectRoadmap } from './progressModel';

export interface ProgressSummary {
  completedLessons: Array<{
    id: string;
    score: number | null;
    completed_at?: string | null;
    lesson_id?: string;
    lessons: {
      title_vi: string;
      title_en?: string;
      subjects?: { id?: string; slug?: string; name_vi: string; name_en?: string; accent_color?: string } | null;
    } | null;
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
  /** XP leaderboards; null when they could not be loaded (the rest of the page still shows). */
  leaderboard: { week: LeaderRow[]; all: LeaderRow[] } | null;
  /** One roadmap per subject the student has started; null when the curriculum could not be loaded. */
  roadmaps: SubjectRoadmap[] | null;
  /** Estimated minutes for the lesson to continue, when there is one. */
  continueMinutes: number | null;
  /** Own submitted exams, newest first; null when they could not be loaded. */
  exams: ExamResult[] | null;
  /** True when any core query failed; the lists are then empty, not real values. */
  loadFailed: boolean;
}

export type LeaderRow = { rank: number; display_name: string | null; xp: number; is_me: boolean };

function failed(): ProgressSummary {
  return {
    completedLessons: [], streaks: [], totalXP: 0, badges: [], leaderboard: null,
    roadmaps: null, continueMinutes: null, exams: null, loadFailed: true,
  };
}

/** An archived subject is hidden by RLS, so rows that embed it arrive with `subjects: null`: leave them out. */
export function visibleCompletedLessons(rows: ProgressSummary['completedLessons']): ProgressSummary['completedLessons'] {
  return rows.filter((row) => !row.lessons || row.lessons.subjects);
}

export function visibleStreaks(rows: ProgressSummary['streaks']): ProgressSummary['streaks'] {
  return rows.filter((row) => row.subjects);
}

type Client = ReturnType<typeof createServerClient>;

/** Roadmaps for the subjects in the completed lessons, plus the time estimate of the lesson to continue. */
async function loadRoadmaps(supabase: Client, completed: ProgressSummary['completedLessons']) {
  const subjects = new Map<string, SubjectRoadmap['subject']>();
  const done = new Map<string, string | null>();
  for (const row of completed) {
    const s = row.lessons?.subjects;
    if (row.lesson_id) done.set(row.lesson_id, row.completed_at ?? null);
    if (s?.id && s.slug && !subjects.has(s.id)) {
      subjects.set(s.id, { id: s.id, slug: s.slug, name: { en: s.name_en ?? s.name_vi, vi: s.name_vi }, accent: s.accent_color ?? 'var(--action)' });
    }
  }
  if (subjects.size === 0) return { roadmaps: [], continueMinutes: null };

  const topics = await supabase
    .from('topics')
    .select('id, subject_id, name_en, name_vi, sort_order, grade, lessons(id, slug, title_en, title_vi, sort_order, grade, status)')
    .in('subject_id', [...subjects.keys()])
    .eq('lessons.status', 'published')
    .order('sort_order');
  if (topics.error) {
    console.warn('progress roadmap query failed:', topics.error);
    return { roadmaps: null, continueMinutes: null };
  }

  const rows = (topics.data ?? []) as unknown as Array<TopicRow & { subject_id: string }>;
  const roadmaps = [...subjects.values()].map((s) => buildRoadmap(s, rows.filter((t) => t.subject_id === s.id), done));
  const next = continueTarget(roadmaps);
  if (!next) return { roadmaps, continueMinutes: null };

  const blocks = await supabase.from('lessons').select('blocks').eq('id', next.lesson.id).maybeSingle();
  return { roadmaps, continueMinutes: blocks.data ? estimateMinutes((blocks.data as { blocks: unknown }).blocks) : null };
}

export async function getUserProgress(userId: string): Promise<ProgressSummary> {
  try {
    const supabase = createServerClient(await cookies());

    const [progressRes, streaksRes, xpRes, badgesRes, weekRes, allRes, examsRes] = await Promise.all([
      supabase
        .from('progress')
        .select('*, lessons(title_vi, title_en, subjects(id, slug, name_vi, name_en, accent_color))')
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
      supabase.rpc('xp_leaderboard', { p_weekly: true }),
      supabase.rpc('xp_leaderboard', { p_weekly: false }),
      supabase.rpc('my_exam_results'),
    ]);

    if (progressRes.error || streaksRes.error || xpRes.error || badgesRes.error) {
      console.warn('getUserProgress query failed:', progressRes.error ?? streaksRes.error ?? xpRes.error ?? badgesRes.error);
      return failed();
    }

    const completedLessons = visibleCompletedLessons((progressRes.data ?? []) as unknown as ProgressSummary['completedLessons']);
    const { roadmaps, continueMinutes } = await loadRoadmaps(supabase, completedLessons);

    return {
      completedLessons,
      streaks: visibleStreaks((streaksRes.data ?? []) as unknown as ProgressSummary['streaks']),
      totalXP: (xpRes.data ?? []).reduce((sum, row) => sum + row.delta, 0),
      badges: (badgesRes.data ?? []) as unknown as ProgressSummary['badges'],
      leaderboard: weekRes.error || allRes.error
        ? null
        : { week: (weekRes.data ?? []) as LeaderRow[], all: (allRes.data ?? []) as LeaderRow[] },
      roadmaps,
      continueMinutes,
      exams: examsRes.error
        ? null
        : (examsRes.data ?? []).map((e) => ({
            blueprintId: e.blueprint_id, name: e.name, score: Number(e.score), maxScore: Number(e.max_score), submittedAt: e.submitted_at,
          })),
      loadFailed: false,
    };
  } catch (err) {
    console.warn('getUserProgress failed:', err);
    return failed();
  }
}
