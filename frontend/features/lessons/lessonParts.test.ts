import { describe, expect, it } from 'vitest';
import type { Block } from '@scipal/types';
import { joinLessonParts, splitLessonParts } from './lessonParts';

const theory = (vi: string): Block => ({ type: 'theory', content: { vi, en: vi } });
const quiz: Block = { type: 'quiz', question_id: '11111111-1111-4111-8111-111111111111' };
const sim: Block = { type: 'interactive', kind: 'algorithm-sim', heading: { vi: 'S', en: 'S' }, offline: true, config: {} };

describe('splitLessonParts', () => {
  it('groups a mixed legacy lesson by type and keeps order within each part', () => {
    const parts = splitLessonParts([quiz, theory('a'), sim, theory('b')]);
    expect(parts.lesson).toEqual([theory('a'), theory('b')]);
    expect(parts.simulation).toEqual([sim]);
    expect(parts.practice).toEqual([quiz]);
  });

  it('writes blocks back part by part', () => {
    expect(joinLessonParts(splitLessonParts([quiz, theory('a'), sim]))).toEqual([theory('a'), sim, quiz]);
  });

  it('handles a lesson with only practice questions', () => {
    const parts = splitLessonParts([quiz]);
    expect(parts.lesson).toEqual([]);
    expect(parts.practice).toHaveLength(1);
  });
});
