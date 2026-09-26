import {
  LEVEL_SESSION_KEY,
  parseEducationLevel,
  writeSessionEducationLevel,
  type EducationLevel,
} from '../../features/landing/educationLevel';

/** Off until every screen uses tokens (spec §4.4, phase 5). */
export const DARK_MODE_ENABLED = false;

export const THEME_STORAGE_KEY = 'scipal-theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ShellElement = Pick<HTMLElement, 'setAttribute' | 'removeAttribute'>;

export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function readThemePreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference {
  if (!storage) return 'system';
  try {
    return parseThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function writeThemePreference(storage: Pick<Storage, 'setItem'> | null, preference: ThemePreference): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

export function applyShellTheme(shell: ShellElement | null, preference: ThemePreference): void {
  if (!shell) return;
  if (preference === 'system') shell.removeAttribute('data-theme');
  else shell.setAttribute('data-theme', preference);
}

export function applyShellLevel(shell: ShellElement | null, level: EducationLevel | null): void {
  shell?.setAttribute('data-level', level ?? 'neutral');
}

export function getShell(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('[data-app-shell]');
}

export function safeSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function safeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Inline script placed as the first child of [data-app-shell]. Runs before the shell paints,
 * so the level and theme are right on first frame. Must stay self-contained ES5.
 */
export function buildBootScript({ darkMode }: { darkMode: boolean }): string {
  const levelKey = JSON.stringify(LEVEL_SESSION_KEY);
  const themeKey = JSON.stringify(THEME_STORAGE_KEY);
  const themePart = darkMode
    ? `var t=null;try{t=window.localStorage.getItem(${themeKey})}catch(e){}` +
      `if(t==='light'||t==='dark')s.setAttribute('data-theme',t);`
    : '';
  return (
    '(function(){var s=document.currentScript&&document.currentScript.parentElement;if(!s)return;' +
    `var l=null;try{l=window.sessionStorage.getItem(${levelKey})}catch(e){}` +
    "if(l==='primary'||l==='lower_secondary'||l==='upper_secondary')s.setAttribute('data-level',l);" +
    themePart +
    '})();'
  );
}

/** Account level wins: keep it for this tab (so the boot script sees it) and theme the shell now. */
export function adoptAccountLevel(
  raw: unknown,
  storage: Pick<Storage, 'setItem'> | null,
  shell: ShellElement | null,
): EducationLevel | null {
  const level = parseEducationLevel(raw);
  if (!level) return null;
  if (storage) {
    try {
      writeSessionEducationLevel(storage, level);
    } catch {
      // Storage blocked: the shell is still themed for this page.
    }
  }
  applyShellLevel(shell, level);
  return level;
}
