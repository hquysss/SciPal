import { describe, expect, it } from 'vitest';
import type { Block } from '@scipal/types';
import { autoTagBlocks, autoTagText, type TermIndexEntry } from './autoTerms';

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const INDEX: TermIndexEntry[] = [
  { id: ID(1), term_en: 'loop', term_vi: 'vòng lặp' },
  { id: ID(2), term_en: 'for loop', term_vi: 'vòng lặp for' },
  { id: ID(3), term_en: 'array', term_vi: 'mảng' },
  { id: ID(4), term_en: 'variable', term_vi: 'biến số' },
  { id: ID(5), term_en: 'if', term_vi: 'nếu' },
  { id: ID(6), term_en: 'C++', term_vi: 'ngôn ngữ C++' },
  { id: ID(7), term_en: 'SQL', term_vi: 'SQL' },
  { id: ID(8), term_en: 'Ion', term_vi: 'Cực' },
];
const tag = (n: number, text: string) => `{term:${ID(n)}:${text}}`;
const en = (text: string, seen = new Set<string>()) => autoTagText(text, INDEX, 'en', seen);
const vi = (text: string, seen = new Set<string>()) => autoTagText(text, INDEX, 'vi', seen);

describe('autoTagText', () => {
  it('tags the first use of a term, whole word, any case, as written', () => {
    expect(en('A Loop repeats; the loop ends.')).toBe(`A ${tag(1, 'Loop')} repeats; the loop ends.`);
    expect(en('A sloop and loopy code.')).toBe('A sloop and loopy code.');
  });

  it('also takes English plurals', () => {
    expect(en('Arrays hold values.')).toBe(`${tag(3, 'Arrays')} hold values.`);
  });

  it('the longest term wins', () => {
    expect(en('Use a for loop here.')).toBe(`Use a ${tag(2, 'for loop')} here.`);
    expect(vi('Dùng vòng lặp for ở đây.')).toBe(`Dùng ${tag(2, 'vòng lặp for')} ở đây.`);
  });

  it('reads Vietnamese terms from the Vietnamese text only', () => {
    expect(vi('Mỗi mảng có chỉ số.')).toBe(`Mỗi ${tag(3, 'mảng')} có chỉ số.`);
    expect(en('Mỗi mảng có chỉ số.')).toBe('Mỗi mảng có chỉ số.');
  });

  it('leaves short terms alone (under 4 letters, unless several words)', () => {
    expect(en('if it rains')).toBe('if it rains');
    expect(vi('nếu trời mưa')).toBe('nếu trời mưa');
  });

  it('takes short acronyms and symbol terms, in the case they are written', () => {
    expect(en('Write it in C++ today.')).toBe(`Write it in ${tag(6, 'C++')} today.`);
    expect(en('Query it with SQL, not sql.')).toBe(`Query it with ${tag(7, 'SQL')}, not sql.`);
  });

  it('a short word that is only capitalised is not an acronym', () => {
    expect(vi('Cực đại của đồ thị.')).toBe('Cực đại của đồ thị.');
    expect(en('An Ion moves.')).toBe('An Ion moves.');
  });

  it('keeps colour tags working: the term goes inside the colour', () => {
    expect(vi('- **{blue:Định nghĩa vòng lặp}:** là gì.')).toBe(`- **{blue:Định nghĩa ${tag(1, 'vòng lặp')}}:** là gì.`);
  });

  it('does not tag code, formulas, links, headings, tables, or existing tags', () => {
    const text = [
      '# The loop',
      '`loop` and $loop$ and [a loop](https://x.test/loop) and https://x.test/loop',
      '| loop | array |',
      '```',
      'loop',
      '```',
      `Own tag ${tag(3, 'array')} and {note:abcd:variable}.`,
    ].join('\n');
    expect(en(text)).toBe(text);
  });

  it('a term already tagged by hand is not tagged again later', () => {
    expect(en(`First ${tag(1, 'loop')}, then loop.`)).toBe(`First ${tag(1, 'loop')}, then loop.`);
  });

  it('shares what it has seen: one tag per term across calls', () => {
    const seen = new Set<string>();
    expect(en('A loop.', seen)).toBe(`A ${tag(1, 'loop')}.`);
    expect(en('Another loop.', seen)).toBe('Another loop.');
  });
});

describe('autoTagBlocks', () => {
  const theory = (e: string, v: string): Block => ({ type: 'theory', content: { en: e, vi: v } }) as Block;

  it('tags theory text in both languages, once per term through the lesson, and leaves other blocks', () => {
    const quiz = { type: 'quiz', question_id: 'q' } as unknown as Block;
    const out = autoTagBlocks([theory('A loop.', 'Một vòng lặp.'), quiz, theory('Loop again.', 'Lại vòng lặp.')], INDEX);
    expect((out[0] as any).content).toEqual({ en: `A ${tag(1, 'loop')}.`, vi: `Một ${tag(1, 'vòng lặp')}.` });
    expect((out[2] as any).content).toEqual({ en: 'Loop again.', vi: 'Lại vòng lặp.' });
    expect(out[1]).toBe(quiz);
  });

  it('returns the same blocks when there is nothing to tag', () => {
    const blocks = [theory('Nothing here.', 'Không có gì.')];
    expect(autoTagBlocks(blocks, INDEX)).toBe(blocks);
    expect(autoTagBlocks(blocks, [])).toBe(blocks);
  });
});
