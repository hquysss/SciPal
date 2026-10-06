import { describe, expect, it } from 'vitest';
import type { Block } from '@scipal/types';
import { termIdsOf, termIdsOfBlocks } from './remarkTerm';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

describe('termIdsOf', () => {
  it('lists each tagged term once, in order of first appearance', () => {
    expect(termIdsOf(`Có {term:${ID_A}:thuật toán} và {term:${ID_B}:biến}, lại {term:${ID_A}:thuật toán}.`)).toEqual([ID_A, ID_B]);
  });

  it('ignores markers in inline code, fenced code and formulas', () => {
    const text = ['`{term:' + ID_A + ':x}`', '```', `{term:${ID_A}:x}`, '```', `$a {term:${ID_A}:x}$`, `$$\n{term:${ID_B}:y}\n$$`].join('\n');
    expect(termIdsOf(text)).toEqual([]);
  });

  it('ignores a malformed id and an empty display text', () => {
    expect(termIdsOf(`{term:abc:x} {term:${ID_A}:}`)).toEqual([]);
  });
});

describe('termIdsOfBlocks', () => {
  it('reads only theory blocks, in the chosen language', () => {
    const blocks: Block[] = [
      { type: 'theory', content: { vi: `{term:${ID_A}:a}`, en: `{term:${ID_B}:b}` } },
      { type: 'code', tabs: [{ lang: 'python', code: `# {term:${ID_B}:b}` }] },
      { type: 'theory', content: { vi: `{term:${ID_B}:b}`, en: '' } },
    ];
    expect(termIdsOfBlocks(blocks, 'vi')).toEqual([ID_A, ID_B]);
    expect(termIdsOfBlocks(blocks, 'en')).toEqual([ID_B]);
  });
});
