import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ createBrowserClient: vi.fn() }));

import type { ExamSection } from '@scipal/types';
import {
  difficultyKey,
  isAnswered,
  normalizeResult,
  questionPlaces,
  scoreBand,
  sectionsForPalette,
  timerTone,
  toSubmission,
  type ExamQuestionItem,
} from './ExamRunner';

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

const PART_I = { vi: 'Phần I. Trắc nghiệm nhiều lựa chọn', en: 'Part I. Multiple choice' };
const PART_II = { vi: 'Phần II. Trắc nghiệm đúng sai', en: 'Part II. True or false' };
const PASSAGE = { vi: 'Đọc đoạn sau', en: 'Read the passage' };
const layout: ExamSection[] = [
  {
    key: 'mc', title: PART_I, kind: 'mc', count: 3, max_points: 3,
    groups: [
      { question_ids: ['a'] },
      { passage: PASSAGE, question_ids: ['b', 'gone', 'c'] },
    ],
  },
  { key: 'truefalse', title: PART_II, kind: 'truefalse', count: 1, max_points: 4, groups: [{ question_ids: ['d'] }] },
  { key: 'short', title: { vi: 'Phần III', en: 'Part III' }, kind: 'short', count: 2, max_points: 3, groups: [{ question_ids: [] }] },
];
// The server serves the layout flattened, dropping ids it could not load ('gone').
const served = ['a', 'b', 'c', 'd'].map((id) => ({ id }));

describe('questionPlaces', () => {
  it('places nothing for an exam without a layout', () => {
    expect(questionPlaces(null, served)).toEqual([null, null, null, null]);
    expect(questionPlaces(undefined, served)).toEqual([null, null, null, null]);
  });

  it('gives each question its section, and its group passage with the questions that share it', () => {
    const places = questionPlaces(layout, served);
    expect(places.map((p) => p?.section.key)).toEqual(['mc', 'mc', 'mc', 'truefalse']);
    expect(places.map((p) => p?.sectionStart)).toEqual([true, false, false, true]);
    expect(places[0]!.passage).toBeNull();
    expect(places[1]).toMatchObject({ passage: PASSAGE, group: { first: 1, last: 2 } });
    expect(places[2]).toMatchObject({ passage: PASSAGE, group: { first: 1, last: 2 } });
    expect(places[3]).toMatchObject({ section: { title: PART_II }, passage: null });
  });

  it('ignores an empty passage and leaves a question outside the layout unplaced', () => {
    const blank: ExamSection[] = [{ ...layout[1]!, groups: [{ passage: { vi: ' ', en: '' }, question_ids: ['d'] }] }];
    expect(questionPlaces(blank, [{ id: 'd' }, { id: 'stray' }])).toEqual([
      expect.objectContaining({ passage: null }),
      null,
    ]);
  });
});

describe('sectionsForPalette', () => {
  it('is absent for an exam without a layout', () => {
    expect(sectionsForPalette(null, served)).toBeUndefined();
    expect(sectionsForPalette([], served)).toBeUndefined();
  });

  it('groups question indexes by section and skips sections with no served question', () => {
    expect(sectionsForPalette(layout, served)).toEqual([
      { key: 'mc', title: PART_I, start: 0, count: 3 },
      { key: 'truefalse', title: PART_II, start: 3, count: 1 },
    ]);
  });

  it('keeps a question outside the layout in the grid', () => {
    expect(sectionsForPalette(layout, [...served, { id: 'stray' }])).toEqual([
      { key: 'mc', title: PART_I, start: 0, count: 3 },
      { key: 'truefalse', title: PART_II, start: 3, count: 1 },
      { key: 'other', title: { vi: 'Câu khác', en: 'Other questions' }, start: 4, count: 1 },
    ]);
  });
});

describe('normalizeResult', () => {
  const base = { score: 7.5, correct_count: 3, total_questions: 4, xp_earned: 45 };

  it('reads a result from an older server as out of 10 with no sections', () => {
    expect(normalizeResult(base)).toEqual({ ...base, max_score: 10, estimated: false, sections: [] });
  });

  it('keeps the maximum, the estimate flag and well-formed section scores', () => {
    const section = { key: 'vi', score: 250, max_score: 300, correct: 25, total: 30 };
    expect(normalizeResult({ ...base, score: 1000, max_score: 1200, estimated: true, sections: [section, { key: 'x' }] }))
      .toEqual({ ...base, score: 1000, max_score: 1200, estimated: true, sections: [section] });
  });

  it('rejects a response without a numeric score or XP', () => {
    expect(normalizeResult({ ...base, score: 'x' })).toBeNull();
    expect(normalizeResult({ ...base, xp_earned: undefined })).toBeNull();
    expect(normalizeResult(null)).toBeNull();
  });
});

describe('scoreBand', () => {
  it('bands by the share of the maximum, not by a 10-point scale', () => {
    expect(scoreBand(8, 10)).toBe('high');
    expect(scoreBand(7.5, 10)).toBe('medium');
    expect(scoreBand(4.9, 10)).toBe('low');
    expect(scoreBand(1000, 1200)).toBe('high');
    expect(scoreBand(9, 1200)).toBe('low');
    expect(scoreBand(0, 0)).toBe('low');
  });
});
