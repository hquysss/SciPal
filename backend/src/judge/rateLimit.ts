import type { SupabaseClient } from '@supabase/supabase-js';
import { vietnamDayStart } from '../tutor/limits.js';

export type RunKind = 'run' | 'submit' | 'verify';
/** Runs a person may start per minute. */
export const RATE_PER_MINUTE: Record<RunKind, number> = { run: 10, submit: 5, verify: 10 };

/** Which limit said no: the minute's, the person's day, or the whole site's day. */
export type RateSlot = 'ok' | 'minute' | 'day' | 'busy';

/** How many runs of this kind were started today, by one person or (no `userId`) by everyone. */
export async function runsToday(supabase: SupabaseClient, kind: RunKind, userId?: string): Promise<number> {
  let query = supabase.from('code_runs').select('id', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', vietnamDayStart(new Date()).toISOString());
  if (userId) query = query.eq('user_id', userId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Takes one of the person's runs of this kind, or says which limit stopped it. Days are Vietnam days,
 * the same as the tutor's. Counted in the database because serverless instances share no memory.
 * ponytail: count-then-insert, so two requests in the same instant can both pass; a row-locking RPC if abuse shows up.
 */
export async function consumeRateSlot(supabase: SupabaseClient, userId: string, kind: RunKind, caps: { person: number; global: number | null }): Promise<RateSlot> {
  const now = new Date();
  const dayStart = vietnamDayStart(now).toISOString();
  const { data, error } = await supabase
    .from('code_runs')
    .select('created_at')
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', dayStart)
    .order('created_at', { ascending: false })
    .limit(caps.person);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ created_at: string }>;
  if (rows.length >= caps.person) return 'day';
  if (rows.filter((row) => Date.parse(row.created_at) >= now.getTime() - 60_000).length >= RATE_PER_MINUTE[kind]) return 'minute';
  if (caps.global !== null) {
    const { count, error: countError } = await supabase.from('code_runs').select('id', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', dayStart);
    if (countError) throw countError;
    if ((count ?? 0) >= caps.global) return 'busy';
  }
  const { error: insertError } = await supabase.from('code_runs').insert({ user_id: userId, kind });
  if (insertError) throw insertError;
  return 'ok';
}
