import type { createServerClient } from '@scipal/supabase';
import type { ReviewCard } from './ReviewSession';

type Client = ReturnType<typeof createServerClient>;

/** Cards in one round of review. */
const ROUND = 20;
const TERM = 'term_en, term_vi, ipa, part_of_speech, definition_en, definition_vi, example_en, example_vi';

/**
 * The learner's due cards (RLS: their own rows; glossary terms only while published, and the dictionary
 * entries they looked up), whether they saved any word, and when the next card is due.
 */
export async function getReviewDeck(supabase: Client, now: Date): Promise<{ cards: ReviewCard[]; hasWords: boolean; nextDue: string | null }> {
  const at = now.toISOString();
  const [due, all, next] = await Promise.all([
    supabase.from('user_terms').select(`term_id, entry_id, due_at, terms(${TERM}), dictionary_entries(${TERM})`).lte('due_at', at).order('due_at').limit(ROUND),
    supabase.from('user_terms').select('term_id', { count: 'exact', head: true }),
    supabase.from('user_terms').select('due_at').gt('due_at', at).order('due_at').limit(1),
  ]);
  if (due.error) throw new Error('Unable to load the review cards', { cause: due.error });
  const one = (value: unknown) => ((Array.isArray(value) ? value[0] : value) ?? null) as Omit<ReviewCard, 'term_id'> | null;
  type Row = { term_id: string | null; entry_id: string | null; terms: unknown; dictionary_entries: unknown };
  // ponytail: a saved term since unpublished still takes a slot in the round; filter in SQL if that grows.
  const cards = ((due.data ?? []) as Row[]).flatMap((row) => {
    const word = one(row.terms) ?? one(row.dictionary_entries);
    const id = row.term_id ?? row.entry_id;
    return word && id ? [{ term_id: id, ...word }] : [];
  });
  return {
    cards,
    hasWords: (all.count ?? 0) > 0,
    nextDue: ((next.data ?? []) as Array<{ due_at: string }>)[0]?.due_at ?? null,
  };
}
