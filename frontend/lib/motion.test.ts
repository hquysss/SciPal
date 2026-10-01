import { describe, expect, it } from 'vitest';
import { DESKTOP_MOTION, REDUCED_MOTION, smoothScrollWanted } from './motion';

describe('smoothScrollWanted', () => {
  const matcher = (on: string[]) => (q: string) => on.includes(q);
  it('is on for a desktop with a mouse, off on phones and for reduced motion', () => {
    expect(smoothScrollWanted(matcher([DESKTOP_MOTION]))).toBe(true);
    expect(smoothScrollWanted(matcher([]))).toBe(false);
    expect(smoothScrollWanted(matcher([DESKTOP_MOTION, REDUCED_MOTION]))).toBe(false);
  });
});
