import { describe, expect, it } from 'vitest';
import { isCorrectAnswer, scoreExam, trueFalseCredit } from '../examScoring.js';

const mc = { id: 'q1', type: 'mc', data: { answer: 'b' } };
const tf = { id: 'q2', type: 'truefalse', data: { items: [1, 2, 3, 4].map((n) => ({ id: `s${n}`, correct: n % 2 === 0 })) } };
const short = { id: 'q3', type: 'short', data: { answer_key: '0.12' } };

describe('exam scoring (shared by the server and the device)', () => {
  it('checks each answer against the key', () => {
    expect(isCorrectAnswer(mc, { question_id: 'q1', selected_option: 'b' })).toBe(true);
    expect(isCorrectAnswer(mc, { question_id: 'q1', selected_option: 'a' })).toBe(false);
    expect(isCorrectAnswer(short, { question_id: 'q3', short_answer: ' 0,12 ' })).toBe(true);
    expect(isCorrectAnswer(tf, { question_id: 'q2', items: [{ id: 's1', selected: false }] })).toBe(false);
  });

  it('follows the official true/false ladder', () => {
    expect([0, 1, 2, 3, 4].map((n) => trueFalseCredit(n, 4))).toEqual([0, 0.1, 0.25, 0.5, 1]);
  });

  it('scores a generic exam out of 10', () => {
    const scored = scoreExam({
      format: 'generic',
      layout: null,
      questions: [mc, tf, short],
      answers: new Map([
        ['q1', { question_id: 'q1', selected_option: 'b' }],
        ['q3', { question_id: 'q3', short_answer: '0,12' }],
      ]),
      isCorrect: isCorrectAnswer,
    });
    expect(scored).toMatchObject({ score: 6.67, max_score: 10, correct_count: 2, total_questions: 3, estimated: false });
  });
});
