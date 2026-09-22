'use client';
import { useState, useCallback } from 'react';

export type Lang = 'en' | 'vi';

const STORAGE_KEY = 'scipal-lang';
const DEFAULT_LANG: Lang = 'vi';

function readLang(): Lang {
  if (typeof localStorage === 'undefined') return DEFAULT_LANG;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'en' || stored === 'vi' ? stored : DEFAULT_LANG;
}

export interface UseLanguageResult {
  lang:    Lang;
  setLang: (l: Lang) => void;
  /** Return the string for the active language */
  t:       (strings: { en: string; vi: string }) => string;
}

export function useLanguage(): UseLanguageResult {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const t = useCallback(
    (strings: { en: string; vi: string }) => strings[lang],
    [lang],
  );

  return { lang, setLang, t };
}
