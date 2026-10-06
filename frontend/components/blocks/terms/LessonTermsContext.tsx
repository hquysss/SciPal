'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';

/** A published glossary term as a lesson shows it (popover and end-of-lesson list). */
export type LessonTerm = {
  id: string;
  kind: 'word' | 'place';
  term_en: string;
  term_vi: string;
  part_of_speech: string | null;
  definition_en: string;
  definition_vi: string;
  example_en: string | null;
  example_vi: string | null;
  audio_url: string | null;
  image_url: string | null;
  image_alt_en: string | null;
  image_alt_vi: string | null;
  image_credit: string | null;
};

const COLUMNS =
  'id, kind, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi, audio_url, image_url, image_alt_en, image_alt_vi, image_credit';

type LessonTerms = { terms: Map<string, LessonTerm>; loaded: boolean; lang: 'en' | 'vi' };

const Context = createContext<LessonTerms | null>(null);

/**
 * Loads every term the lesson tags in one query (RLS returns published terms only), for the
 * TermMarks inside and the end-of-lesson list. `lang` overrides the reader's language (editor preview).
 */
export function LessonTermsProvider({ ids, lang: langOverride, children }: { ids: string[]; lang?: 'en' | 'vi'; children: ReactNode }) {
  const { lang: readerLang } = useLanguage();
  const [terms, setTerms] = useState<Map<string, LessonTerm>>(() => new Map());
  const [loaded, setLoaded] = useState(false);
  const key = ids.join(',');

  useEffect(() => {
    const wanted = key ? key.split(',') : [];
    if (wanted.length === 0) {
      setTerms(new Map());
      setLoaded(true);
      return;
    }
    let live = true;
    setLoaded(false);
    Promise.resolve(createBrowserClient().from('terms').select(COLUMNS).in('id', wanted))
      .then(({ data }) => {
        if (!live) return;
        setTerms(new Map(((data ?? []) as LessonTerm[]).map((term) => [term.id, term])));
        setLoaded(true);
      })
      .catch(() => {
        if (live) setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [key]);

  return <Context.Provider value={{ terms, loaded, lang: langOverride ?? readerLang }}>{children}</Context.Provider>;
}

/** The lesson's terms, or null outside a LessonTermsProvider. */
export function useLessonTerms(): LessonTerms | null {
  return useContext(Context);
}
