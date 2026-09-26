import { BlockSchema, type Block } from '@scipal/types';
import { z, type ZodIssue } from 'zod';

export const MAX_LESSON_IMPORT_BYTES = 1_048_576;

type Bilingual = { en: string; vi: string };

export type LessonImportResult =
  | { ok: true; title_en?: string; title_vi?: string; blocks: Block[] }
  | { ok: false; error: Bilingual };

const title = z.string().trim().min(1).max(200);

const LessonImportSchema = z.object({
  title_en: title.optional(),
  title_vi: title.optional(),
  blocks: z.array(BlockSchema).min(1),
});

function formatPath(path: Array<string | number>): string {
  return path
    .map((part) => (typeof part === 'number' ? `[${part}]` : `.${part}`))
    .join('')
    .replace(/^\./, '');
}

function describeIssue(issue: ZodIssue): Bilingual {
  const path = formatPath(issue.path);
  if (path === 'blocks' && issue.code === 'too_small') {
    return { en: 'blocks: add at least one block', vi: 'blocks: cần ít nhất một khối' };
  }
  if (issue.code === 'invalid_type' && issue.received === 'undefined') {
    return { en: `${path}: required`, vi: `${path}: bắt buộc` };
  }
  if (issue.code === 'invalid_union_discriminator') {
    return { en: `${path}: unknown block type`, vi: `${path}: loại khối không hợp lệ` };
  }
  return { en: `${path}: invalid value`, vi: `${path}: giá trị không hợp lệ` };
}

export function parseLessonImport(text: string, sizeBytes: number): LessonImportResult {
  if (sizeBytes > MAX_LESSON_IMPORT_BYTES) {
    return { ok: false, error: { en: 'The file is larger than 1 MB.', vi: 'Tệp lớn hơn 1 MB.' } };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: { en: 'The file is not valid JSON.', vi: 'Tệp không phải JSON hợp lệ.' } };
  }

  const parsed = LessonImportSchema.safeParse(Array.isArray(raw) ? { blocks: raw } : raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first ? describeIssue(first) : { en: 'Invalid lesson file.', vi: 'Tệp bài học không hợp lệ.' },
    };
  }

  const { title_en, title_vi, blocks } = parsed.data;
  return {
    ok: true,
    ...(title_en !== undefined ? { title_en } : {}),
    ...(title_vi !== undefined ? { title_vi } : {}),
    blocks,
  };
}
