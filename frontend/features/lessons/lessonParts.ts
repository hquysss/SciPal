import type { Block } from '@scipal/types';

export type LessonPart = 'lesson' | 'simulation' | 'practice';
export const LESSON_PARTS = ['lesson', 'simulation', 'practice'] as const satisfies readonly LessonPart[];

export const PART_LABEL: Record<LessonPart, { en: string; vi: string }> = {
  lesson: { en: 'Lesson', vi: 'Bài học' },
  simulation: { en: 'Simulations', vi: 'Mô phỏng' },
  practice: { en: 'Practice', vi: 'Tự luyện' },
};

/** The block type decides the part; lessons store one ordered array. */
export function partOfBlock(block: Block): LessonPart {
  if (block.type === 'interactive') return 'simulation';
  if (block.type === 'quiz') return 'practice';
  return 'lesson';
}

export function splitLessonParts(blocks: Block[]): Record<LessonPart, Block[]> {
  const parts: Record<LessonPart, Block[]> = { lesson: [], simulation: [], practice: [] };
  for (const block of blocks) parts[partOfBlock(block)].push(block);
  return parts;
}

export function joinLessonParts(parts: Record<LessonPart, Block[]>): Block[] {
  return LESSON_PARTS.flatMap((part) => parts[part]);
}
