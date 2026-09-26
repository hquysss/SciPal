import { describe, expect, it } from 'vitest';
import {
  LEVEL_SESSION_KEY,
  parseEducationLevel,
  readSessionEducationLevel,
  resolveEducationLevel,
  writeSessionEducationLevel,
} from './educationLevel';

function createSessionStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('education level preferences', () => {
  it('parses only the supported level values', () => {
    expect(parseEducationLevel('primary')).toBe('primary');
    expect(parseEducationLevel('lower_secondary')).toBe('lower_secondary');
    expect(parseEducationLevel('upper_secondary')).toBe('upper_secondary');
    expect(parseEducationLevel('thpt')).toBeNull();
    expect(parseEducationLevel(null)).toBeNull();
  });

  it('uses the account preference before a guest tab preference', () => {
    expect(resolveEducationLevel('upper_secondary', 'primary')).toEqual({
      level: 'upper_secondary',
      source: 'account',
    });
  });

  it('uses a tab preference only when there is no account preference', () => {
    expect(resolveEducationLevel(null, 'lower_secondary')).toEqual({
      level: 'lower_secondary',
      source: 'session',
    });
  });

  it('returns none when neither source has a valid preference', () => {
    expect(resolveEducationLevel(null, null)).toEqual({ level: null, source: 'none' });
    expect(LEVEL_SESSION_KEY).toBe('scipal_education_level_tab');
  });

  it('reads only a valid choice from session storage', () => {
    const storage = createSessionStorage();
    storage.setItem(LEVEL_SESSION_KEY, 'lower_secondary');
    expect(readSessionEducationLevel(storage)).toBe('lower_secondary');

    storage.setItem(LEVEL_SESSION_KEY, 'thpt');
    expect(readSessionEducationLevel(storage)).toBeNull();
  });

  it('writes a guest choice to session storage', () => {
    const storage = createSessionStorage();
    writeSessionEducationLevel(storage, 'primary');
    expect(storage.getItem(LEVEL_SESSION_KEY)).toBe('primary');
  });
});
