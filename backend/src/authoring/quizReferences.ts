import type { SupabaseClient } from '@supabase/supabase-js';
import { questionIncomplete, storedQuestionData, validateQuestionInput } from '../schemas/questions.js';

/**
 * What a lesson's quiz blocks may point to (Tự luyện). A quiz block names a practice question of
 * the lesson's subject that is either published (it may come from another lesson) or still a
 * draft attached to this lesson. The database moves attached drafts through review with the
 * lesson (sync_lesson_practice_questions).
 *
 *  - draft:  saving a draft or rejected lesson; English may still be missing.
 *  - review: submitting, approving, or an admin publishing; every question must be complete.
 *  - live:   editing a lesson that stays published; every question must already be published.
 */
export type QuizCheckMode = 'draft' | 'review' | 'live';

export const MAX_LESSON_QUESTIONS = 100;

export interface QuizLesson {
  id: string;
  subject_id: string;
}

export interface QuizProblem {
  status: 400 | 500;
  body: { error: string; error_en: string };
}

interface QuestionRefRow {
  id: string;
  usage: string;
  subject_id: string;
  lesson_id: string | null;
  status: string;
  type: string;
  difficulty: number;
  data: unknown;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Question ids of the lesson's quiz blocks, in order. */
export function quizQuestionIds(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((b) =>
    b && typeof b === 'object' && (b as { type?: unknown }).type === 'quiz' && typeof (b as { question_id?: unknown }).question_id === 'string'
      ? [(b as { question_id: string }).question_id]
      : [],
  );
}

const problem = (n: number, vi: string, en: string): QuizProblem => ({
  status: 400,
  body: { error: `Câu hỏi ${n}: ${vi}`, error_en: `Question ${n}: ${en}` },
});

export async function validateQuizReferences(
  supabase: SupabaseClient,
  blocks: unknown,
  lesson: QuizLesson,
  mode: QuizCheckMode,
): Promise<QuizProblem | null> {
  const ids = quizQuestionIds(blocks);
  if (ids.length === 0) return null;
  if (ids.length > MAX_LESSON_QUESTIONS) {
    return { status: 400, body: { error: `Một bài có tối đa ${MAX_LESSON_QUESTIONS} câu tự luyện.`, error_en: `A lesson has at most ${MAX_LESSON_QUESTIONS} practice questions.` } };
  }
  const seen = new Set<string>();
  for (const [i, id] of ids.entries()) {
    if (!UUID.test(id)) return problem(i + 1, 'mã câu hỏi không hợp lệ.', 'the question ID is not valid.');
    if (seen.has(id)) return problem(i + 1, 'câu này đã có trong bài.', 'this question is already in the lesson.');
    seen.add(id);
  }

  const { data, error } = await supabase
    .from('questions')
    .select('id, usage, subject_id, lesson_id, status, type, difficulty, data')
    .in('id', ids);
  if (error) return { status: 500, body: { error: 'Không kiểm tra được câu tự luyện.', error_en: 'Could not check the practice questions.' } };
  const byId = new Map(((data ?? []) as QuestionRefRow[]).map((row) => [row.id, row]));

  for (const [i, id] of ids.entries()) {
    const n = i + 1;
    const row = byId.get(id);
    if (!row) return problem(n, 'không tìm thấy câu hỏi (có thể đã bị xóa).', 'the question no longer exists.');
    if (row.usage !== 'practice') return problem(n, 'đây là câu hỏi đề thi, không dùng trong bài học.', 'exam questions cannot be used in lessons.');
    if (row.subject_id !== lesson.subject_id) return problem(n, 'câu hỏi thuộc môn khác.', 'the question belongs to another subject.');
    if (row.status !== 'published') {
      if (row.lesson_id !== lesson.id) return problem(n, 'câu hỏi chưa duyệt của bài khác.', 'an unpublished question of another lesson.');
      if (mode === 'live') return problem(n, 'bài đã xuất bản chỉ dùng câu hỏi đã duyệt.', 'a published lesson may only use published questions.');
    }
    if (mode !== 'draft') {
      const checked = validateQuestionInput({ usage: 'practice', subject_id: row.subject_id, type: row.type, difficulty: row.difficulty, data: storedQuestionData(row.type, row.data) });
      if (!checked.ok) return problem(n, checked.message.vi, checked.message.en);
      const missing = questionIncomplete(checked.value);
      if (missing) return problem(n, missing.vi, missing.en);
    }
  }
  return null;
}
