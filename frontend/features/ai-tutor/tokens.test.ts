import { describe, expect, it } from 'vitest';
import { formatTokens } from './tokens';

describe('formatTokens', () => {
  it('groups thousands the way each language writes them', () => {
    expect(formatTokens(90000, 'vi')).toBe('90.000');
    expect(formatTokens(1234567, 'en')).toBe('1,234,567');
    expect(formatTokens(999, 'vi')).toBe('999');
    expect(formatTokens(0, 'en')).toBe('0');
  });
  it('writes Vietnamese when the language is unknown', () => {
    expect(formatTokens(12345)).toBe('12.345');
  });
});
