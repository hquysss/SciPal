import type { SupabaseClient } from '@supabase/supabase-js';
import { questionIncomplete, storedQuestionData, validateQuestionInput } from '../schemas/questions.js';

/** A question an exam lists, as the exam routes need it. */
export interface ExamQuestionRef {
  id: string;
  type: string;
  difficulty: number;
  status: string;
  created_by: string | null;
}

type Row = ExamQuestionRef & { usage: string; subject_id: string; data: unknown };
type Failure = { ok: false; status: 400 | 500; body: { error: string; error_en: string } };

const problem = (n: number, vi: string, en: string): Failure => ({
  ok: false,
  status: 400,
  body: { error: `Câu ${n}: ${vi}`, error_en: `Question ${n}: ${en}` },
});

/**
 * What an exam may list: exam questions of its subject, published or the exam author's own.
 * `review` (submit or publish) also needs at least one question, each complete in both languages.
 */
export async function checkExamQuestions(
  supabase: SupabaseClient,
  ids: string[],
  exam: { subject_id: string; created_by: string | null },
  mode: 'draft' | 'review',
): Promise<{ ok: true; rows: ExamQuestionRef[] } | Failure> {
  if (ids.length === 0) {
    if (mode === 'review') return { ok: false, status: 400, body: { error: 'Đề cần ít nhất một câu hỏi.', error_en: 'An exam needs at least one question.' } };
    return { ok: true, rows: [] };
  }
  const { data, error } = await supabase
    .from('questions')
    .select('id, usage, subject_id, status, created_by, type, difficulty, data')
    .in('id', ids);
  if (error) return { ok: false, status: 500, body: { error: 'Không kiểm tra được câu hỏi của đề.', error_en: 'Could not check the exam questions.' } };
  const byId = new Map(((data ?? []) as Row[]).map((row) => [row.id, row]));

  const rows: ExamQuestionRef[] = [];
  for (const [i, id] of ids.entries()) {
    const n = i + 1;
    const row = byId.get(id);
    if (!row) return problem(n, 'không tìm thấy câu hỏi (có thể đã bị xóa).', 'the question no longer exists.');
    if (row.usage !== 'exam') return problem(n, 'đây là câu tự luyện của bài học, không dùng trong đề thi.', 'lesson practice questions cannot be used in exams.');
    if (row.subject_id !== exam.subject_id) return problem(n, 'câu hỏi thuộc môn khác.', 'the question belongs to another subject.');
    if (row.status !== 'published' && row.created_by !== exam.created_by) {
      return problem(n, 'câu hỏi chưa duyệt của người khác.', 'an unpublished question by someone else.');
    }
    if (mode === 'review') {
      const checked = validateQuestionInput({ usage: 'exam', subject_id: row.subject_id, type: row.type, difficulty: row.difficulty, data: storedQuestionData(row.type, row.data) });
      if (!checked.ok) return problem(n, checked.message.vi, checked.message.en);
      const missing = questionIncomplete(checked.value);
      if (missing) return problem(n, missing.vi, missing.en);
    }
    rows.push({ id: row.id, type: row.type, difficulty: row.difficulty, status: row.status, created_by: row.created_by });
  }
  return { ok: true, rows };
}
