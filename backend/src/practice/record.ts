import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_LESSON_QUESTIONS, quizQuestionIds } from '../authoring/quizReferences.js';
import { PRACTICE_XP } from '../schemas/progress.js';
import { touchStreak } from '../streaks/touchStreak.js';
import { ID, type PracticeRow } from './servable.js';

// What a practice answer earns. Only a learner's first answer to each question counts: it is kept in
// practice_attempts, gives XP by difficulty when right (once, guarded by xp_log_practice_once_idx),
// and completes a lesson once 80% of its practice questions were right the first time. The same
// function serves an online check and an offline answer synced later; `at` is when it was answered.

/** Share of a lesson's practice questions right the first time that completes the lesson. */
export const LESSON_DONE_SHARE = 0.8;

type Log = { warn: (obj: object, msg: string) => void; error?: (obj: object, msg: string) => void };

export type PracticeRecord = { counted: boolean; xp_earned: number; new_streak: number; lesson_completed: boolean };

const NOTHING: PracticeRecord = { counted: false, xp_earned: 0, new_streak: 0, lesson_completed: false };

export async function recordPractice(
  supabase: SupabaseClient,
  input: { userId: string; row: PracticeRow; correct: boolean; at: Date },
  log: Log,
): Promise<PracticeRecord> {
  const { userId, row, correct, at } = input;
  const when = at.toISOString();
  const { data: inserted, error } = await supabase
    .from('practice_attempts')
    .upsert({ user_id: userId, question_id: row.id, correct, created_at: when }, { onConflict: 'user_id,question_id', ignoreDuplicates: true })
    .select('question_id');
  if (error) {
    log.warn({ err: error, questionId: row.id }, 'Practice attempt insert failed');
    return NOTHING;
  }
  if (!Array.isArray(inserted) || inserted.length === 0) return NOTHING;
  if (!correct) return { ...NOTHING, counted: true };

  let xpEarned = 0;
  let newStreak = 0;
  const delta = PRACTICE_XP[row.difficulty] ?? PRACTICE_XP[1]!;
  const grant = () =>
    supabase.from('xp_log').insert({ user_id: userId, subject_id: row.subject_id, delta, reason: `practice_ok:${row.id}`, created_at: when });
  // The first answer is already kept, so a lost grant could never be earned again: try once more.
  let { error: xpError } = await grant();
  if (xpError && xpError.code !== '23505') ({ error: xpError } = await grant());
  if (!xpError) {
    xpEarned = delta;
    newStreak = await touchStreak(supabase, userId, row.subject_id, at, log);
  } else if (xpError.code !== '23505') {
    (log.error ?? log.warn)({ err: xpError, questionId: row.id }, 'Practice XP insert failed twice; the XP is lost');
  }
  const lessonCompleted = await completeLessons(supabase, userId, row.id, at, log);
  return { counted: true, xp_earned: xpEarned, new_streak: newStreak, lesson_completed: lessonCompleted };
}

/** Writes progress for each published lesson holding the question that is now 80% right the first time. */
async function completeLessons(supabase: SupabaseClient, userId: string, questionId: string, at: Date, log: Log): Promise<boolean> {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, blocks')
    .eq('status', 'published')
    // jsonb containment: postgrest-js sends a JS array as a Postgres array literal, so pass JSON.
    .contains('blocks', JSON.stringify([{ type: 'quiz', question_id: questionId }]));
  if (error) {
    log.warn({ err: error, questionId }, 'Lesson lookup failed for practice progress');
    return false;
  }
  let completed = false;
  for (const lesson of (lessons ?? []) as Array<{ id: string; blocks: unknown }>) {
    const ids = quizQuestionIds(lesson.blocks).filter((id) => ID.test(id)).slice(0, MAX_LESSON_QUESTIONS);
    if (ids.length === 0) continue;
    const { data: counted, error: countedError } = await supabase
      .from('questions')
      .select('id')
      .in('id', ids)
      .eq('status', 'published')
      .eq('usage', 'practice')
      .not('type', 'eq', 'code');
    const eligible = ((counted ?? []) as Array<{ id: string }>).map((q) => q.id);
    if (countedError || eligible.length === 0) continue;
    const { data: rights, error: rightsError } = await supabase
      .from('practice_attempts')
      .select('question_id')
      .eq('user_id', userId)
      .eq('correct', true)
      .in('question_id', eligible);
    if (rightsError) continue;
    const share = (rights ?? []).length / eligible.length;
    if (share < LESSON_DONE_SHARE) continue;
    const { data: written, error: progressError } = await supabase
      .from('progress')
      .upsert({ user_id: userId, lesson_id: lesson.id, completed_at: at.toISOString(), score: Math.round(share * 100) }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: true })
      .select('lesson_id');
    if (progressError) log.warn({ err: progressError, lessonId: lesson.id }, 'Practice progress insert failed');
    else if (Array.isArray(written) && written.length > 0) completed = true;
  }
  return completed;
}

/** Clock drift allowed for an answer dated a little after the server's time. */
const DRIFT_MS = 5 * 60 * 1000;

/**
 * When an offline answer counts: the time the device says it was answered, but never in the future
 * (beyond clock drift) and never before the learner downloaded the lesson. Without a download on
 * record, or a readable time, it counts now.
 */
export function clampAnsweredAt(answeredAt: string, downloadedAt: string | null, now: Date): Date {
  const answered = Date.parse(answeredAt);
  const downloaded = downloadedAt === null ? NaN : Date.parse(downloadedAt);
  if (Number.isNaN(answered) || Number.isNaN(downloaded) || answered > now.getTime() + DRIFT_MS) return now;
  return new Date(Math.max(answered, downloaded));
}
