import { describe, expect, it } from 'vitest';
import { lessonQuestions } from './examples';

describe('lessonQuestions', () => {
  it('names the lesson in both languages, falling back to Vietnamese when there is no English title', () => {
    const [first] = lessonQuestions({ vi: 'Vòng lặp', en: 'Loops' });
    expect(first).toEqual({ vi: 'Giải thích «Vòng lặp» bằng một ví dụ đơn giản.', en: 'Explain “Loops” with a simple example.' });
    expect(lessonQuestions({ vi: 'Vòng lặp', en: '' })[0]!.en).toContain('Vòng lặp');
  });
});
