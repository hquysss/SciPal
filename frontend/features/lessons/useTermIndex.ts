'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@scipal/supabase';
import type { TermIndexEntry } from '@/components/blocks/autoTerms';

/** The subject's published core terms (RLS) for the editor's preview, so it tags them as the learner's page does. Empty until loaded or on failure. */
export function useTermIndex(subjectId: string): TermIndexEntry[] {
  const [index, setIndex] = useState<TermIndexEntry[]>([]);
  useEffect(() => {
    let live = true;
    try {
      void Promise.resolve(createBrowserClient().from('terms').select('id, term_en, term_vi').eq('subject_id', subjectId).eq('core', true))
        .then(({ data }) => live && setIndex((data ?? []) as TermIndexEntry[]))
        .catch(() => {});
    } catch {
      // No client (no Supabase settings): the preview shows the text as written.
    }
    return () => {
      live = false;
    };
  }, [subjectId]);
  return index;
}
