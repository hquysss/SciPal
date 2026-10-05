import { describe, expect, it } from 'vitest';
import { examSections, layoutReviewProblem, resolveExamQuestionIds, validateExamInput } from '../schemas/exams.js';
import { buildLayout, type ExamSection } from '../schemas/examFormat.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const id = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const base = { name: 'Đề 1', name_en: '', subject_id: SUBJECT, grade: 10, duration_minutes: 45, question_ids: [] as string[] };

describe('validateExamInput', () => {
  it('accepts a new exam whose English name waits until submit', () => {
    const res = validateExamInput(base, 'create');
    expect(res).toEqual({ ok: true, value: { ...base, format: 'generic', layout: null } });
  });

  it('refuses out-of-range values, bad ids, duplicates and too many questions', () => {
    for (const patch of [
      { duration_minutes: 4 },
      { duration_minutes: 301 },
      { grade: 0 },
      { grade: 13 },
      { name: 'x'.repeat(201) },
      { name: '  ' },
      { question_ids: ['nope'] },
      { question_ids: Array.from({ length: 201 }, (_, i) => id(i)) },
    ]) {
      expect(validateExamInput({ ...base, ...patch }, 'create').ok, JSON.stringify(patch).slice(0, 40)).toBe(false);
    }
    const dup = validateExamInput({ ...base, question_ids: [id(1), id(1)] }, 'create');
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.message.vi).toMatch(/lặp/);
  });

  it('takes a partial update that carries the version it was made from', () => {
    expect(validateExamInput({ duration_minutes: 60, expected_updated_at: '2026-09-27T00:00:00Z' }, 'update')).toEqual({
      ok: true,
      value: { duration_minutes: 60, expected_updated_at: '2026-09-27T00:00:00Z' },
    });
    expect(validateExamInput({ duration_minutes: 60 }, 'update').ok).toBe(false);
    expect(validateExamInput({ subject_id: SUBJECT, expected_updated_at: 'x' }, 'update').ok).toBe(false);
  });
});

describe('examSections', () => {
  it('counts questions per type and difficulty in first-seen order', () => {
    expect(examSections([{ type: 'mc', difficulty: 1 }, { type: 'mc', difficulty: 1 }, { type: 'short', difficulty: 2 }])).toEqual([
      { type: 'mc', difficulty: 1, count: 2 },
      { type: 'short', difficulty: 2, count: 1 },
    ]);
  });
});

describe('exam format and layout', () => {
  const layoutWith = (ids: string[][]): ExamSection[] => {
    const layout = buildLayout('thptqg:math');
    ids.forEach((group, i) => { layout[i]!.groups[0]!.question_ids = group; });
    return layout;
  };

  it('accepts a structured exam with a layout', () => {
    const layout = layoutWith([[id(1)], [id(2)], [id(3)]]);
    const res = validateExamInput({ ...base, format: 'thptqg', layout }, 'create');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toMatchObject({ format: 'thptqg', layout });
  });

  it('refuses a layout that repeats a question', () => {
    const res = validateExamInput({ ...base, format: 'thptqg', layout: layoutWith([[id(1)], [id(1)], []]) }, 'create');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message.vi).toMatch(/lặp/);
  });

  it('keeps generic exams free of a layout and structured ones tied to one', () => {
    expect(validateExamInput({ ...base, format: 'generic', layout: buildLayout('thptqg:math') }, 'create').ok).toBe(false);
    expect(validateExamInput({ ...base, format: 'thptqg', layout: null }, 'create').ok).toBe(false);
    expect(validateExamInput({ ...base, format: 'thptqg' }, 'create').ok).toBe(false);
    expect(validateExamInput({ ...base, format: 'sat', layout: null }, 'create').ok).toBe(false);
  });

  it('checks a layout sent in an update too', () => {
    const when = '2026-09-27T00:00:00Z';
    expect(validateExamInput({ layout: buildLayout('dgnl_hcm'), format: 'dgnl_hcm', expected_updated_at: when }, 'update').ok).toBe(true);
    expect(validateExamInput({ layout: [], expected_updated_at: when }, 'update').ok).toBe(false);
    expect(validateExamInput({ format: 'generic', layout: buildLayout('dgnl_hcm'), expected_updated_at: when }, 'update').ok).toBe(false);
  });
});

describe('resolveExamQuestionIds', () => {
  it('takes the flattened layout and ignores a client question list', () => {
    const layout = buildLayout('thptqg:math');
    layout[0]!.groups[0]!.question_ids = [id(1), id(2)];
    layout[2]!.groups[0]!.question_ids = [id(3)];
    expect(resolveExamQuestionIds({ question_ids: [id(9)], layout })).toEqual([id(1), id(2), id(3)]);
  });

  it('keeps the list as sent without a layout, and leaves an unsent list alone', () => {
    expect(resolveExamQuestionIds({ question_ids: [id(4)], layout: null })).toEqual([id(4)]);
    expect(resolveExamQuestionIds({ question_ids: [id(4)] })).toEqual([id(4)]);
    expect(resolveExamQuestionIds({})).toBeUndefined();
  });
});

describe('layoutReviewProblem', () => {
  const rows = (types: Record<string, string>) => Object.entries(types).map(([qid, type]) => ({ id: qid, type }));

  it('passes a layout whose sections all have questions of the right type', () => {
    const layout = buildLayout('thptqg:social');
    layout[0]!.groups[0]!.question_ids = [id(1)];
    layout[1]!.groups[0]!.question_ids = [id(2)];
    expect(layoutReviewProblem(layout, rows({ [id(1)]: 'mc', [id(2)]: 'truefalse' }))).toBeNull();
  });

  it('names a section with no question, in both languages', () => {
    const layout = buildLayout('thptqg:social');
    layout[0]!.groups[0]!.question_ids = [id(1)];
    const problem = layoutReviewProblem(layout, rows({ [id(1)]: 'mc' }));
    expect(problem?.vi).toContain('Phần II');
    expect(problem?.en).toContain('Part II');
  });

  it('refuses a question whose type differs from its section', () => {
    const layout = buildLayout('thptqg:social');
    layout[0]!.groups[0]!.question_ids = [id(1)];
    layout[1]!.groups[0]!.question_ids = [id(2)];
    const problem = layoutReviewProblem(layout, rows({ [id(1)]: 'mc', [id(2)]: 'short' }));
    expect(problem?.vi).toMatch(/Câu 2/);
    expect(problem?.en).toMatch(/Question 2/);
  });
});
