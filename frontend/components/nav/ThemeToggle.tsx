'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import {
  applyShellTheme,
  DARK_MODE_ENABLED,
  getShell,
  readThemePreference,
  safeLocalStorage,
  writeThemePreference,
  type ThemePreference,
} from '../../lib/theme/shellTheme'; // relative: frontend vitest has no @/ alias
import {
  NAV_TOGGLE_GROUP,
  navToggleButton,
  SURFACE_TOGGLE_GROUP,
  surfaceToggleButton,
} from './navToggleStyles';

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: { en: string; vi: string } }[] = [
  { value: 'system', icon: Monitor, label: { en: 'Match system', vi: 'Theo hệ thống' } },
  { value: 'light', icon: Sun, label: { en: 'Light', vi: 'Sáng' } },
  { value: 'dark', icon: Moon, label: { en: 'Dark', vi: 'Tối' } },
];

interface ThemeToggleProps {
  tone?: 'nav' | 'surface';
  enabled?: boolean;
}

export function ThemeToggle({ tone = 'nav', enabled = DARK_MODE_ENABLED }: ThemeToggleProps) {
  const { t } = useLanguage();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    setPreference(readThemePreference(safeLocalStorage()));
  }, []);

  if (!enabled) return null;

  const choose = (next: ThemePreference) => {
    setPreference(next);
    writeThemePreference(safeLocalStorage(), next);
    applyShellTheme(getShell(), next);
  };

  const group = tone === 'nav' ? NAV_TOGGLE_GROUP : SURFACE_TOGGLE_GROUP;
  const button = tone === 'nav' ? navToggleButton : surfaceToggleButton;

  return (
    <div role="group" aria-label={t({ en: 'Colour mode', vi: 'Chế độ màu' })} className={group}>
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={t(label)}
          title={t(label)}
          aria-pressed={preference === value}
          onClick={() => choose(value)}
          className={button(preference === value)}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
