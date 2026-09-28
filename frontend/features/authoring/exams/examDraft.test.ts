import { describe, expect, it } from 'vitest';
import { addQuestions, examProblem, examTotals, moveQuestion, removeQuestion, swapQuestion } from './examDraft';
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
