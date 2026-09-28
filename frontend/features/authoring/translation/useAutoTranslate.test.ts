import { afterEach, describe, expect, it } from 'vitest';
import { readAutoTranslate, writeAutoTranslate } from './useAutoTranslate';

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
};

afterEach(() => {
  store.clear();
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('the automatic translation switch', () => {
  it('is on by default and off only when saved as off', () => {
    expect(readAutoTranslate()).toBe(true);
    (globalThis as { localStorage?: unknown }).localStorage = fakeStorage;
    expect(readAutoTranslate()).toBe(true);
    writeAutoTranslate(false);
    expect(store.get('scipal-auto-translate')).toBe('off');
    expect(readAutoTranslate()).toBe(false);
    writeAutoTranslate(true);
    expect(readAutoTranslate()).toBe(true);
  });

  it('survives storage that throws', () => {
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readAutoTranslate()).toBe(true);
    expect(() => writeAutoTranslate(false)).not.toThrow();
  });
});
