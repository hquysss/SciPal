import { describe, expect, it } from 'vitest';
import {
  adoptAccountLevel,
  applyShellLevel,
  applyShellTheme,
  buildBootScript,
  parseThemePreference,
  readThemePreference,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from './shellTheme';
import { LEVEL_SESSION_KEY } from '../../features/landing/educationLevel';

function fakeShell() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    removeAttribute: (name: string) => void attrs.delete(name),
  };
}

function fakeStorage(values: Record<string, string>) {
  return { getItem: (key: string) => values[key] ?? null, setItem: (key: string, value: string) => void (values[key] = value) };
}

const throwingStorage = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('SecurityError'); },
};

function runBoot(script: string, session: unknown, local: unknown) {
  const shell = fakeShell();
  const document = { currentScript: { parentElement: shell } };
  const window = {
    get sessionStorage() { if (session === 'throw') throw new Error('SecurityError'); return session; },
    get localStorage() { if (local === 'throw') throw new Error('SecurityError'); return local; },
  };
  new Function('document', 'window', script)(document, window);
  return shell.attrs;
}

describe('theme preference', () => {
  it.each([['light', 'light'], ['dark', 'dark'], ['system', 'system'], ['Dark', 'system'], ['dark; x', 'system'], [null, 'system']])(
    'parses %s as %s',
    (raw, expected) => expect(parseThemePreference(raw)).toBe(expected),
  );

  it('survives blocked storage', () => {
    expect(readThemePreference(throwingStorage)).toBe('system');
    expect(() => writeThemePreference(throwingStorage, 'dark')).not.toThrow();
    expect(readThemePreference(null)).toBe('system');
  });

  it('round-trips through storage', () => {
    const storage = fakeStorage({});
    writeThemePreference(storage, 'dark');
    expect(readThemePreference(storage)).toBe('dark');
  });
});

describe('shell attributes', () => {
  it('sets data-theme only for explicit choices', () => {
    const shell = fakeShell();
    applyShellTheme(shell, 'dark');
    expect(shell.attrs.get('data-theme')).toBe('dark');
    applyShellTheme(shell, 'system');
    expect(shell.attrs.has('data-theme')).toBe(false);
  });

  it('falls back to neutral when no level is known', () => {
    const shell = fakeShell();
    applyShellLevel(shell, 'primary');
    expect(shell.attrs.get('data-level')).toBe('primary');
    applyShellLevel(shell, null);
    expect(shell.attrs.get('data-level')).toBe('neutral');
    expect(() => applyShellLevel(null, 'primary')).not.toThrow();
  });
});

describe('boot script', () => {
  it('applies a stored level and theme before paint', () => {
    const attrs = runBoot(
      buildBootScript({ darkMode: true }),
      fakeStorage({ [LEVEL_SESSION_KEY]: 'upper_secondary' }),
      fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }),
    );
    expect(attrs.get('data-level')).toBe('upper_secondary');
    expect(attrs.get('data-theme')).toBe('dark');
  });

  it('ignores the theme while dark mode is disabled', () => {
    const attrs = runBoot(buildBootScript({ darkMode: false }), fakeStorage({}), fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }));
    expect(attrs.has('data-theme')).toBe(false);
  });

  it.each(['__proto__', 'Primary', 'neutral', 'upper_secondary " onload="x'])('ignores junk level %s', (junk) => {
    const attrs = runBoot(buildBootScript({ darkMode: true }), fakeStorage({ [LEVEL_SESSION_KEY]: junk }), fakeStorage({}));
    expect(attrs.has('data-level')).toBe(false);
  });

  it('does not throw when storage is blocked', () => {
    expect(() => runBoot(buildBootScript({ darkMode: true }), 'throw', 'throw')).not.toThrow();
    const attrs = runBoot(buildBootScript({ darkMode: true }), throwingStorage, throwingStorage);
    expect(attrs.size).toBe(0);
  });
});

describe('adoptAccountLevel', () => {
  it('stores a valid account level for the tab and applies it to the shell', () => {
    const shell = fakeShell();
    const values: Record<string, string> = {};
    expect(adoptAccountLevel('lower_secondary', fakeStorage(values), shell)).toBe('lower_secondary');
    expect(values[LEVEL_SESSION_KEY]).toBe('lower_secondary');
    expect(shell.attrs.get('data-level')).toBe('lower_secondary');
  });

  it.each([null, undefined, '', 'THPT'])('leaves the shell alone for %s', (raw) => {
    const shell = fakeShell();
    expect(adoptAccountLevel(raw, fakeStorage({}), shell)).toBeNull();
    expect(shell.attrs.size).toBe(0);
  });

  it('still themes the shell when storage is blocked', () => {
    const shell = fakeShell();
    expect(adoptAccountLevel('primary', throwingStorage, shell)).toBe('primary');
    expect(shell.attrs.get('data-level')).toBe('primary');
  });
});
