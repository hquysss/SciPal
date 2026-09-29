'use client';

import { useCallback, useEffect, useState } from 'react';

// How this device installs SciPal: the browser's own install prompt (Chrome, Edge, Android), the
// Share → Add to Home Screen steps (iPhone and iPad, where the web cannot open a prompt), the browser
// menu elsewhere, or nothing at all once SciPal runs from the home screen.

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual';

export function installMode({ standalone, canPrompt, ios }: { standalone: boolean; canPrompt: boolean; ios: boolean }): InstallMode {
  if (standalone) return 'installed';
  if (canPrompt) return 'prompt';
  return ios ? 'ios' : 'manual';
}

/** iPhone, iPad, and iPadOS, which reports a Mac user agent but has a touch screen. */
export function isIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

/** The install mode for this device and, where the browser allows it, the prompt to open. */
export function useInstall(): { mode: InstallMode; install: () => Promise<void> } {
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true);
    setIos(isIos(navigator.userAgent, navigator.maxTouchPoints ?? 0));
    const onPrompt = (event: Event) => {
      // Keep the browser's own mini bar away; the button on the page opens the prompt.
      event.preventDefault();
      setPrompt(event as PromptEvent);
    };
    const onInstalled = () => {
      setPrompt(null);
      setStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    // A prompt opens once; after a "not now" the browser offers a new one later.
    setPrompt(null);
    if (outcome === 'accepted') setStandalone(true);
  }, [prompt]);

  return { mode: installMode({ standalone, canPrompt: prompt !== null, ios }), install };
}
