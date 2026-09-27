import { z } from 'zod';
import { MAX_EXAM_ANSWERS } from '../routes/exam.js';

/** An exam as the builder sends it. English may wait until the exam is submitted or published. */
export interface ExamInput {
  name: string;
  name_en: string;
  subject_id: string;
  grade: number;
  duration_minutes: number;
  question_ids: string[];
}
export type ExamUpdate = Partial<ExamInput> & { expected_updated_at: string };

type Message = { vi: string; en: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fields = {
  name: z.string().trim().min(1).max(200),
  name_en: z.string().trim().max(200),
  subject_id: z.string().regex(UUID),
  grade: z.number().int().min(1).max(12),
  duration_minutes: z.number().int().min(5).max(300),
  question_ids: z.array(z.string().regex(UUID)).max(MAX_EXAM_ANSWERS),
};
const CreateSchema = z.object(fields).strict();
const UpdateSchema = z
  .object({ ...fields, subject_id: fields.subject_id.optional(), expected_updated_at: z.string().datetime({ offset: true }) })
  .partial()
  .required({ expected_updated_at: true })
  .strict();

const MESSAGES: Record<string, Message> = {
  name: { vi: 'Tên đề cần từ 1 đến 200 ký tự.', en: 'The exam name needs 1–200 characters.' },
  name_en: { vi: 'Tên tiếng Anh tối đa 200 ký tự.', en: 'The English name is at most 200 characters.' },
  subject_id: { vi: 'Môn học không hợp lệ.', en: 'Invalid subject.' },
  grade: { vi: 'Lớp phải từ 1 đến 12.', en: 'The grade must be 1–12.' },
  duration_minutes: { vi: 'Thời gian làm bài từ 5 đến 300 phút.', en: 'The duration must be 5–300 minutes.' },
  question_ids: { vi: `Đề có tối đa ${MAX_EXAM_ANSWERS} câu hỏi hợp lệ.`, en: `An exam has at most ${MAX_EXAM_ANSWERS} valid questions.` },
  expected_updated_at: { vi: 'Thiếu phiên bản của đề đang sửa.', en: 'The version of the exam being edited is missing.' },
};

export function validateExamInput(value: unknown, mode: 'create'): { ok: true; value: ExamInput } | { ok: false; message: Message };
export function validateExamInput(value: unknown, mode: 'update'): { ok: true; value: ExamUpdate } | { ok: false; message: Message };
export function validateExamInput(value: unknown, mode: 'create' | 'update') {
  const parsed = (mode === 'create' ? CreateSchema : UpdateSchema).safeParse(value);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? '');
    return { ok: false, message: MESSAGES[field] ?? { vi: 'Dữ liệu đề thi không hợp lệ.', en: 'Invalid exam data.' } };
  }
  const ids = (parsed.data as { question_ids?: string[] }).question_ids;
  if (ids && new Set(ids).size !== ids.length) {
    return { ok: false, message: { vi: 'Đề có câu hỏi bị lặp.', en: 'The exam lists a question twice.' } };
  }
  return { ok: true, value: parsed.data };
}

/** The `sections` column from the question list: counts per type and difficulty, first-seen order. */
export function examSections(rows: Array<{ type: string; difficulty: number }>): Array<{ type: string; difficulty: number; count: number }> {
  const sections: Array<{ type: string; difficulty: number; count: number }> = [];
  for (const row of rows) {
    const found = sections.find((s) => s.type === row.type && s.difficulty === row.difficulty);
    if (found) found.count += 1;
    else sections.push({ type: row.type, difficulty: row.difficulty, count: 1 });
  }
  return sections;
}
