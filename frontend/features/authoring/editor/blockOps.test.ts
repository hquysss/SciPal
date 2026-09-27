import { describe, expect, it } from 'vitest';
import type { Block } from '@scipal/types';
import { duplicateAt, emptyBlock, insertAt, moveBlock, removeAt } from './blockOps';

const t = (vi: string): Block => ({ type: 'theory', content: { vi, en: '' } });
const texts = (list: Block[]) => list.map((b) => (b.type === 'theory' ? b.content.vi : b.type));

describe('block operations', () => {
  it('start new blocks empty', () => {
    expect(emptyBlock('theory')).toEqual({ type: 'theory', content: { vi: '', en: '' } });
    expect(emptyBlock('code')).toEqual({ type: 'code', tabs: [{ lang: 'python', code: '' }] });
    expect(emptyBlock('formula')).toEqual({ type: 'formula', katex: '', caption: { vi: '', en: '' } });
    expect(emptyBlock('term-ref')).toBeNull();
  });

  it('insert, move, duplicate and remove without mutating', () => {
    const list = [t('a'), t('b'), t('c')];
    expect(texts(insertAt(list, 1, t('x')))).toEqual(['a', 'x', 'b', 'c']);
    expect(texts(moveBlock(list, 0, 2))).toEqual(['b', 'c', 'a']);
    expect(moveBlock(list, 0, 9)).toBe(list);
    const dup = duplicateAt(list, 1);
    expect(dup).toHaveLength(4);
    expect(dup[2]).toEqual(list[1]);
    expect(dup[2]).not.toBe(list[1]);
    expect(removeAt(list, 1)).toEqual({ list: [t('a'), t('c')], removed: t('b') });
    expect(list).toHaveLength(3);
  });
});
