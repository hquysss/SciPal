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

describe('updatePart', () => {
  it('applies a late change (an upload finishing) on top of edits made meanwhile', async () => {
    const { updatePart } = await import('./lessonParts');
    const image: Block = { type: 'image', url: 'https://u/1.png', alt: { vi: '', en: '' } };
    const start = splitLessonParts([theory('a')]);
    // The upload started from block 0; the teacher then typed into it.
    const insertAfterFirst = (list: Block[]) => [...list.slice(0, 1), image, ...list.slice(1)];
    const edited = updatePart(start, 'lesson', (list) => list.map(() => theory('a và thêm chữ')));
    const done = updatePart(edited, 'lesson', insertAfterFirst);
    expect(done.lesson).toEqual([theory('a và thêm chữ'), image]);
    expect(done.simulation).toBe(start.simulation);
  });
});
