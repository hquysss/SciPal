import type { QuestionType } from '@scipal/types';

type Bilingual = { en: string; vi: string };

/** Append questions not yet in the exam, keeping the exam's order. */
export function addQuestions(ids: string[], added: string[]): string[] {
  const out = [...ids];
  for (const id of added) if (!out.includes(id)) out.push(id);
  return out;
}

export function moveQuestion(ids: string[], from: number, to: number): string[] {
  if (from < 0 || from >= ids.length || to < 0 || to >= ids.length) return ids;
  const out = [...ids];
  const [id] = out.splice(from, 1);
  out.splice(to, 0, id!);
  return out;
}

export const removeQuestion = (ids: string[], id: string) => ids.filter((x) => x !== id);

export const swapQuestion = (ids: string[], oldId: string, newId: string) => ids.map((x) => (x === oldId ? newId : x));

export function examTotals(rows: Array<{ type: string; difficulty: number }>) {
  const byType: Record<QuestionType, number> = { mc: 0, truefalse: 0, short: 0 };
  const byDifficulty: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  for (const row of rows) {
    if (row.type in byType) byType[row.type as QuestionType] += 1;
    if (row.difficulty in byDifficulty) byDifficulty[row.difficulty as 1 | 2 | 3] += 1;
  }
  return { byType, byDifficulty, total: rows.length };
}

/**
 * The body of a save. An older exam that draws from the subject pool (no stored list) keeps
 * drawing while the author has not added questions, so its empty list is not sent.
 */
export function examPatch<F extends { question_ids: string[] }>(form: F, saved: { question_ids: string[] }, expectedUpdatedAt: string) {
  const { question_ids, ...rest } = form;
  const keepPool = saved.question_ids.length === 0 && question_ids.length === 0;
  return { ...rest, ...(keepPool ? {} : { question_ids }), expected_updated_at: expectedUpdatedAt };
}

/** Why the exam cannot be saved (or, with `forReview`, submitted or published) yet; null when it can. */
export function examProblem(
  draft: { name: string; name_en: string; duration_minutes: number; question_ids: string[] },
  forReview: boolean,
): Bilingual | null {
  if (!draft.name.trim()) return { vi: 'Cần tên đề tiếng Việt.', en: 'The exam needs a Vietnamese name.' };
  if (!Number.isInteger(draft.duration_minutes) || draft.duration_minutes < 5 || draft.duration_minutes > 300) {
    return { vi: 'Thời gian làm bài từ 5 đến 300 phút.', en: 'The duration must be 5–300 minutes.' };
  }
  if (!forReview) return null;
  if (draft.question_ids.length === 0) return { vi: 'Đề cần ít nhất một câu hỏi.', en: 'An exam needs at least one question.' };
  if (!draft.name_en.trim()) return { vi: 'Cần tên đề tiếng Anh trước khi gửi duyệt hoặc xuất bản.', en: 'The exam needs an English name before review or publishing.' };
  return null;
}
