'use client';

import { useEffect, useState } from 'react';
import { getShell, isShellDark } from './shellTheme';

/** Tracks whether the app shell is dark, following the colour-mode toggle and the system setting. */
export function useShellDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const shell = getShell();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setDark(isShellDark(shell?.dataset.theme, media.matches));
    update();
    media.addEventListener('change', update);
    const observer = shell ? new MutationObserver(update) : null;
    if (shell) observer?.observe(shell, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      media.removeEventListener('change', update);
      observer?.disconnect();
    };
  }, []);

  return dark;
}
