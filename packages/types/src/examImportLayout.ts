import { z } from 'zod';
import { MAX_LAYOUT_SECTIONS, MAX_PASSAGE_TEXT, validateLayout, type ExamFormat, type ExamSection } from './examFormat.js';

// Keep backend/src/schemas/examImportLayout.ts identical: the API deploys from backend/.
const Text = (max: number) => z.object({ vi: z.string().trim().min(1).max(max), en: z.string().trim().max(max) }).strict();
const Key = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,79}$/);
export const ImportLayoutSchema = z.array(z.object({
  key: Key.pipe(z.string().max(40)),
  title: Text(200),
  kind: z.enum(['mc', 'truefalse', 'short']),
  count: z.number().int().min(1).max(200),
  max_points: z.number().positive().max(10000),
  groups: z.array(z.object({
    passage: Text(MAX_PASSAGE_TEXT).optional(),
    question_keys: z.array(Key).min(1).max(200),
  }).strict()).min(1).max(100),
}).strict()).min(1).max(MAX_LAYOUT_SECTIONS);

export type ImportLayout = z.infer<typeof ImportLayoutSchema>;
type ImportQuestionRef = { id: string; key: string; subject_slug: string; type: string };

export function resolveImportLayout(
  format: ExamFormat,
  layout: ImportLayout | null | undefined,
  questions: ImportQuestionRef[],
  subject: string,
): { ok: true; layout: ExamSection[] | null; ids: string[] } | { ok: false; error: string } {
  if (format === 'generic') return layout
    ? { ok: false, error: 'Đề thường không dùng cấu trúc phần thi. Chọn thptqg hoặc dgnl_hcm.' }
    : { ok: true, layout: null, ids: [] };
  if (!layout) return { ok: false, error: 'Đề THPTQG/ĐGNL cần phần thi và nhóm câu hỏi.' };
  const byKey = new Map(questions.filter((q) => q.subject_slug === subject).map((q) => [q.key, q]));
  const resolved: ExamSection[] = [];
  for (const section of layout) {
    const groups: ExamSection['groups'] = [];
    for (const group of section.groups) {
      const ids: string[] = [];
      for (const key of group.question_keys) {
        const question = byKey.get(key);
        if (!question) return { ok: false, error: `Phần ${section.key}: không có câu thi ${key} trong môn ${subject}.` };
        if (question.type !== section.kind) return { ok: false, error: `Phần ${section.key}: câu ${key} không thuộc dạng ${section.kind}.` };
        ids.push(question.id);
      }
      groups.push({ ...(group.passage ? { passage: group.passage } : {}), question_ids: ids });
    }
    const count = groups.reduce((n, g) => n + g.question_ids.length, 0);
    if (count !== section.count) return { ok: false, error: `Phần ${section.key}: khai báo ${section.count} câu nhưng nhóm câu có ${count}.` };
    resolved.push({ ...section, groups });
  }
  const checked = validateLayout(resolved);
  if (!checked.ok) return { ok: false, error: checked.message.vi };
  const ids = checked.value.flatMap((s) => s.groups.flatMap((g) => g.question_ids));
  if (ids.length > 200) return { ok: false, error: 'Một đề có tối đa 200 câu hỏi.' };
  const total = resolved.reduce((n, s) => n + s.max_points, 0);
  const expected = format === 'dgnl_hcm' ? 1200 : 10;
  if (Math.abs(total - expected) > 0.000001) return { ok: false, error: `Tổng điểm các phần phải bằng ${expected}.` };
  return { ok: true, layout: checked.value, ids };
}
