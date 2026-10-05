import { buildLayout, EXAM_TEMPLATES, layoutQuestionIds } from '@scipal/types';
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

/** Move a question inside one group. */
export function moveInGroup(layout: ExamSection[], sectionKey: string, groupIndex: number, from: number, to: number): ExamSection[] {
  const group = layout.find((s) => s.key === sectionKey)?.groups[groupIndex];
  if (!group || from < 0 || from >= group.question_ids.length || to < 0 || to >= group.question_ids.length) return layout;
  return mapGroup(layout, sectionKey, groupIndex, (g) => ({ ...g, question_ids: moveQuestion(g.question_ids, from, to) }));
}

/** Append an empty group (for questions that share a passage) to a section. */
export function addGroup(layout: ExamSection[], sectionKey: string): ExamSection[] {
  return layout.map((s) => (s.key === sectionKey ? { ...s, groups: [...s.groups, { question_ids: [] }] } : s));
}

/**
 * Remove a group and its passage. Its questions join the group before it (the first group's join
 * the next one), so none is lost. The last group of a section is never removed.
 */
export function removeGroup(layout: ExamSection[], sectionKey: string, groupIndex: number): ExamSection[] {
  const target = layout.find((s) => s.key === sectionKey);
  if (!target || target.groups.length <= 1 || groupIndex < 0 || groupIndex >= target.groups.length) return layout;
  const moved = target.groups[groupIndex]!.question_ids;
  const into = groupIndex === 0 ? 1 : groupIndex - 1;
  const groups = target.groups
    .map((g, i) => (i !== into ? g : { ...g, question_ids: groupIndex === 0 ? [...moved, ...g.question_ids] : [...g.question_ids, ...moved] }))
    .filter((_, i) => i !== groupIndex);
  return layout.map((s) => (s === target ? { ...s, groups } : s));
}

/** True when re-laying out would lose work that applyTemplate does not keep: a passage or extra groups. */
export function layoutHasGroupWork(layout: ExamSection[] | null | undefined): boolean {
  return (layout ?? []).some((s) => s.groups.length > 1 || s.groups.some((g) => g.passage !== undefined));
}

/** Put a question in the first section of its kind that has room, else the first of its kind; null when no section takes it. */
export function placeQuestion(layout: ExamSection[], id: string, kind: SectionKind): ExamSection[] | null {
  const ofKind = layout.filter((s) => s.kind === kind);
  const target = ofKind.find((s) => layoutQuestionIds([s]).length < s.count) ?? ofKind[0];
  if (!target) return null;
  return addToSection(layout, target.key, target.groups.length - 1, [id]);
}

/**
 * The template an exam's layout matches, or `generic` for an exam without one. Two templates can
 * share a structure (THPTQG social and informatics); `hint` (the subject slug) breaks the tie.
 */
export function templateKeyOf(format: ExamFormat, layout: ExamSection[] | null, hint?: string): TemplateKey | 'generic' {
  if (format === 'generic' || !layout) return 'generic';
  const keys = (Object.keys(EXAM_TEMPLATES) as TemplateKey[]).filter((key) => EXAM_TEMPLATES[key].format === format);
  const shape = (sections: Array<{ key: string; count: number }>, withCount: boolean) => sections.map((s) => (withCount ? `${s.key}:${s.count}` : s.key)).join('|');
  for (const withCount of [true, false]) {
    const matches = keys.filter((key) => shape(EXAM_TEMPLATES[key].sections, withCount) === shape(layout, withCount));
    if (matches.length > 0) return matches.find((key) => hint && key.endsWith(`:${hint}`)) ?? matches[0]!;
  }
  return keys[0] ?? 'generic';
}

type FormatState = { format?: ExamFormat; layout?: ExamSection[] | null; question_ids: string[] };

/**
 * Change an exam's structure without losing questions. Every question the exam holds (laid out,
 * in its flat list, or still unassigned) is laid out again on the new template; the ones no
 * section takes come back in `unassigned`. Going back to `generic` flattens them into one list.
 */
export function switchFormat(
  current: FormatState,
  unassigned: string[],
  next: TemplateKey | 'generic',
  questionKinds: Record<string, SectionKind>,
):
  | { format: 'generic'; layout: null; question_ids: string[]; unassigned: string[] }
  | { format: ExamFormat; layout: ExamSection[]; question_ids: string[]; unassigned: string[]; duration_minutes: number } {
  const held = current.format && current.format !== 'generic' && current.layout ? layoutQuestionIds(current.layout) : current.question_ids;
  const ids = [...new Set([...held, ...unassigned])];
  if (next === 'generic') return { format: 'generic', layout: null, question_ids: ids, unassigned: [] };
  // applyTemplate only reads the ids of `existing`, so one holding section carries them all.
  const holding: ExamSection[] = [{ key: 'held', title: { vi: '', en: '' }, kind: 'mc', count: ids.length, max_points: 1, groups: [{ question_ids: ids }] }];
  const out = applyTemplate(next, holding, questionKinds);
  const template = EXAM_TEMPLATES[next];
  return { format: template.format, layout: out.layout, question_ids: layoutQuestionIds(out.layout), unassigned: out.unassigned, duration_minutes: template.duration_minutes };
}

/**
 * The body of a save. A sectioned exam sends its layout and the list flattened from it (the server
 * derives the list from the layout anyway). A generic exam that was always generic sends what it
 * did before formats existed; one that was sectioned clears its layout.
 */
export function examBody<F extends FormatState>(form: F, savedFormat: ExamFormat): Omit<F, 'format' | 'layout'> & { format?: ExamFormat; layout?: ExamSection[] | null } {
  const { format = 'generic', layout = null, ...rest } = form;
  if (format !== 'generic' && layout) return { ...rest, format, layout, question_ids: layoutQuestionIds(layout) };
  if (savedFormat === 'generic') return rest;
  return { ...rest, format: 'generic', layout: null };
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
