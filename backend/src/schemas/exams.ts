import { z } from 'zod';
import { MAX_EXAM_ANSWERS } from '../routes/exam.js';
import { EXAM_FORMATS, layoutQuestionIds, validateLayout, type ExamFormat, type ExamSection } from './examFormat.js';

/** An exam as the builder sends it. English may wait until the exam is submitted or published. */
export interface ExamInput {
  name: string;
  name_en: string;
  /** Where the exam comes from, shown on its card. */
  source?: string;
  /** Mã đề, e.g. "0101". */
  exam_code?: string;
  /** Năm của đề, 2000–2100. */
  exam_year?: number | null;
  subject_id: string;
  grade: number;
  duration_minutes: number;
  question_ids: string[];
  /** 'generic' is the flat 0-10 exam; any other format needs a layout. */
  format: ExamFormat;
  layout: ExamSection[] | null;
}
export type ExamUpdate = Partial<ExamInput> & { expected_updated_at: string };

type Message = { vi: string; en: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fields = {
  name: z.string().trim().min(1).max(200),
  name_en: z.string().trim().max(200),
  source: z.string().trim().max(300).optional(),
  exam_code: z.string().trim().max(40).optional(),
  exam_year: z.number().int().min(2000).max(2100).nullable().optional(),
  subject_id: z.string().regex(UUID),
  grade: z.number().int().min(1).max(12),
  duration_minutes: z.number().int().min(5).max(300),
  question_ids: z.array(z.string().regex(UUID)).max(MAX_EXAM_ANSWERS),
};
// The layout is checked by validateLayout below, which words its own errors.
const formatFields = { format: z.enum(EXAM_FORMATS), layout: z.unknown() };
const CreateSchema = z
  .object({ ...fields, format: formatFields.format.default('generic'), layout: formatFields.layout.default(null) })
  .strict();
const UpdateSchema = z
  .object({ ...fields, ...formatFields, subject_id: fields.subject_id.optional(), expected_updated_at: z.string().datetime({ offset: true }) })
  .partial()
  .required({ expected_updated_at: true })
  .strict();

const MESSAGES: Record<string, Message> = {
  name: { vi: 'Tên đề cần từ 1 đến 200 ký tự.', en: 'The exam name needs 1–200 characters.' },
  name_en: { vi: 'Tên tiếng Anh tối đa 200 ký tự.', en: 'The English name is at most 200 characters.' },
  source: { vi: 'Nguồn đề tối đa 300 ký tự.', en: 'The source is at most 300 characters.' },
  exam_code: { vi: 'Mã đề tối đa 40 ký tự.', en: 'The exam code is at most 40 characters.' },
  exam_year: { vi: 'Năm phải từ 2000 đến 2100.', en: 'The year must be 2000–2100.' },
  subject_id: { vi: 'Môn học không hợp lệ.', en: 'Invalid subject.' },
  grade: { vi: 'Lớp phải từ 1 đến 12.', en: 'The grade must be 1–12.' },
  duration_minutes: { vi: 'Thời gian làm bài từ 5 đến 300 phút.', en: 'The duration must be 5–300 minutes.' },
  question_ids: { vi: `Đề có tối đa ${MAX_EXAM_ANSWERS} câu hỏi hợp lệ.`, en: `An exam has at most ${MAX_EXAM_ANSWERS} valid questions.` },
  format: { vi: 'Dạng đề không hợp lệ.', en: 'Invalid exam format.' },
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
  const data = parsed.data as { question_ids?: string[]; format?: ExamFormat; layout?: unknown };
  let layout: ExamSection[] | null | undefined;
  if (data.layout === null) layout = null;
  else if (data.layout !== undefined) {
    const checked = validateLayout(data.layout);
    if (!checked.ok) return { ok: false, message: checked.message };
    // The server derives question_ids from the layout, so the list cap applies to it too.
    if (layoutQuestionIds(checked.value).length > MAX_EXAM_ANSWERS) return { ok: false, message: MESSAGES.question_ids! };
    layout = checked.value;
  }
  // The layout decides the question list, so a list sent beside it is not checked for repeats.
  const ids = layout ? undefined : data.question_ids;
  if (ids && new Set(ids).size !== ids.length) {
    return { ok: false, message: { vi: 'Đề có câu hỏi bị lặp.', en: 'The exam lists a question twice.' } };
  }
  if (data.format !== undefined && layout !== undefined) {
    const mismatch = formatLayoutMismatch(data.format, layout);
    if (mismatch) return { ok: false, message: mismatch };
  }
  return { ok: true, value: layout === undefined ? parsed.data : { ...parsed.data, layout } };
}

/** A structured format needs a layout and a generic exam has none; null when they agree. */
export function formatLayoutMismatch(format: ExamFormat, layout: ExamSection[] | null): Message | null {
  if (format === 'generic' && layout !== null) {
    return { vi: 'Đề thường không có bố cục các phần.', en: 'A generic exam has no section layout.' };
  }
  if (format !== 'generic' && layout === null) {
    return { vi: 'Đề theo cấu trúc chuẩn cần có bố cục các phần.', en: 'A structured exam needs a section layout.' };
  }
  return null;
}

/** The exam's question list: the flattened layout when it has one, else the list as sent (undefined if not sent). */
export function resolveExamQuestionIds(input: { question_ids?: string[]; layout?: ExamSection[] | null }): string[] | undefined {
  return input.layout ? layoutQuestionIds(input.layout) : input.question_ids;
}

const KIND_LABEL: Record<ExamSection['kind'], Message> = {
  mc: { vi: 'trắc nghiệm nhiều lựa chọn', en: 'multiple choice' },
  truefalse: { vi: 'trắc nghiệm đúng sai', en: 'true or false' },
  short: { vi: 'trả lời ngắn', en: 'short answer' },
};

/**
 * What stops a layout from being submitted or published: a section with no question, or a question
 * whose type is not its section's kind. `rows` are the questions as read from the bank.
 */
export function layoutReviewProblem(layout: ExamSection[], rows: Array<{ id: string; type: string }>): Message | null {
  const typeOf = new Map(rows.map((row) => [row.id, row.type]));
  let n = 0;
  for (const section of layout) {
    const ids = section.groups.flatMap((g) => g.question_ids);
    if (ids.length === 0) {
      return {
        vi: `Phần "${section.title.vi}" cần ít nhất một câu hỏi.`,
        en: `Section "${section.title.en}" needs at least one question.`,
      };
    }
    for (const id of ids) {
      n += 1;
      const type = typeOf.get(id);
      if (type !== undefined && type !== section.kind) {
        const label = KIND_LABEL[section.kind];
        return {
          vi: `Câu ${n}: phần "${section.title.vi}" chỉ nhận câu ${label.vi}.`,
          en: `Question ${n}: section "${section.title.en}" only takes ${label.en} questions.`,
        };
      }
    }
  }
  return null;
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
