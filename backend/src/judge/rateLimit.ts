import type { SupabaseClient } from '@supabase/supabase-js';

export type RunKind = 'run' | 'submit' | 'verify';
/** Runs a person may start per minute. */
export const RATE_PER_MINUTE: Record<RunKind, number> = { run: 10, submit: 5, verify: 10 };

/**
 * Takes one of the person's runs of this kind for the last minute, or says there is none left.
 * Counted in the database because serverless instances share no memory.
 * ponytail: count-then-insert, so two requests in the same instant can both pass; a row-locking RPC if abuse shows up.
 */
export async function consumeRateSlot(supabase: SupabaseClient, userId: string, kind: RunKind): Promise<boolean> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await supabase
    .from('code_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', since);
  if (error) throw error;
  if ((count ?? 0) >= RATE_PER_MINUTE[kind]) return false;
  const { error: insertError } = await supabase.from('code_runs').insert({ user_id: userId, kind });
  if (insertError) throw insertError;
  return true;
}
