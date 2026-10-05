import { z } from 'zod';

// Exam format contract shared by the web app and the API. Keep backend/src/schemas/examFormat.ts
// byte-identical (the backend deploys with backend/ as its root and cannot import this package);
// a backend test compares the two files.

type Message = { vi: string; en: string };

export const EXAM_FORMATS = ['generic', 'thptqg', 'dgnl_hcm'] as const;
export type ExamFormat = (typeof EXAM_FORMATS)[number];

export type SectionKind = 'mc' | 'truefalse' | 'short';

export interface ExamGroup {
  passage?: Message;
  question_ids: string[];
}

export interface ExamSection {
  key: string;
  title: Message;
  kind: SectionKind;
  count: number;
  max_points: number;
  groups: ExamGroup[];
}

export type TemplateKey =
  | 'thptqg:math'
  | 'thptqg:science'
  | 'thptqg:social'
  | 'thptqg:informatics'
  | 'thptqg:foreign'
  | 'dgnl_hcm';

export interface ExamTemplate {
  format: ExamFormat;
  label: Message;
  duration_minutes: number;
  sections: Array<Omit<ExamSection, 'groups'>>;
}

export const MAX_LAYOUT_SECTIONS = 8;
export const MAX_PASSAGE_TEXT = 4000;
const MAX_SECTION_TITLE = 200;
const MAX_SECTION_KEY = 40;
const MAX_GROUPS_PER_SECTION = 100;
const MAX_QUESTIONS_PER_GROUP = 200;
const MAX_SECTION_COUNT = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Templates ────────────────────────────────────────────────────────────────

const MC_TITLE: Message = { vi: 'Phần I. Trắc nghiệm nhiều lựa chọn', en: 'Part I. Multiple choice' };
const TF_TITLE: Message = { vi: 'Phần II. Trắc nghiệm đúng sai', en: 'Part II. True or false' };
const SHORT_TITLE: Message = { vi: 'Phần III. Trắc nghiệm trả lời ngắn', en: 'Part III. Short answer' };

const mc = (count: number, max_points: number) => ({ key: 'mc', title: MC_TITLE, kind: 'mc' as const, count, max_points });
const truefalse = (count: number, max_points: number) => ({ key: 'truefalse', title: TF_TITLE, kind: 'truefalse' as const, count, max_points });
const short = (count: number, max_points: number) => ({ key: 'short', title: SHORT_TITLE, kind: 'short' as const, count, max_points });

const dgnlSection = (key: string, title: Message) => ({ key, title, kind: 'mc' as const, count: 30, max_points: 300 });

/** Official THPTQG structure (QĐ 764/QĐ-BGDĐT, 08/03/2024) and the ĐGNL ĐHQG-HCM structure. */
export const EXAM_TEMPLATES: Record<TemplateKey, ExamTemplate> = {
  'thptqg:math': {
    format: 'thptqg',
    label: { vi: 'THPTQG: Toán', en: 'THPTQG: Mathematics' },
    duration_minutes: 90,
    sections: [mc(12, 3), truefalse(4, 4), short(6, 3)],
  },
  'thptqg:science': {
    format: 'thptqg',
    label: { vi: 'THPTQG: Vật lí, Hóa học, Sinh học, Địa lí', en: 'THPTQG: Physics, Chemistry, Biology, Geography' },
    duration_minutes: 50,
    sections: [mc(18, 4.5), truefalse(4, 4), short(6, 1.5)],
  },
  'thptqg:social': {
    format: 'thptqg',
    label: { vi: 'THPTQG: Lịch sử, GDKT&PL, Công nghệ', en: 'THPTQG: History, Economics and Law, Technology' },
    duration_minutes: 50,
    sections: [mc(24, 6), truefalse(4, 4)],
  },
  'thptqg:informatics': {
    format: 'thptqg',
    label: { vi: 'THPTQG: Tin học', en: 'THPTQG: Informatics' },
    duration_minutes: 50,
    sections: [mc(24, 6), truefalse(4, 4)],
  },
  'thptqg:foreign': {
    format: 'thptqg',
    label: { vi: 'THPTQG: Ngoại ngữ', en: 'THPTQG: Foreign language' },
    duration_minutes: 50,
    sections: [mc(40, 10)],
  },
  dgnl_hcm: {
    format: 'dgnl_hcm',
    label: { vi: 'Đánh giá năng lực ĐHQG-HCM', en: 'VNU-HCM Competency Assessment' },
    duration_minutes: 150,
    sections: [
      dgnlSection('vi', { vi: 'Tiếng Việt', en: 'Vietnamese' }),
      dgnlSection('en', { vi: 'Tiếng Anh', en: 'English' }),
      dgnlSection('math', { vi: 'Toán học', en: 'Mathematics' }),
      dgnlSection('science', { vi: 'Tư duy khoa học', en: 'Scientific thinking' }),
    ],
  },
};

/** The template's sections, each with one empty group ready for questions. */
export function buildLayout(key: TemplateKey): ExamSection[] {
  return EXAM_TEMPLATES[key].sections.map((s) => ({
    ...s,
    title: { ...s.title },
    groups: [{ question_ids: [] }],
  }));
}

/** Every question id in the layout, in section then group order. */
export function layoutQuestionIds(layout: ExamSection[]): string[] {
  return layout.flatMap((s) => s.groups.flatMap((g) => g.question_ids));
}

// ── Validation ───────────────────────────────────────────────────────────────

const Bilingual = (max: number) => z.object({ vi: z.string().max(max), en: z.string().max(max) }).strict();

const GroupSchema = z
  .object({
    passage: Bilingual(MAX_PASSAGE_TEXT).optional(),
    question_ids: z.array(z.string().regex(UUID).transform((id) => id.toLowerCase())).max(MAX_QUESTIONS_PER_GROUP),
  })
  .strict();

const SectionSchema = z
  .object({
    key: z.string().min(1).max(MAX_SECTION_KEY),
    title: Bilingual(MAX_SECTION_TITLE),
    kind: z.enum(['mc', 'truefalse', 'short']),
    count: z.number().int().min(0).max(MAX_SECTION_COUNT),
    max_points: z.number().positive().max(10000),
    groups: z.array(GroupSchema).min(1).max(MAX_GROUPS_PER_SECTION),
  })
  .strict();

const LayoutSchema = z.array(SectionSchema).min(1).max(MAX_LAYOUT_SECTIONS);

const FIELD_NAMES: Record<string, Message> = {
  key: { vi: 'mã phần', en: 'section key' },
  title: { vi: 'tên phần', en: 'section title' },
  kind: { vi: 'dạng câu hỏi', en: 'question type' },
  count: { vi: 'số câu', en: 'question count' },
  max_points: { vi: 'điểm tối đa', en: 'maximum points' },
  passage: { vi: 'đoạn văn', en: 'passage' },
  question_ids: { vi: 'danh sách câu hỏi', en: 'question list' },
  groups: { vi: 'nhóm câu hỏi', en: 'question groups' },
};

function fieldName(path: ReadonlyArray<string | number>): Message {
  const key = [...path].reverse().find((p): p is string => typeof p === 'string' && p in FIELD_NAMES);
  return key ? FIELD_NAMES[key]! : { vi: 'cấu trúc đề', en: 'exam layout' };
}

/** Checks the sections and passage groups a teacher saves. Ids must be unique across the whole layout. */
export function validateLayout(
  value: unknown,
): { ok: true; value: ExamSection[] } | { ok: false; message: Message } {
  const parsed = LayoutSchema.safeParse(value);
  if (!parsed.success) {
    const name = fieldName(parsed.error.issues[0]!.path);
    return { ok: false, message: { vi: `Kiểm tra lại ${name.vi}.`, en: `Check the ${name.en}.` } };
  }
  const layout = parsed.data as ExamSection[];
  if (new Set(layout.map((s) => s.key)).size !== layout.length) {
    return { ok: false, message: { vi: 'Hai phần của đề trùng mã.', en: 'Two sections of the exam share a key.' } };
  }
  const ids = layoutQuestionIds(layout);
  if (new Set(ids).size !== ids.length) {
    return { ok: false, message: { vi: 'Một câu hỏi bị lặp trong đề.', en: 'A question is used more than once in the exam.' } };
  }
  return { ok: true, value: layout };
}
