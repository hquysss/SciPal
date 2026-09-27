'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@scipal/supabase';

/** One public row (a glossary term or a resource) by id; null while loading or when missing. */
export function useRefRow<T>(table: 'terms' | 'resources', columns: string, id: string): T | null {
  const [row, setRow] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    setRow(null);
    Promise.resolve(createBrowserClient().from(table).select(columns).eq('id', id).maybeSingle())
      .then(({ data }) => {
        if (live && data) setRow(data as T);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [table, columns, id]);
  return row;
}
