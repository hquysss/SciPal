import type { SupabaseClient } from '@supabase/supabase-js';

export type RunKind = 'run' | 'submit' | 'verify';
/** Runs a person may start per minute. */
export const RATE_PER_MINUTE: Record<RunKind, number> = { run: 10, submit: 5, verify: 10 };
/**
 * Runs a person may start per day. Every run costs the hosted judge several requests (one to send, one
 * per poll), so this is what keeps a plan's quota from being spent by one learner.
 */
export const RATE_PER_DAY: Record<RunKind, number> = { run: 100, submit: 40, verify: 100 };

export type RateSlot = 'ok' | 'minute' | 'day';

/**
 * Takes one of the person's runs of this kind, or says which limit stopped it.
 * Counted in the database because serverless instances share no memory.
 * ponytail: count-then-insert, so two requests in the same instant can both pass; a row-locking RPC if abuse shows up.
 */
export async function consumeRateSlot(supabase: SupabaseClient, userId: string, kind: RunKind): Promise<RateSlot> {
  const now = Date.now();
  const { data, error } = await supabase
    .from('code_runs')
    .select('created_at')
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', new Date(now - 86_400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(RATE_PER_DAY[kind]);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ created_at: string }>;
  if (rows.length >= RATE_PER_DAY[kind]) return 'day';
  if (rows.filter((row) => Date.parse(row.created_at) >= now - 60_000).length >= RATE_PER_MINUTE[kind]) return 'minute';
  const { error: insertError } = await supabase.from('code_runs').insert({ user_id: userId, kind });
  if (insertError) throw insertError;
  return 'ok';
}
