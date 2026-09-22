import { describe, it, expect } from 'vitest';
import { SUBJECT_TOKENS, getAccentColor } from '../tokens';

describe('SUBJECT_TOKENS', () => {
  it('has a token entry for every subject slug', () => {
    const slugs = ['informatics', 'math', 'physics', 'chemistry', 'biology'];
    for (const slug of slugs) {
      expect(SUBJECT_TOKENS[slug]).toBeDefined();
    }
  });

  it('all accent colors are valid hex', () => {
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    for (const token of Object.values(SUBJECT_TOKENS)) {
      expect(token.accentColor).toMatch(hexRe);
    }
  });

  it('getAccentColor returns brand green for unknown slug', () => {
    expect(getAccentColor('unknown')).toBe('#16a34a');
  });

  it('getAccentColor returns subject accent for known slug', () => {
    expect(getAccentColor('math')).toBe('#2563eb');
  });
});
