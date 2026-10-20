import { describe, expect, it } from 'vitest';
import { parseLocalTime } from './scheduledApi';

describe('parseLocalTime', () => {
  it('reads a datetime-local value, and nothing from empty or nonsense text', () => {
    expect(parseLocalTime('2026-10-20T08:30')?.getMinutes()).toBe(30);
    expect(parseLocalTime('')).toBeNull();
    expect(parseLocalTime('soon')).toBeNull();
  });
});
