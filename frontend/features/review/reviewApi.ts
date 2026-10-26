'use client';

import { createBrowserClient } from '@/lib/supabase';

/** What waits in the learner's word list: due cards, the whole list, the next few English sides, the next due time. */
export type ReviewSummary = { due: number; total: number; preview: string[]; nextDue: string | null };

const PREVIEW = 3;

/**
 * Read from the browser (RLS: the learner's own rows). Only the English side of due words comes back
 * for the preview, so it never shows a meaning before the card is flipped. Null when it cannot be read.
 */
export async function getReviewSummary(now = new Date()): Promise<ReviewSummary | null> {
  try {
    return await readSummary(now);
  } catch {
    return null;
  }
}

async function readSummary(now: Date): Promise<ReviewSummary | null> {
  const db = createBrowserClient();
  const at = now.toISOString();
  const [due, all, next] = await Promise.all([
    db.from('user_terms').select('due_at, terms(term_en), dictionary_entries(term_en)', { count: 'exact' }).lte('due_at', at).order('due_at').limit(PREVIEW),
    db.from('user_terms').select('term_id', { count: 'exact', head: true }),
    db.from('user_terms').select('due_at').gt('due_at', at).order('due_at').limit(1),
  ]);
  if (due.error || all.error || next.error) return null;
  const english = (value: unknown) => ((Array.isArray(value) ? value[0] : value) as { term_en?: string } | null)?.term_en;
  type Row = { terms: unknown; dictionary_entries: unknown };
  const preview = ((due.data ?? []) as Row[]).flatMap((row) => {
    const word = english(row.terms) ?? english(row.dictionary_entries);
    return word ? [word] : [];
  });
  return {
    due: due.count ?? preview.length,
    total: all.count ?? 0,
    preview,
    nextDue: ((next.data ?? []) as Array<{ due_at: string }>)[0]?.due_at ?? null,
  };
}

/** Due cards only, for the menu: one cheap count. Zero when signed out or unreadable. */
export async function countDueWords(now = new Date()): Promise<number> {
  try {
    const { count, error } = await createBrowserClient().from('user_terms').select('term_id', { count: 'exact', head: true }).lte('due_at', now.toISOString());
    return error ? 0 : count ?? 0;
  } catch {
    return 0;
  }
}
