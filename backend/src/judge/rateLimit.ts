import type { SupabaseClient } from '@supabase/supabase-js';
import { vietnamDayStart } from '../tutor/limits.js';

export type RunKind = 'run' | 'submit' | 'verify';
/** Runs a person may start per minute. */
export const RATE_PER_MINUTE: Record<RunKind, number> = { run: 10, submit: 5, verify: 10 };

/** Which limit said no: the minute's, a person's day (teacher checks), or the whole site's day. */
export type RateSlot = 'ok' | 'minute' | 'day' | 'busy';

/** How many runs of this kind were started since `since`, by one person or (no `userId`) by everyone. */
async function runsSince(supabase: SupabaseClient, kind: RunKind, since: Date, userId?: string): Promise<number> {
  let query = supabase.from('code_runs').select('id', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', since.toISOString());
  if (userId) query = query.eq('user_id', userId);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Runs of this kind started today (Vietnam day), by one person or everyone. */
export const runsToday = (supabase: SupabaseClient, kind: RunKind, userId?: string) => runsSince(supabase, kind, vietnamDayStart(new Date()), userId);

/**
 * Whether the person may start a run of this kind now: not too fast, under the person's day cap if there
 * is one (learners' day caps are plan quotas, checked elsewhere) and while the whole site has runs left.
 * Counted in the database because serverless instances share no memory.
 */
export async function checkRateSlot(supabase: SupabaseClient, userId: string, kind: RunKind, caps: { person: number | null; global: number | null }): Promise<RateSlot> {
  if ((await runsSince(supabase, kind, new Date(Date.now() - 60_000), userId)) >= RATE_PER_MINUTE[kind]) return 'minute';
  if (caps.person !== null && (await runsToday(supabase, kind, userId)) >= caps.person) return 'day';
  if (caps.global !== null && (await runsToday(supabase, kind)) >= caps.global) return 'busy';
  return 'ok';
}

/**
 * Writes down a run that is starting; the minute and day counts read these rows.
 * ponytail: check-then-insert, so two requests in the same instant can both pass; a row-locking RPC if abuse shows up.
 */
export async function recordRun(supabase: SupabaseClient, userId: string, kind: RunKind): Promise<void> {
  const { error } = await supabase.from('code_runs').insert({ user_id: userId, kind });
  if (error) throw error;
}
