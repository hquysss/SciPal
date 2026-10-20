import { describe, expect, it } from 'vitest';
import { checkPracticeAnswer, responseProblem } from '../practiceGrading.js';
import { PRACTICE_XP } from '../progress.js';

const explanation = { vi: 'Vì 2 + 2 = 4.', en: 'Because 2 + 2 = 4.' };
const mc = { type: 'mc', data: { answer: 'b', explanation } };
const tf = { type: 'truefalse', data: { items: [{ id: '1', correct: true }, { id: '2', correct: false }] } };
const short = { type: 'short', data: { answer_key: 'Hà Nội' } };
const numeric = { type: 'short', data: { answer_key: '0.12' } };
const writing = { type: 'writing', data: { key_terms: ['loop', 'condition'], sample_answer: 'A loop repeats while a condition holds.' } };

describe('checkPracticeAnswer (shared by the server and the device)', () => {
  it('grades every question type', () => {
    expect(checkPracticeAnswer(mc, { selected_option: 'b' })).toEqual({ correct: true, explanation });
    expect(checkPracticeAnswer(mc, { selected_option: 'a' })).toEqual({ correct: false, explanation });
    expect(checkPracticeAnswer(tf, { items: [{ id: '1', selected: true }] })).toEqual({ correct: false, items: [{ id: '1', correct: true }, { id: '2', correct: false }] });
    expect(checkPracticeAnswer(short, { short_answer: '  hà   NỘI ' })).toEqual({ correct: true });
    expect(checkPracticeAnswer(numeric, { short_answer: '0,12' })).toEqual({ correct: true });
    expect(checkPracticeAnswer(writing, { writing_answer: 'A loop repeats.' })).toEqual({
      correct: false,
      writing: { used: ['loop'], missing: ['condition'], sample_answer: 'A loop repeats while a condition holds.' },
    });
  });

  it('refuses an answer of the wrong shape', () => {
    expect(responseProblem(mc, { short_answer: 'x' })).not.toBeNull();
    expect(responseProblem(tf, { items: [{ id: '9', selected: true }] })).not.toBeNull();
    expect(responseProblem(short, { short_answer: 'Huế' })).toBeNull();
  });
});

describe('PRACTICE_XP', () => {
  it('gives XP by difficulty', () => {
    expect(PRACTICE_XP).toEqual({ 1: 10, 2: 15, 3: 25 });
  });
});
