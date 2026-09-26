'use client';
import { useState, useCallback, useEffect } from 'react';

export type Lang = 'en' | 'vi';

const STORAGE_KEY = 'scipal-lang';
const DEFAULT_LANG: Lang = 'vi';

function readLang(): Lang {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return DEFAULT_LANG;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'vi' ? stored : DEFAULT_LANG;
}

// Global subscribers for all useLanguage instances across the app
const subscribers = new Set<(l: Lang) => void>();

export interface UseLanguageResult {
  lang:    Lang;
  setLang: (l: Lang) => void;
  /** Return the string for the active language */
  t:       (strings: { en: string; vi: string }) => string;
}

export function useLanguage(): UseLanguageResult {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    // Sync on mount
    const savedLang = readLang();
    setLangState(savedLang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = savedLang;
    }

    const handleChange = (newLang: Lang) => {
      setLangState(newLang);
    };

    subscribers.add(handleChange);
    return () => {
      subscribers.delete(handleChange);
    };
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l);
    }
    if (typeof document !== 'undefined') {
      document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = l;
    }
    subscribers.forEach((notify) => notify(l));
  }, []);

  const t = useCallback(
    (strings: { en: string; vi: string }) => strings[lang],
    [lang],
  );

  return { lang, setLang, t };
}
