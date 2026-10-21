import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_LESSON_QUESTIONS, quizQuestionIds } from '../authoring/quizReferences.js';
import { ID } from './servable.js';

// "Bài đang làm dở": the lessons whose Tự luyện the learner started and has not finished, with how
// many questions are left. A question counts as done once the learner has a first answer on record
// (practice_attempts); the same published, non-programming questions count as for XP and completion.

export type RemainingLesson = {
  lesson_id: string;
  slug: string;
  subject_slug: string;
  title: { en: string; vi: string };
  total: number;
  done: number;
  remaining: number;
  last_at: string;
};

/** Most lessons listed. */
export const MAX_REMAINING_LESSONS = 20;
/** Most recent answers looked at to find the lessons being worked on. */
const MAX_ATTEMPTS_READ = 500;

type LessonRow = {
  id: string;
  slug: string;
  title_en: string;
  title_vi: string;
  blocks: unknown;
  subjects: { slug: string; archived_at: string | null } | Array<{ slug: string; archived_at: string | null }> | null;
};

export async function practiceRemaining(supabase: SupabaseClient, userId: string): Promise<{ ok: true; lessons: RemainingLesson[] } | { ok: false; err: unknown }> {
  const attemptsRead = await supabase
    .from('practice_attempts')
    .select('question_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_ATTEMPTS_READ);
  if (attemptsRead.error) return { ok: false, err: attemptsRead.error };
  const attempts = (attemptsRead.data ?? []) as Array<{ question_id: string; created_at: string }>;
  if (attempts.length === 0) return { ok: true, lessons: [] };
  const answeredAt = new Map(attempts.map((a) => [a.question_id, a.created_at]));

  // The lessons those answers belong to, then those lessons' own quiz questions.
  const homes = await supabase.from('questions').select('id, lesson_id').in('id', [...answeredAt.keys()]);
  if (homes.error) return { ok: false, err: homes.error };
  const lessonIds = [...new Set(((homes.data ?? []) as Array<{ lesson_id: string | null }>).flatMap((q) => (q.lesson_id ? [q.lesson_id] : [])))];
  if (lessonIds.length === 0) return { ok: true, lessons: [] };
  const lessonsRead = await supabase
    .from('lessons')
    .select('id, slug, title_en, title_vi, blocks, subjects(slug, archived_at)')
    .in('id', lessonIds)
    .eq('status', 'published');
  if (lessonsRead.error) return { ok: false, err: lessonsRead.error };
  const lessons = ((lessonsRead.data ?? []) as unknown as LessonRow[]).map((lesson) => ({
    lesson,
    ids: quizQuestionIds(lesson.blocks).filter((id) => ID.test(id)).slice(0, MAX_LESSON_QUESTIONS),
  }));
  const allIds = [...new Set(lessons.flatMap((l) => l.ids))];
  if (allIds.length === 0) return { ok: true, lessons: [] };
  const eligibleRead = await supabase.from('questions').select('id').in('id', allIds).eq('status', 'published').eq('usage', 'practice').not('type', 'eq', 'code');
  if (eligibleRead.error) return { ok: false, err: eligibleRead.error };
  const eligible = new Set(((eligibleRead.data ?? []) as Array<{ id: string }>).map((q) => q.id));

  const listed: RemainingLesson[] = [];
  for (const { lesson, ids } of lessons) {
    const subject = Array.isArray(lesson.subjects) ? lesson.subjects[0] : lesson.subjects;
    if (!subject || subject.archived_at) continue;
    const counted = ids.filter((id) => eligible.has(id));
    const done = counted.filter((id) => answeredAt.has(id));
    if (done.length === 0 || done.length >= counted.length) continue;
    listed.push({
      lesson_id: lesson.id,
      slug: lesson.slug,
      subject_slug: subject.slug,
      title: { en: lesson.title_en, vi: lesson.title_vi },
      total: counted.length,
      done: done.length,
      remaining: counted.length - done.length,
      last_at: done.map((id) => answeredAt.get(id)!).sort().at(-1)!,
    });
  }
  listed.sort((a, b) => b.last_at.localeCompare(a.last_at));
  return { ok: true, lessons: listed.slice(0, MAX_REMAINING_LESSONS) };
}
