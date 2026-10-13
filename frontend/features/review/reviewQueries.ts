import type { createServerClient } from '@scipal/supabase';
import type { ReviewCard } from './ReviewSession';

type Client = ReturnType<typeof createServerClient>;

/** Cards in one round of review. */
const ROUND = 20;
const TERM = 'term_en, term_vi, ipa, part_of_speech, definition_en, definition_vi, example_en, example_vi';

/** The learner's due cards (RLS: their own rows, published terms), whether they saved any word, and when the next card is due. */
export async function getReviewDeck(supabase: Client, now: Date): Promise<{ cards: ReviewCard[]; hasWords: boolean; nextDue: string | null }> {
  const at = now.toISOString();
  const [due, all, next] = await Promise.all([
    supabase.from('user_terms').select(`term_id, due_at, terms!inner(${TERM})`).lte('due_at', at).order('due_at').limit(ROUND),
    supabase.from('user_terms').select('term_id', { count: 'exact', head: true }),
    supabase.from('user_terms').select('due_at').gt('due_at', at).order('due_at').limit(1),
  ]);
  if (due.error) throw new Error('Unable to load the review cards', { cause: due.error });
  const cards = ((due.data ?? []) as Array<{ term_id: string; terms: unknown }>).flatMap(({ term_id, terms }) => {
    const term = (Array.isArray(terms) ? terms[0] : terms) as Omit<ReviewCard, 'term_id'> | null;
    return term ? [{ term_id, ...term }] : [];
  });
  return {
    cards,
    hasWords: (all.count ?? 0) > 0,
    nextDue: ((next.data ?? []) as Array<{ due_at: string }>)[0]?.due_at ?? null,
  };
}
