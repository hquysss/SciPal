import { describe, expect, it } from 'vitest';
import { expandSelection } from './expandSelection';

const at = (text: string, part: string) => [text.indexOf(part), text.indexOf(part) + part.length] as const;

describe('expandSelection', () => {
  it('grows a selected syllable to the longest lesson term around it', () => {
    const text = 'Mỗi vòng lặp chạy một lần.';
    expect(expandSelection(text, ...at(text, 'vòng'), ['vòng lặp', 'lặp'])).toBe('vòng lặp');
    expect(expandSelection(text, ...at(text, 'lặp'), ['lặp', 'vòng lặp'])).toBe('vòng lặp');
  });

  it('matches English terms in any case and keeps the text as written', () => {
    const text = 'Use a For Loop here.';
    expect(expandSelection(text, ...at(text, 'Loop'), ['for loop'])).toBe('For Loop');
  });

  it('keeps the selection when no term covers it, or a term only touches part of a word', () => {
    const text = 'A sloop and a loop.';
    expect(expandSelection(text, ...at(text, 'sloop'), ['loop'])).toBe('sloop');
    expect(expandSelection('Một biến số.', 4, 8, ['vòng lặp'])).toBe('biến');
    const plural = 'the for loops run';
    expect(expandSelection(plural, plural.indexOf('loop'), plural.indexOf('loop') + 4, ['for loop'])).toBe('loop');
  });

  it('does not shrink a selection wider than the term', () => {
    const text = 'the for loop runs';
    expect(expandSelection(text, ...at(text, 'for loop runs'), ['loop'])).toBe('for loop runs');
  });
});
