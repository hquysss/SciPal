import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MAX_QUESTION_TEXT,
  PracticeResponseSchema,
  questionIncomplete,
  storedQuestionData,
  toPublicPracticeQuestion,
  validateQuestionInput,
} from '../question';

// Tests run from packages/types; the backend reads the same file.
const fixtures = JSON.parse(
  readFileSync('src/__fixtures__/questions.json', 'utf8').replace(/"OVERSIZED"/g, JSON.stringify('x'.repeat(MAX_QUESTION_TEXT + 1))),
) as {
  inputs: Array<{ name: string; ok: boolean; complete?: boolean; input: unknown }>;
  public: Array<{ name: string; row: never; expected: unknown }>;
};

describe('validateQuestionInput', () => {
  it.each(fixtures.inputs.map((row) => [row.name, row] as const))('%s', (_name, row) => {
    const result = validateQuestionInput(row.input);
    expect(result.ok).toBe(row.ok);
    if (!result.ok) {
      expect(result.message.vi.length).toBeGreaterThan(0);
      expect(result.message.en.length).toBeGreaterThan(0);
    }
  });

  it.each(fixtures.inputs.filter((row) => row.ok).map((row) => [row.name, row] as const))('completeness of %s', (_name, row) => {
    const result = validateQuestionInput(row.input);
    if (!result.ok) throw new Error('fixture should be valid');
    expect(questionIncomplete(result.value) === null).toBe(row.complete);
  });

  it('drops unknown keys and a stale answer field from another type', () => {
    const result = validateQuestionInput({
      usage: 'practice',
      subject_id: '11111111-1111-4111-8111-111111111111',
      type: 'truefalse',
      difficulty: 1,
      status: 'published',
      created_by: 'someone',
      data: {
        stem: { vi: 'Câu?', en: 'Q?' },
        items: [{ id: '1', text: { vi: 'A', en: 'A' }, correct: true }],
        answer: 'a',
        options: [],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toHaveProperty('status');
    expect(result.value).not.toHaveProperty('created_by');
    expect(result.value.data).not.toHaveProperty('answer');
    expect(result.value.data).not.toHaveProperty('options');
  });

  it('names the question part that is missing English', () => {
    const result = validateQuestionInput(fixtures.inputs.find((row) => row.name === 'draft with English still missing')!.input);
    if (!result.ok) throw new Error('fixture should be valid');
    expect(questionIncomplete(result.value)?.vi).toMatch(/tiếng Anh/);
  });
});

describe('toPublicPracticeQuestion', () => {
  it.each(fixtures.public.map((row) => [row.name, row] as const))('keeps only learner-safe fields: %s', (_name, row) => {
    const shown = toPublicPracticeQuestion(row.row);
    expect(shown).toEqual(row.expected);
    expect(JSON.stringify(shown)).not.toMatch(/"(answer|answer_key|correct|explanation|rubric|hint|usage|status|created_by)"/);
  });
});

describe('PracticeResponseSchema', () => {
  it('accepts each answer shape and caps sizes', () => {
    expect(PracticeResponseSchema.safeParse({ selected_option: 'a' }).success).toBe(true);
    expect(PracticeResponseSchema.safeParse({ items: [{ id: '1', selected: true }] }).success).toBe(true);
    expect(PracticeResponseSchema.safeParse({ short_answer: 'Hà Nội' }).success).toBe(true);
    expect(PracticeResponseSchema.safeParse({ short_answer: 'x'.repeat(501) }).success).toBe(false);
    expect(PracticeResponseSchema.safeParse({ items: Array.from({ length: 11 }, (_, i) => ({ id: String(i), selected: true })) }).success).toBe(false);
  });
});

describe('storedQuestionData', () => {
  it('reads the short answer an Excel import stored as `answer`', () => {
    const stored = storedQuestionData('short', { stem: { vi: 'Câu?', en: 'Q?' }, answer: '42', rubric: { vi: 'R', en: 'R' } });
    expect(stored).toEqual({ stem: { vi: 'Câu?', en: 'Q?' }, answer_key: '42', rubric: { vi: 'R', en: 'R' } });
    const result = validateQuestionInput({ usage: 'practice', subject_id: '11111111-1111-4111-8111-111111111111', type: 'short', difficulty: 1, data: stored });
    expect(result.ok).toBe(true);
  });

  it('leaves other types and an existing key alone', () => {
    const mc = { stem: { vi: 'C', en: 'Q' }, options: [], answer: 'a' };
    expect(storedQuestionData('mc', mc)).toBe(mc);
    expect(storedQuestionData('short', { stem: { vi: 'C', en: 'Q' }, answer_key: 'k', answer: 'old' })).toEqual({ stem: { vi: 'C', en: 'Q' }, answer_key: 'k' });
  });
});
