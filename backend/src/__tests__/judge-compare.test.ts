import { describe, expect, it } from 'vitest';
import { outputsMatch } from '../judge/compare.js';

describe('outputsMatch', () => {
  it('ignores CRLF, trailing spaces and trailing blank lines', () => {
    expect(outputsMatch('1 2\r\n\r\n', '1 2')).toBe(true);
    expect(outputsMatch('a \nb', 'a\nb')).toBe(true);
    expect(outputsMatch('', '')).toBe(true);
  });
  it('keeps spaces inside a line and blank lines in the middle', () => {
    expect(outputsMatch('1  2', '1 2')).toBe(false);
    expect(outputsMatch('a\n\nb', 'a\nb')).toBe(false);
  });
  it('does not accept missing output', () => {
    expect(outputsMatch('', '4')).toBe(false);
  });
});
