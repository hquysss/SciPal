'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { MoonIcon, SunIcon } from './ScienceMotifs';

export function LoginThemeToggle() {
  const { lang } = useLanguage();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('scipal-theme-v1');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('scipal-theme-v1', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('scipal-theme-v1', 'light');
    }
  }

  const label = isDark
    ? lang === 'en'
      ? 'Enable Light Theme'
      : 'Bật giao diện Sáng'
    : lang === 'en'
      ? 'Enable Dark Theme'
      : 'Bật giao diện Tối';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      className="login-theme-toggle"
    >
      <span className="login-theme-toggle-track" aria-hidden="true">
        <span className={`login-theme-toggle-knob ${isDark ? 'is-dark' : ''}`}>
          {isDark ? <MoonIcon className="size-3.5" /> : <SunIcon className="size-4" />}
        </span>
      </span>
    </button>
  );
}
