import { describe, expect, it } from 'vitest';
import { estimateTokens, groupDigits, sumTokens, TUTOR_HOLD_TOKENS, tokensUsed } from '../tutor/tokens.js';

describe('tutor token counting', () => {
  it('holds as many tokens as one old "request" was worth', () => {
    expect(TUTOR_HOLD_TOKENS).toBe(3000);
  });

  it('counts what the provider reported, and estimates from the text only when it reported nothing', () => {
    expect(tokensUsed(1500, 'x'.repeat(9000), 'y'.repeat(9000))).toBe(1500);
    expect(tokensUsed(undefined, 'a'.repeat(300), 'b'.repeat(90))).toBe(estimateTokens('a'.repeat(300)) + estimateTokens('b'.repeat(90)));
    expect(tokensUsed(undefined, 'a'.repeat(300), 'b'.repeat(90))).toBe(130);
    for (const bad of [0, -5, 2.5, Number.NaN]) expect(tokensUsed(bad, 'abc', 'defgh')).toBe(3);
  });

  it('never estimates a call at zero tokens', () => {
    expect(estimateTokens('a')).toBe(1);
    expect(tokensUsed(undefined, 'q', 'a')).toBeGreaterThan(0);
  });

  it('adds up the stored tokens of a day and ignores rows that carry none', () => {
    expect(sumTokens([{ tokens: 1200 }, { tokens: 800 }, { tokens: null }, {}, { tokens: -4 }, { tokens: 1.5 }, { tokens: '9' }, null])).toBe(2000);
    expect(sumTokens(null)).toBe(0);
    expect(sumTokens('nope')).toBe(0);
  });

  it('groups digits the way each language writes them', () => {
    expect(groupDigits(90000, '.')).toBe('90.000');
    expect(groupDigits(1234567, ',')).toBe('1,234,567');
    expect(groupDigits(999, '.')).toBe('999');
    expect(groupDigits(0, ',')).toBe('0');
  });
});
