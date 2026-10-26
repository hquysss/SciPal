'use client';

import { createBrowserClient } from '@/lib/supabase';
import type { ReviewCard } from './ReviewSession';

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

const CARD = 'term_en, term_vi, ipa, part_of_speech, definition_en, definition_vi, example_en, example_vi';
/** Cards in one practice round. */
const PRACTICE_ROUND = 20;

/**
 * A practice round from the whole word list, due or not, in a random order. Practice is not graded:
 * nothing goes to the server, so it earns no XP and leaves the schedule alone. Null when unreadable.
 */
export async function getPracticeDeck(): Promise<ReviewCard[] | null> {
  try {
    const { data, error } = await createBrowserClient().from('user_terms').select(`term_id, entry_id, terms(${CARD}), dictionary_entries(${CARD})`).limit(500);
    if (error) return null;
    const one = (value: unknown) => ((Array.isArray(value) ? value[0] : value) ?? null) as Omit<ReviewCard, 'term_id'> | null;
    type Row = { term_id: string | null; entry_id: string | null; terms: unknown; dictionary_entries: unknown };
    const cards = ((data ?? []) as Row[]).flatMap((row) => {
      const word = one(row.terms) ?? one(row.dictionary_entries);
      const id = row.term_id ?? row.entry_id;
      return word && id ? [{ term_id: id, ...word }] : [];
    });
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j]!, cards[i]!];
    }
    return cards.slice(0, PRACTICE_ROUND);
  } catch {
    return null;
  }
}
