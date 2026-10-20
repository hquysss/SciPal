'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import {
  applyShellTheme,
  DARK_MODE_ENABLED,
  getShell,
  isShellDark,
  readThemePreference,
  safeLocalStorage,
  writeThemePreference,
} from '../../lib/theme/shellTheme'; // relative: frontend vitest has no @/ alias
import styles from './bb8Toggle.module.css';

interface ThemeToggleProps {
  enabled?: boolean;
}

/** BB-8 switch: light or dark. "Match system" is the default until the first click. */
export function ThemeToggle({ enabled = DARK_MODE_ENABLED }: ThemeToggleProps) {
  const { t } = useLanguage();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const pref = readThemePreference(safeLocalStorage());
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(isShellDark(pref === 'system' ? undefined : pref, systemDark));
  }, []);

  if (!enabled) return null;

  const choose = (nextDark: boolean) => {
    const next = nextDark ? 'dark' : 'light';
    setDark(nextDark);
    writeThemePreference(safeLocalStorage(), next);
    applyShellTheme(getShell(), next);
  };

  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        role="switch"
        className={styles.checkbox}
        checked={dark}
        aria-label={t({ en: 'Dark mode', vi: 'Chế độ tối' })}
        onChange={(e) => choose(e.target.checked)}
      />
      <span className={styles.container} aria-hidden="true">
        <span className={styles.scenery}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <span key={n} className={styles.star} />
          ))}
          <span className={styles.sun} />
          <span className={styles.sunLow} />
          <span className={styles.gomrassen} />
          <span className={styles.hermes} />
          <span className={styles.chenini} />
          {[1, 2, 3].map((n) => (
            <span key={n} className={styles.cloud} />
          ))}
        </span>
        <span className={styles.bb8}>
          <span className={styles.headContainer}>
            <span className={styles.antenna} />
            <span className={styles.antenna} />
            <span className={styles.head} />
          </span>
          <span className={styles.body} />
        </span>
        <span className={styles.hidden}>
          <span className={styles.shadow} />
        </span>
      </span>
    </label>
  );
}
