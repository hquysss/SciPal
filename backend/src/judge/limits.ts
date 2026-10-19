import type { SupabaseClient } from '@supabase/supabase-js';
import type { RunKind } from './rateLimit.js';

// How many runs the whole judge allows a day. Admins change the two numbers at /admin/judge; a null one
// falls back to the default here. What one person may run is a quota of their plan (code_submits and
// code_runs, billing), not set here. A submit costs the hosted judge one job per test, a trial run one.

export interface JudgeLimits {
  globalSubmitsPerDay: number;
  globalRunsPerDay: number;
}

export const DEFAULT_JUDGE_LIMITS: JudgeLimits = { globalSubmitsPerDay: 300, globalRunsPerDay: 1000 };
export const JUDGE_LIMIT_MIN = 1;
export const JUDGE_LIMIT_MAX = 1_000_000;

export const JUDGE_COLUMNS = 'global_submits_per_day, global_runs_per_day, updated_at';
export interface JudgeSettingsRow {
  global_submits_per_day: number | null;
  global_runs_per_day: number | null;
  updated_at?: string;
}

export function resolveJudgeLimits(row: JudgeSettingsRow | null | undefined): JudgeLimits {
  const pick = (value: number | null | undefined, fallback: number) => (Number.isInteger(value) && value! >= JUDGE_LIMIT_MIN ? value! : fallback);
  return {
    globalSubmitsPerDay: pick(row?.global_submits_per_day, DEFAULT_JUDGE_LIMITS.globalSubmitsPerDay),
    globalRunsPerDay: pick(row?.global_runs_per_day, DEFAULT_JUDGE_LIMITS.globalRunsPerDay),
  };
}

/** A teacher checking a test set is not learners' spending: a fixed cap per person, none for the site. */
const VERIFY_PER_PERSON_PER_DAY = 100;

/** The daily caps for one kind of run: per person (only teacher checks; learners' are plan quotas), and for the whole site. */
export function capsFor(kind: RunKind, limits: JudgeLimits): { person: number | null; global: number | null } {
  if (kind === 'submit') return { person: null, global: limits.globalSubmitsPerDay };
  if (kind === 'run') return { person: null, global: limits.globalRunsPerDay };
  return { person: VERIFY_PER_PERSON_PER_DAY, global: null };
}

const TTL_MS = 30_000;

/** The limits in force, read from the database at most every 30 s; a read that fails leaves the defaults in force. */
export function createJudgeLimitsStore(supabase: SupabaseClient, onError?: (err: unknown) => void) {
  let cached: { at: number; limits: JudgeLimits } | null = null;
  return async (): Promise<JudgeLimits> => {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.limits;
    let limits = DEFAULT_JUDGE_LIMITS;
    try {
      const { data, error } = await supabase.from('judge_settings').select(JUDGE_COLUMNS).eq('id', 1).maybeSingle();
      if (error) throw error;
      limits = resolveJudgeLimits(data as JudgeSettingsRow | null);
    } catch (err) {
      onError?.(err);
    }
    cached = { at: Date.now(), limits };
    return limits;
  };
}
