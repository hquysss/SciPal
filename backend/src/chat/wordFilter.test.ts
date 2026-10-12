import { describe, expect, it } from 'vitest';
import { hasBannedWord } from './wordFilter.js';

describe('hasBannedWord', () => {
  it('catches banned words whatever the case or accents', () => {
    expect(hasBannedWord('Đụ má mày')).toBe(true);
    expect(hasBannedWord('FUCK you')).toBe(true);
    expect(hasBannedWord('đ.ụ má')).toBe(false); // known gap: punctuation tricks are for reports to catch
  });

  it('lets ordinary words through, including ones that collide once accents are dropped', () => {
    expect(hasBannedWord('bài học về lớn lên')).toBe(false);
    expect(hasBannedWord('Scunthorpe')).toBe(false);
    expect(hasBannedWord('Chào cả lớp')).toBe(false);
  });
});
