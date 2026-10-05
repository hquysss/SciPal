import { buildLayout, layoutQuestionIds } from '@scipal/types';
import type { ExamFormat, ExamSection, QuestionType, SectionKind, TemplateKey } from '@scipal/types';

type Bilingual = { en: string; vi: string };

// ── Sectioned exams (THPTQG, ĐGNL) ───────────────────────────────────────────

/**
 * Lay the questions of `existing` out on a template. A question goes to the first section of its
 * kind that still has room (up to its `count`); the rest, and any question of unknown kind, come
 * back in `unassigned` so the author can place them by hand.
 */
export function applyTemplate(
  key: TemplateKey,
  existing: ExamSection[] | null,
  questionKinds: Record<string, SectionKind>,
): { layout: ExamSection[]; unassigned: string[] } {
  const layout = buildLayout(key);
  const unassigned: string[] = [];
  const seen = new Set<string>();
  for (const id of existing ? layoutQuestionIds(existing) : []) {
    if (seen.has(id)) continue;
    seen.add(id);
    const kind = questionKinds[id];
    const target = kind ? layout.find((s) => s.kind === kind && layoutQuestionIds([s]).length < s.count) : undefined;
    if (target) target.groups[0]!.question_ids.push(id);
    else unassigned.push(id);
  }
  return { layout, unassigned };
}

/** Sections whose question count differs from the template's, including sections with none. */
export function sectionProblems(layout: ExamSection[]): Array<{ key: string; message: Bilingual }> {
  const problems: Array<{ key: string; message: Bilingual }> = [];
  for (const s of layout) {
    const n = layoutQuestionIds([s]).length;
    if (n === 0) {
      problems.push({ key: s.key, message: { vi: `${s.title.vi} chưa có câu hỏi.`, en: `${s.title.en} has no questions.` } });
    } else if (n !== s.count) {
      problems.push({
        key: s.key,
        message: {
          vi: `${s.title.vi} có ${n} câu, cần ${s.count} câu.`,
          en: `${s.title.en} has ${n} questions, expected ${s.count}.`,
        },
      });
    }
  }
  return problems;
}

function mapGroup(layout: ExamSection[], sectionKey: string, groupIndex: number, edit: (g: ExamSection['groups'][number]) => ExamSection['groups'][number]): ExamSection[] {
  const target = layout.find((s) => s.key === sectionKey);
  if (!target || groupIndex < 0 || groupIndex >= target.groups.length) return layout;
  return layout.map((s) => (s === target ? { ...s, groups: s.groups.map((g, i) => (i === groupIndex ? edit(g) : g)) } : s));
}

/** Append questions to a group; an id already anywhere in the layout is skipped. */
export function addToSection(layout: ExamSection[], sectionKey: string, groupIndex: number, ids: string[]): ExamSection[] {
  const taken = new Set(layoutQuestionIds(layout));
  const fresh: string[] = [];
  for (const id of ids) {
    if (taken.has(id)) continue;
    taken.add(id);
    fresh.push(id);
  }
  if (fresh.length === 0) return layout;
  return mapGroup(layout, sectionKey, groupIndex, (g) => ({ ...g, question_ids: [...g.question_ids, ...fresh] }));
}

/** Take a question out of every group. Groups stay, so each section keeps at least one. */
export function removeFromLayout(layout: ExamSection[], id: string): ExamSection[] {
  return layout.map((s) => ({ ...s, groups: s.groups.map((g) => ({ ...g, question_ids: g.question_ids.filter((x) => x !== id) })) }));
}

/** Set a group's shared passage; `undefined` removes it. */
export function setPassage(layout: ExamSection[], sectionKey: string, groupIndex: number, passage: Bilingual | undefined): ExamSection[] {
  return mapGroup(layout, sectionKey, groupIndex, (g) => {
    const { passage: _old, ...rest } = g;
    return passage ? { ...rest, passage } : rest;
  });
}

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
  draft: {
    name: string;
    name_en: string;
    duration_minutes: number;
    question_ids: string[];
    format?: ExamFormat;
    layout?: ExamSection[] | null;
    unassigned?: string[];
  },
  forReview: boolean,
): Bilingual | null {
  if (!draft.name.trim()) return { vi: 'Cần tên đề tiếng Việt.', en: 'The exam needs a Vietnamese name.' };
  if (!Number.isInteger(draft.duration_minutes) || draft.duration_minutes < 5 || draft.duration_minutes > 300) {
    return { vi: 'Thời gian làm bài từ 5 đến 300 phút.', en: 'The duration must be 5–300 minutes.' };
  }
  if (!forReview) return null;
  if (draft.format && draft.format !== 'generic') {
    // A sectioned exam keeps its questions in the layout; the flat list is derived from it.
    const leftover = draft.unassigned?.length ?? 0;
    if (leftover > 0) {
      return {
        vi: `Còn ${leftover} câu chưa xếp vào phần nào. Bạn hãy xếp hoặc bỏ các câu đó.`,
        en: `${leftover} question${leftover === 1 ? ' is' : 's are'} not in any section. Place or remove them.`,
      };
    }
    const sections = draft.layout ?? [];
    if (sections.length === 0) return { vi: 'Đề cần ít nhất một phần.', en: 'An exam needs at least one section.' };
    const empty = sections.find((s) => layoutQuestionIds([s]).length === 0);
    if (empty) return { vi: `${empty.title.vi} chưa có câu hỏi.`, en: `${empty.title.en} has no questions.` };
  } else if (draft.question_ids.length === 0) {
    return { vi: 'Đề cần ít nhất một câu hỏi.', en: 'An exam needs at least one question.' };
  }
  if (!draft.name_en.trim()) return { vi: 'Cần tên đề tiếng Anh trước khi gửi duyệt hoặc xuất bản.', en: 'The exam needs an English name before review or publishing.' };
  return null;
}
