import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ createBrowserClient: vi.fn() }));

import { difficultyKey, isAnswered, timerTone, toSubmission, type ExamQuestionItem } from './ExamRunner';

describe('timerTone', () => {
  it('is normal above five minutes', () => {
    expect(timerTone(301)).toBe('normal');
    expect(timerTone(45 * 60)).toBe('normal');
  });

  it('warns from five minutes down to 61 seconds', () => {
    expect(timerTone(300)).toBe('warning');
    expect(timerTone(61)).toBe('warning');
  });

  it('is urgent in the last minute', () => {
    expect(timerTone(60)).toBe('danger');
    expect(timerTone(0)).toBe('danger');
    expect(timerTone(-5)).toBe('danger');
  });
});

const stem = { en: 'Q', vi: 'Câu' };
const questions: ExamQuestionItem[] = [
  { id: 'mc1', type: 'mc', data: { stem, options: [{ id: 'A', text: stem }] } },
  { id: 'tf1', type: 'truefalse', data: { stem, items: [{ id: 'a', text: stem }, { id: 'b', text: stem }] } },
  { id: 'sh1', type: 'short', data: { stem } },
  { id: 'mc2', type: 'mc', data: { stem } },
];

describe('toSubmission', () => {
  it('sends each question type in the shape the scorer reads, skipping blanks', () => {
    expect(toSubmission(questions, {
      0: { option: 'A' },
      1: { items: { a: true, b: false } },
      2: { text: '  42 ' },
      3: { text: '   ' },
    })).toEqual([
      { question_id: 'mc1', selected_option: 'A' },
      { question_id: 'tf1', items: [{ id: 'a', selected: true }, { id: 'b', selected: false }] },
      { question_id: 'sh1', short_answer: '42' },
    ]);
  });

  it('counts a question answered once anything is entered', () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered({ text: ' ' })).toBe(false);
    expect(isAnswered({ items: { a: false } })).toBe(true);
  });
});

describe('difficultyKey', () => {
  it('reads the numeric difficulty the API sends', () => {
    expect([1, 2, 3, undefined, 'hard'].map((d) => difficultyKey(d as ExamQuestionItem['difficulty']))).toEqual([
      'easy', 'medium', 'hard', 'medium', 'hard',
    ]);
  });
});
