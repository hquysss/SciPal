import { describe, expect, it } from 'vitest';
import { buildLayout, layoutQuestionIds, validateLayout, type ExamSection } from '@scipal/types';
import {
  addGroup, addQuestions, addToSection, applyTemplate, examBody, examProblem, examTotals, layoutHasGroupWork, moveInGroup, moveQuestion,
  placeQuestion, removeFromLayout, removeGroup, removeQuestion, sectionProblems, setPassage, swapQuestion, switchFormat, templateKeyOf,
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

describe('switchFormat', () => {
  const flat = { format: 'generic' as const, layout: null, question_ids: ['m1', 't1', 's1', 'x'] };

  it('lays a generic exam’s questions out on a template without losing any', () => {
    const out = switchFormat(flat, [], 'thptqg:social', { m1: 'mc', t1: 'truefalse', s1: 'short' });
    expect(out.format).toBe('thptqg');
    expect(out.duration_minutes).toBe(50);
    expect(idsOf(out.layout!, 'mc')).toEqual(['m1']);
    expect(idsOf(out.layout!, 'truefalse')).toEqual(['t1']);
    // No short section in this template, and x has no known kind.
    expect(out.unassigned).toEqual(['s1', 'x']);
    expect(out.question_ids).toEqual(['m1', 't1']);
  });

  it('carries the unassigned questions into the next template', () => {
    const first = switchFormat(flat, [], 'thptqg:social', { m1: 'mc', t1: 'truefalse', s1: 'short' });
    const next = switchFormat(first, first.unassigned, 'thptqg:math', { m1: 'mc', t1: 'truefalse', s1: 'short' });
    expect(idsOf(next.layout!, 'short')).toEqual(['s1']);
    expect(next.unassigned).toEqual(['x']);
    expect(next.duration_minutes).toBe(90);
  });

  it('flattens back to a generic list, unassigned questions included', () => {
    const laid = switchFormat(flat, [], 'thptqg:social', { m1: 'mc', t1: 'truefalse', s1: 'short' });
    const back = switchFormat(laid, laid.unassigned, 'generic', {});
    expect(back).toEqual({ format: 'generic', layout: null, question_ids: ['m1', 't1', 's1', 'x'], unassigned: [] });
  });
});

describe('templateKeyOf', () => {
  it('finds the template a layout was built from', () => {
    expect(templateKeyOf('generic', null)).toBe('generic');
    expect(templateKeyOf('thptqg', buildLayout('thptqg:science'))).toBe('thptqg:science');
    expect(templateKeyOf('thptqg', buildLayout('thptqg:foreign'))).toBe('thptqg:foreign');
    expect(templateKeyOf('dgnl_hcm', buildLayout('dgnl_hcm'))).toBe('dgnl_hcm');
    // Social sciences and informatics share a structure; the subject decides.
    expect(templateKeyOf('thptqg', buildLayout('thptqg:informatics'))).toBe('thptqg:social');
    expect(templateKeyOf('thptqg', buildLayout('thptqg:informatics'), 'informatics')).toBe('thptqg:informatics');
    // An edited count still maps to a template of the same format.
    const edited = buildLayout('thptqg:math');
    edited[0]!.count = 10;
    expect(templateKeyOf('thptqg', edited)).toMatch(/^thptqg:/);
  });

  it('treats a structured format without a layout as generic', () => {
    expect(templateKeyOf('thptqg', null)).toBe('generic');
  });
});

describe('group edits', () => {
  it('adds a group and never removes the last one', () => {
    const layout = buildLayout('thptqg:foreign');
    const two = addGroup(layout, 'mc');
    expect(section(two, 'mc').groups).toHaveLength(2);
    expect(removeGroup(layout, 'mc', 0)).toEqual(layout);
  });

  it('moves a removed group’s questions into the group before it', () => {
    let layout = addGroup(buildLayout('thptqg:foreign'), 'mc');
    layout = addToSection(layout, 'mc', 0, ['a']);
    layout = addToSection(layout, 'mc', 1, ['b', 'c']);
    layout = setPassage(layout, 'mc', 1, { vi: 'Đoạn', en: 'Passage' });
    const out = removeGroup(layout, 'mc', 1);
    expect(section(out, 'mc').groups).toEqual([{ question_ids: ['a', 'b', 'c'] }]);
    const first = removeGroup(layout, 'mc', 0);
    expect(section(first, 'mc').groups).toEqual([{ passage: { vi: 'Đoạn', en: 'Passage' }, question_ids: ['a', 'b', 'c'] }]);
  });

  it('moves a question inside its group', () => {
    const layout = addToSection(buildLayout('thptqg:foreign'), 'mc', 0, ['a', 'b', 'c']);
    expect(idsOf(moveInGroup(layout, 'mc', 0, 2, 0), 'mc')).toEqual(['c', 'a', 'b']);
    expect(moveInGroup(layout, 'mc', 0, 0, 9)).toEqual(layout);
  });

  it('knows when re-laying out would drop passages or groups', () => {
    const layout = buildLayout('thptqg:math');
    expect(layoutHasGroupWork(layout)).toBe(false);
    expect(layoutHasGroupWork(null)).toBe(false);
    expect(layoutHasGroupWork(addGroup(layout, 'mc'))).toBe(true);
    expect(layoutHasGroupWork(setPassage(layout, 'mc', 0, { vi: 'Đoạn', en: '' }))).toBe(true);
  });
});

describe('placeQuestion', () => {
  it('puts a question in the first section of its kind with room', () => {
    let layout = buildLayout('dgnl_hcm');
    layout = addToSection(layout, 'vi', 0, ids('m', 30));
    expect(idsOf(placeQuestion(layout, 'z', 'mc')!, 'en')).toEqual(['z']);
  });

  it('falls back to a full section of the kind, and refuses a kind no section takes', () => {
    const layout = addToSection(buildLayout('thptqg:foreign'), 'mc', 0, ids('m', 40));
    expect(idsOf(placeQuestion(layout, 'z', 'mc')!, 'mc')).toHaveLength(41);
    expect(placeQuestion(layout, 'z', 'short')).toBeNull();
  });
});

describe('examBody', () => {
  const base = { name: 'Đề', name_en: 'Exam', subject_id: 's', grade: 10, duration_minutes: 50 };

  it('sends a sectioned exam’s layout with the list derived from it', () => {
    const layout = addToSection(buildLayout('thptqg:social'), 'mc', 0, ['a', 'b']);
    const body = examBody({ ...base, question_ids: ['stale'], format: 'thptqg', layout }, 'generic');
    expect(body).toMatchObject({ format: 'thptqg', layout, question_ids: ['a', 'b'] });
  });

  it('leaves format and layout out of a generic exam that was always generic', () => {
    const body = examBody({ ...base, question_ids: ['a'], format: 'generic', layout: null }, 'generic');
    expect(body).toEqual({ ...base, question_ids: ['a'] });
  });

  it('clears the layout when a sectioned exam becomes generic', () => {
    const body = examBody({ ...base, question_ids: ['a'], format: 'generic', layout: null }, 'thptqg');
    expect(body).toEqual({ ...base, question_ids: ['a'], format: 'generic', layout: null });
  });
});
