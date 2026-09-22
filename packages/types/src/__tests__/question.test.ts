import { describe, it, expect } from 'vitest';
import { MCDataSchema, TrueFalseDataSchema, ShortDataSchema } from '../question';

describe('MCDataSchema', () => {
  it('parses valid MC data', () => {
    const data = {
      stem: { en: 'What is 2+2?', vi: '2+2 bằng bao nhiêu?' },
      options: [
        { id: 'a', text: { en: '3', vi: '3' } },
        { id: 'b', text: { en: '4', vi: '4' } },
        { id: 'c', text: { en: '5', vi: '5' } },
        { id: 'd', text: { en: '6', vi: '6' } },
      ],
      answer: 'b',
    };
    expect(() => MCDataSchema.parse(data)).not.toThrow();
  });

  it('rejects MC with fewer than 2 options', () => {
    const data = {
      stem: { en: 'Q', vi: 'H' },
      options: [{ id: 'a', text: { en: 'A', vi: 'A' } }],
      answer: 'a',
    };
    expect(() => MCDataSchema.parse(data)).toThrow();
  });
});

describe('TrueFalseDataSchema', () => {
  it('parses valid true/false data with 4 items', () => {
    const data = {
      stem: { en: 'S', vi: 'S' },
      items: [
        { id: '1', text: { en: 'A', vi: 'A' }, correct: true },
        { id: '2', text: { en: 'B', vi: 'B' }, correct: false },
        { id: '3', text: { en: 'C', vi: 'C' }, correct: true },
        { id: '4', text: { en: 'D', vi: 'D' }, correct: false },
      ],
    };
    expect(() => TrueFalseDataSchema.parse(data)).not.toThrow();
  });
});

describe('ShortDataSchema', () => {
  it('parses valid short answer data', () => {
    const data = {
      stem: { en: 'Explain recursion', vi: 'Giải thích đệ quy' },
      answer_key: 'A function calling itself',
    };
    expect(() => ShortDataSchema.parse(data)).not.toThrow();
  });
});
