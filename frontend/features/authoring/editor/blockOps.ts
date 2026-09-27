import type { Block } from '@scipal/types';

export type LessonBlockType = 'theory' | 'code' | 'formula' | 'image' | 'term-ref' | 'resource-ref';

/**
 * A new block with no sample text. Images exist only after an upload, and term and resource
 * blocks after a pick, so those are null.
 */
export function emptyBlock(type: LessonBlockType): Block | null {
  switch (type) {
    case 'theory':
      return { type: 'theory', content: { vi: '', en: '' } };
    case 'code':
      return { type: 'code', tabs: [{ lang: 'python', code: '' }] };
    case 'formula':
      return { type: 'formula', katex: '', caption: { vi: '', en: '' } };
    default:
      return null;
  }
}

export function insertAt(list: Block[], index: number, block: Block): Block[] {
  return [...list.slice(0, index), block, ...list.slice(index)];
}

export function moveBlock(list: Block[], from: number, to: number): Block[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export function duplicateAt(list: Block[], index: number): Block[] {
  return insertAt(list, index + 1, structuredClone(list[index]!));
}

export function removeAt(list: Block[], index: number): { list: Block[]; removed: Block } {
  return { list: list.filter((_, i) => i !== index), removed: list[index]! };
}
