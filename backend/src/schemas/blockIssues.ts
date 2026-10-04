import type { z } from 'zod';
import { imageProblemsList, simulationProblemsList } from './blocks.js';

export type LessonPart = 'lesson' | 'practice';
export type BlockIssue = { part: LessonPart; index: number; field: string; vi: string; en: string };

const PART_OF = (type: unknown): LessonPart => (type === 'quiz' ? 'practice' : 'lesson');
const PART_NAME: Record<LessonPart, { vi: string; en: string }> = {
  lesson: { vi: 'Bài học', en: 'Lesson' },
  practice: { vi: 'Tự luyện', en: 'Practice' },
};

/** Same numbering as the editor's splitLessonParts: position within the block's part. */
export function partPositions(blocks: ReadonlyArray<{ type?: unknown }>) {
  const seen: Record<LessonPart, number> = { lesson: 0, practice: 0 };
  return blocks.map((b) => {
    const part = PART_OF(b?.type);
    return { part, index: seen[part]++ };
  });
}

const FIELD_NAME: Record<string, { vi: string; en: string }> = {
  'content.vi': { vi: 'nội dung tiếng Việt', en: 'Vietnamese text' },
  'content.en': { vi: 'nội dung tiếng Anh', en: 'English text' },
  katex: { vi: 'công thức', en: 'formula' },
  'caption.vi': { vi: 'chú thích tiếng Việt', en: 'Vietnamese caption' },
  'caption.en': { vi: 'chú thích tiếng Anh', en: 'English caption' },
  'alt.vi': { vi: 'mô tả ảnh tiếng Việt', en: 'Vietnamese image description' },
  'alt.en': { vi: 'mô tả ảnh tiếng Anh', en: 'English image description' },
  url: { vi: 'địa chỉ ảnh', en: 'image address' },
  'heading.vi': { vi: 'tiêu đề tiếng Việt', en: 'Vietnamese heading' },
  'heading.en': { vi: 'tiêu đề tiếng Anh', en: 'English heading' },
  config: { vi: 'thông số mô phỏng', en: 'simulation settings' },
  question_id: { vi: 'câu hỏi', en: 'question' },
  type: { vi: 'loại khối', en: 'block type' },
};
const fieldName = (field: string) => FIELD_NAME[field] ?? (field.startsWith('tabs') ? { vi: 'mã nguồn', en: 'code' } : { vi: field, en: field });

function issueAt(pos: { part: LessonPart; index: number }, field: string, problem: { vi: string; en: string }): BlockIssue {
  const name = fieldName(field);
  return {
    ...pos,
    field,
    vi: `${PART_NAME[pos.part].vi} · Khối ${pos.index + 1} · ${name.vi}: ${problem.vi}`,
    en: `${PART_NAME[pos.part].en} · Block ${pos.index + 1} · ${name.en}: ${problem.en}`,
  };
}

const PROBLEM = {
  missing: { vi: 'đang trống hoặc thiếu.', en: 'is empty or missing.' },
  wrongType: { vi: 'không đúng kiểu dữ liệu.', en: 'has the wrong kind of value.' },
  tooLong: { vi: 'quá dài.', en: 'is too long.' },
  unknownType: { vi: 'loại khối này không được hỗ trợ.', en: 'this block type is not supported.' },
  other: { vi: 'không hợp lệ.', en: 'is not valid.' },
};

function problemOf(issue: z.ZodIssue) {
  if (issue.code === 'invalid_type') return issue.received === 'undefined' ? PROBLEM.missing : PROBLEM.wrongType;
  if (issue.code === 'too_small') return PROBLEM.missing;
  if (issue.code === 'too_big') return PROBLEM.tooLong;
  return PROBLEM.other;
}

/** Zod failures of a blocks array as located issues, one per block and field. */
export function schemaIssues(raw: unknown, error: z.ZodError): BlockIssue[] {
  const blocks = Array.isArray(raw) ? (raw as Array<{ type?: unknown }>) : [];
  const positions = partPositions(blocks);
  const out = new Map<string, BlockIssue>();
  for (const issue of error.issues) {
    const [i, ...rest] = issue.path;
    if (typeof i !== 'number' || !positions[i]) continue;
    const unknownType = issue.code === 'invalid_union_discriminator';
    const field = unknownType ? 'type' : rest.join('.') || 'type';
    const key = `${i}:${field}`;
    if (!out.has(key)) out.set(key, issueAt(positions[i], field, unknownType ? PROBLEM.unknownType : problemOf(issue)));
  }
  return [...out.values()];
}

export function imageIssues(blocks: ReadonlyArray<{ type: string }>, opts: { requireAlt: boolean }): BlockIssue[] {
  const positions = partPositions(blocks);
  return imageProblemsList(blocks, opts).map((p) => issueAt(positions[p.at], p.field, p.message));
}

export function simulationIssues(blocks: ReadonlyArray<{ type: string }>): BlockIssue[] {
  const positions = partPositions(blocks);
  return simulationProblemsList(blocks).map((p) => issueAt(positions[p.at], p.field, p.message));
}

/** The 400 body for block problems: a summary naming the first, plus every issue. */
export function blockFailure(issues: BlockIssue[]) {
  const n = issues.length;
  return {
    error: `Có ${n} chỗ cần sửa: ${issues[0]?.vi ?? ''}`.trim(),
    error_en: `${n} thing${n === 1 ? '' : 's'} to fix: ${issues[0]?.en ?? ''}`.trim(),
    issues,
  };
}
