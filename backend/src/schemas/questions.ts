import { z } from 'zod';

// Question contract shared by the web app and the API. Keep backend/src/schemas/questions.ts
// byte-identical (the backend deploys with backend/ as its root and cannot import this package);
// a backend test compares the two files and both run the fixtures in __fixtures__/questions.json.

const BilingualText = z.object({ en: z.string(), vi: z.string() });

// Stored shapes (seeded pool, Excel imports). Lenient: they describe what the database may hold.
export const MCDataSchema = z.object({
  stem: BilingualText,
  options: z.array(z.object({
    id: z.string(),
    text: BilingualText,
  })).min(2),
  answer: z.string(),
  explanation: BilingualText.optional(),
});

export const TrueFalseDataSchema = z.object({
  stem: BilingualText,
  items: z.array(z.object({
    id: z.string(),
    text: BilingualText,
    correct: z.boolean(),
  })).min(1),
  explanation: BilingualText.optional(),
});

export const ShortDataSchema = z.object({
  stem: BilingualText,
  answer_key: z.string(),   // server-side only; never sent to client
  rubric: BilingualText.optional(),
});

export type MCData        = z.infer<typeof MCDataSchema>;
export type TrueFalseData = z.infer<typeof TrueFalseDataSchema>;
export type ShortData     = z.infer<typeof ShortDataSchema>;

// ── Authoring ────────────────────────────────────────────────────────────────

export const QUESTION_USAGES = ['practice', 'exam'] as const;
export type QuestionUsage = (typeof QUESTION_USAGES)[number];
export const QUESTION_TYPES = ['mc', 'truefalse', 'short'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const QUESTION_STATUSES = ['draft', 'pending_review', 'published'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const MAX_QUESTION_TEXT = 2000;
export const MAX_CHOICE_TEXT = 500;
export const MAX_CHOICES = 10;
export const MAX_SHORT_ANSWER = 500;
const CHOICE_ID = /^[A-Za-z0-9_-]{1,20}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Message = { en: string; vi: string };

/** Vietnamese is required to save; English may wait until the question is sent for review. */
const Text = (max: number) =>
  z.object({ vi: z.string().trim().min(1).max(max), en: z.string().trim().max(max) });
const OptionalText = (max: number) => z.object({ vi: z.string().trim().max(max), en: z.string().trim().max(max) });
const Choice = z.object({ id: z.string().regex(CHOICE_ID), text: Text(MAX_CHOICE_TEXT) });

const McData = z.object({
  stem: Text(MAX_QUESTION_TEXT),
  options: z.array(Choice).min(2).max(MAX_CHOICES),
  answer: z.string(),
  explanation: OptionalText(MAX_QUESTION_TEXT).optional(),
});
const TrueFalseData = z.object({
  stem: Text(MAX_QUESTION_TEXT),
  items: z.array(Choice.extend({ correct: z.boolean() })).min(1).max(MAX_CHOICES),
  explanation: OptionalText(MAX_QUESTION_TEXT).optional(),
});
const ShortAnswerData = z.object({
  stem: Text(MAX_QUESTION_TEXT),
  answer_key: z.string().trim().min(1).max(MAX_SHORT_ANSWER),
  rubric: OptionalText(MAX_QUESTION_TEXT).optional(),
  explanation: OptionalText(MAX_QUESTION_TEXT).optional(),
});

const Base = {
  usage: z.enum(QUESTION_USAGES),
  subject_id: z.string().regex(UUID),
  lesson_id: z.string().regex(UUID).nullable().optional(),
  grade: z.number().int().min(1).max(12).nullable().optional(),
  difficulty: z.number().int().min(1).max(3),
};

const AuthorQuestionSchema = z.discriminatedUnion('type', [
  z.object({ ...Base, type: z.literal('mc'), data: McData }),
  z.object({ ...Base, type: z.literal('truefalse'), data: TrueFalseData }),
  z.object({ ...Base, type: z.literal('short'), data: ShortAnswerData }),
]);

export type AuthorQuestionInput = z.infer<typeof AuthorQuestionSchema>;
export type AuthorQuestionData = AuthorQuestionInput['data'];

const FIELD_NAMES: Record<string, Message> = {
  stem: { en: 'question text', vi: 'nội dung câu hỏi' },
  options: { en: 'options', vi: 'phương án' },
  items: { en: 'statements', vi: 'các ý' },
  answer: { en: 'answer', vi: 'đáp án' },
  answer_key: { en: 'answer', vi: 'đáp án' },
  explanation: { en: 'explanation', vi: 'lời giải thích' },
  rubric: { en: 'marking note', vi: 'hướng dẫn chấm' },
  usage: { en: 'question pool', vi: 'loại câu hỏi' },
  subject_id: { en: 'subject', vi: 'môn học' },
  lesson_id: { en: 'lesson', vi: 'bài học' },
  grade: { en: 'grade', vi: 'lớp' },
  difficulty: { en: 'difficulty', vi: 'mức độ' },
  type: { en: 'question type', vi: 'dạng câu hỏi' },
};

function fieldName(path: ReadonlyArray<string | number>): Message {
  const key = [...path].reverse().find((p): p is string => typeof p === 'string' && p in FIELD_NAMES);
  return key ? FIELD_NAMES[key]! : { en: 'question', vi: 'câu hỏi' };
}

/** Checks a question a teacher or admin saves. Unknown keys, and another type's answer fields, are dropped. */
export function validateQuestionInput(value: unknown): { ok: true; value: AuthorQuestionInput } | { ok: false; message: Message } {
  const parsed = AuthorQuestionSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    const name = fieldName(issue.path);
    return { ok: false, message: { en: `Check the ${name.en}.`, vi: `Kiểm tra lại ${name.vi}.` } };
  }
  const question = parsed.data;
  if (question.type === 'mc' || question.type === 'truefalse') {
    const choices = question.type === 'mc' ? question.data.options : question.data.items;
    if (new Set(choices.map((c) => c.id)).size !== choices.length) {
      return { ok: false, message: { en: 'Two choices share an ID.', vi: 'Có hai lựa chọn trùng mã.' } };
    }
  }
  if (question.type === 'mc' && !question.data.options.some((o) => o.id === question.data.answer)) {
    return { ok: false, message: { en: 'Pick the correct option.', vi: 'Hãy chọn phương án đúng.' } };
  }
  return { ok: true, value: question };
}

/**
 * Stored data as the authoring schema reads it. Excel imports store a short answer's key as
 * `answer` (exam scoring reads either); authoring uses `answer_key`.
 */
export function storedQuestionData(type: string, data: unknown): unknown {
  if (type !== 'short' || !data || typeof data !== 'object') return data;
  const { answer, ...rest } = data as Record<string, unknown>;
  if (typeof rest.answer_key === 'string') return rest;
  return typeof answer === 'string' ? { ...rest, answer_key: answer } : rest;
}

/** What still blocks review or publishing (English text), or null when the question is complete. */
export function questionIncomplete(question: Pick<AuthorQuestionInput, 'type' | 'data'>): Message | null {
  const missing = (text: { en: string; vi: string } | undefined) => text !== undefined && text.en.trim() === '';
  const halfWritten = (text: { en: string; vi: string } | undefined) =>
    text !== undefined && (text.vi.trim() === '') !== (text.en.trim() === '');
  const { data } = question;
  let part: Message | null = null;
  if (missing(data.stem)) part = FIELD_NAMES.stem!;
  else if ('options' in data && data.options.some((o) => missing(o.text))) part = FIELD_NAMES.options!;
  else if ('items' in data && data.items.some((i) => missing(i.text))) part = FIELD_NAMES.items!;
  else if (halfWritten(data.explanation)) part = FIELD_NAMES.explanation!;
  else if ('rubric' in data && halfWritten(data.rubric)) part = FIELD_NAMES.rubric!;
  if (!part) return null;
  return { en: `Add the English ${part.en}.`, vi: `Cần điền tiếng Anh cho ${part.vi}.` };
}

// ── Learner practice ─────────────────────────────────────────────────────────

export interface PublicPracticeQuestion {
  id: string;
  type: QuestionType;
  difficulty: number;
  data:
    | { stem: Message; options: Array<{ id: string; text: Message }> }
    | { stem: Message; items: Array<{ id: string; text: Message }> }
    | { stem: Message };
}

const text = (value: unknown): Message => {
  const v = (value ?? {}) as Partial<Message>;
  return { en: typeof v.en === 'string' ? v.en : '', vi: typeof v.vi === 'string' ? v.vi : '' };
};
const choices = (value: unknown) =>
  (Array.isArray(value) ? value : []).map((c: { id?: unknown; text?: unknown }) => ({ id: String(c?.id ?? ''), text: text(c?.text) }));

/** A stored question as learners may see it: built field by field, so no answer, key, rubric or explanation leaks. */
export function toPublicPracticeQuestion(row: { id: string; type: string; difficulty: number; data: unknown }): PublicPracticeQuestion {
  const data = (row.data ?? {}) as Record<string, unknown>;
  const stem = text(data.stem);
  const type = row.type as QuestionType;
  const shown =
    type === 'mc' ? { stem, options: choices(data.options) } : type === 'truefalse' ? { stem, items: choices(data.items) } : { stem };
  return { id: row.id, type, difficulty: row.difficulty, data: shown };
}

/** One learner answer: the option chosen, a true/false pick per statement, or a short text. */
export const PracticeResponseSchema = z
  .object({
    selected_option: z.string().max(20).optional(),
    items: z.array(z.object({ id: z.string().max(20), selected: z.boolean() })).max(MAX_CHOICES).optional(),
    short_answer: z.string().max(MAX_SHORT_ANSWER).optional(),
  })
  .strict();
export type PracticeResponse = z.infer<typeof PracticeResponseSchema>;

/** The server's verdict. It never carries the expected option, truth values or key. */
export interface PracticeCheckResult {
  correct: boolean;
  items?: Array<{ id: string; correct: boolean }>;
  explanation?: Message;
}
