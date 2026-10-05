import { describe, expect, it } from 'vitest';
import { buildLayout, layoutQuestionIds, validateLayout, type ExamSection } from '@scipal/types';
import {
  addQuestions, addToSection, applyTemplate, examProblem, examTotals, moveQuestion, removeFromLayout, removeQuestion,
  sectionProblems, setPassage, swapQuestion,
} from './examDraft';
import { examPatch } from './examDraft';

describe('exam list helpers', () => {
  it('adds without duplicates, moves, removes and swaps in place', () => {
    expect(addQuestions(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
    expect(moveQuestion(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveQuestion(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(removeQuestion(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
    expect(swapQuestion(['a', 'b', 'c'], 'b', 'x')).toEqual(['a', 'x', 'c']);
  });

  it('counts questions by type and difficulty', () => {
    expect(examTotals([{ type: 'mc', difficulty: 1 }, { type: 'mc', difficulty: 3 }, { type: 'short', difficulty: 1 }])).toEqual({
      byType: { mc: 2, truefalse: 0, short: 1 },
      byDifficulty: { 1: 2, 2: 0, 3: 1 },
      total: 3,
    });
  });
});

describe('examProblem', () => {
  const draft = { name: 'Đề 1', name_en: 'Exam 1', duration_minutes: 45, question_ids: ['a'] };
  it('names what blocks a save or a submit', () => {
    expect(examProblem(draft, false)).toBeNull();
    expect(examProblem({ ...draft, name: ' ' }, false)?.vi).toMatch(/tên đề/i);
    expect(examProblem({ ...draft, duration_minutes: 4 }, false)?.vi).toMatch(/5 đến 300/);
    expect(examProblem({ ...draft, question_ids: [] }, false)).toBeNull();
    expect(examProblem({ ...draft, question_ids: [] }, true)?.vi).toBe('Đề cần ít nhất một câu hỏi.');
    expect(examProblem({ ...draft, name_en: '' }, true)?.vi).toMatch(/tiếng Anh/);
  });
});

describe('examPatch', () => {
  const form = { name: 'Đề', name_en: 'Exam', subject_id: 's', grade: 10, duration_minutes: 60, question_ids: [] as string[] };
  it('leaves the question list alone for an older exam that draws from the pool', () => {
    expect(examPatch(form, { question_ids: [] }, 't')).not.toHaveProperty('question_ids');
    expect(examPatch({ ...form, question_ids: ['a'] }, { question_ids: [] }, 't')).toMatchObject({ question_ids: ['a'] });
    expect(examPatch(form, { question_ids: ['a'] }, 't')).toMatchObject({ question_ids: [], expected_updated_at: 't' });
  });
});

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);
const kinds = (entries: Array<[string[], 'mc' | 'truefalse' | 'short']>) =>
  Object.fromEntries(entries.flatMap(([list, kind]) => list.map((id) => [id, kind] as const)));
const section = (layout: ExamSection[], key: string) => layout.find((s) => s.key === key)!;
const idsOf = (layout: ExamSection[], key: string) => layoutQuestionIds([section(layout, key)]);

describe('applyTemplate', () => {
  it('builds an empty layout from the template', () => {
    const { layout, unassigned } = applyTemplate('thptqg:math', null, {});
    expect(layout.map((s) => s.key)).toEqual(['mc', 'truefalse', 'short']);
    expect(unassigned).toEqual([]);
    expect(layoutQuestionIds(layout)).toEqual([]);
    expect(validateLayout(layout).ok).toBe(true);
  });

  it('keeps existing questions in the section of their kind, in order', () => {
    const mc = ids('m', 5);
    const short = ids('s', 2);
    const existing = buildLayout('thptqg:science');
    existing[0]!.groups[0]!.question_ids = [...mc, ...short];
    const { layout, unassigned } = applyTemplate('thptqg:math', existing, kinds([[mc, 'mc'], [short, 'short']]));
    expect(idsOf(layout, 'mc')).toEqual(mc);
    expect(idsOf(layout, 'short')).toEqual(short);
    expect(idsOf(layout, 'truefalse')).toEqual([]);
    expect(unassigned).toEqual([]);
  });

  it('puts a question no section takes into unassigned', () => {
    const existing = buildLayout('thptqg:math');
    existing[1]!.groups[0]!.question_ids = ['t1'];
    const { layout, unassigned } = applyTemplate('thptqg:foreign', existing, { t1: 'truefalse' });
    expect(unassigned).toEqual(['t1']);
    expect(layoutQuestionIds(layout)).toEqual([]);
  });

  it('sends questions beyond a section count, and of unknown kind, to unassigned', () => {
    const mc = ids('m', 14);
    const existing = buildLayout('thptqg:math');
    existing[0]!.groups[0]!.question_ids = [...mc, 'x'];
    const { layout, unassigned } = applyTemplate('thptqg:math', existing, kinds([[mc, 'mc']]));
    expect(idsOf(layout, 'mc')).toEqual(mc.slice(0, 12));
    expect(unassigned).toEqual(['m13', 'm14', 'x']);
  });

  it('fills several sections of the same kind in order', () => {
    const mc = ids('m', 31);
    const existing = buildLayout('dgnl_hcm');
    existing[0]!.groups[0]!.question_ids = mc;
    const { layout, unassigned } = applyTemplate('dgnl_hcm', existing, kinds([[mc, 'mc']]));
    expect(idsOf(layout, 'vi')).toEqual(mc.slice(0, 30));
    expect(idsOf(layout, 'en')).toEqual(['m31']);
    expect(unassigned).toEqual([]);
  });
});

describe('sectionProblems', () => {
  it('flags a short, an over-full and an empty section', () => {
    const layout = buildLayout('thptqg:math');
    layout[0]!.groups[0]!.question_ids = ids('m', 11);
    layout[2]!.groups[0]!.question_ids = ids('s', 7);
    const problems = sectionProblems(layout);
    expect(problems.map((p) => p.key)).toEqual(['mc', 'truefalse', 'short']);
    expect(problems[0]!.message.vi).toContain('11');
    expect(problems[0]!.message.vi).toContain('12');
    expect(problems[1]!.message.en).toMatch(/no questions/i);
    expect(problems[2]!.message.vi).toContain('7');
  });

  it('is quiet for a full layout', () => {
    const layout = buildLayout('thptqg:social');
    layout[0]!.groups[0]!.question_ids = ids('m', 24);
    layout[1]!.groups[0]!.question_ids = ids('t', 4);
    expect(sectionProblems(layout)).toEqual([]);
  });
});

describe('layout edits', () => {
  it('adds ids to a group without duplicating any id in the layout', () => {
    const layout = buildLayout('thptqg:math');
    const a = addToSection(layout, 'mc', 0, ['a', 'b', 'a']);
    expect(idsOf(a, 'mc')).toEqual(['a', 'b']);
    const b = addToSection(a, 'short', 0, ['b', 'c']);
    expect(layoutQuestionIds(b)).toEqual(['a', 'b', 'c']);
    expect(idsOf(layout, 'mc')).toEqual([]);
  });

  it('ignores an unknown section or group', () => {
    const layout = buildLayout('thptqg:math');
    expect(addToSection(layout, 'nope', 0, ['a'])).toEqual(layout);
    expect(addToSection(layout, 'mc', 3, ['a'])).toEqual(layout);
  });

  it('removes an id everywhere and keeps every group', () => {
    let layout = buildLayout('thptqg:math');
    layout = addToSection(layout, 'mc', 0, ['a', 'b']);
    const out = removeFromLayout(layout, 'a');
    expect(layoutQuestionIds(out)).toEqual(['b']);
    expect(out.every((s) => s.groups.length >= 1)).toBe(true);
    expect(layoutQuestionIds(layout)).toEqual(['a', 'b']);
  });

  it('sets and clears a group passage', () => {
    const layout = buildLayout('thptqg:foreign');
    const withPassage = setPassage(layout, 'mc', 0, { vi: 'Đoạn', en: 'Passage' });
    expect(section(withPassage, 'mc').groups[0]!.passage).toEqual({ vi: 'Đoạn', en: 'Passage' });
    expect(section(layout, 'mc').groups[0]!.passage).toBeUndefined();
    const cleared = setPassage(withPassage, 'mc', 0, undefined);
    expect('passage' in section(cleared, 'mc').groups[0]!).toBe(false);
    expect(setPassage(layout, 'mc', 9, { vi: 'x', en: 'x' })).toEqual(layout);
  });
});

describe('examProblem for a sectioned exam', () => {
  const full = buildLayout('thptqg:social');
  full[0]!.groups[0]!.question_ids = ids('m', 24);
  full[1]!.groups[0]!.question_ids = ids('t', 4);
  const draft = {
    name: 'Đề', name_en: 'Exam', duration_minutes: 50, question_ids: layoutQuestionIds(full),
    format: 'thptqg' as const, layout: full, unassigned: [] as string[],
  };

  it('passes a full layout and blocks leftovers or an empty section', () => {
    expect(examProblem(draft, true)).toBeNull();
    expect(examProblem({ ...draft, unassigned: ['z'] }, true)?.vi).toMatch(/chưa xếp/);
    expect(examProblem({ ...draft, unassigned: ['z'] }, false)).toBeNull();
    const empty = buildLayout('thptqg:social');
    empty[0]!.groups[0]!.question_ids = ids('m', 24);
    expect(examProblem({ ...draft, layout: empty, question_ids: ids('m', 24) }, true)?.vi).toMatch(/Phần II/);
  });

  it('does not use the flat list for a sectioned exam, but the English name still counts', () => {
    expect(examProblem({ ...draft, question_ids: [] }, true)).toBeNull();
    expect(examProblem({ ...draft, name_en: ' ' }, true)?.vi).toMatch(/tiếng Anh/);
  });

  it('keeps the generic rules when the format is generic', () => {
    expect(examProblem({ ...draft, format: 'generic', layout: null, question_ids: [] }, true)?.vi).toBe('Đề cần ít nhất một câu hỏi.');
  });
});
