import type { SupabaseClient } from '@supabase/supabase-js';
import type { RunKind } from './rateLimit.js';

// How many runs the judge allows a day. Admins change the four numbers at /admin/judge; a null one falls
// back to the default here. A submit costs the hosted judge one job per test, a trial run costs one.

export interface JudgeLimits {
  personSubmitsPerDay: number;
  personRunsPerDay: number;
  globalSubmitsPerDay: number;
  globalRunsPerDay: number;
}

export const DEFAULT_JUDGE_LIMITS: JudgeLimits = { personSubmitsPerDay: 20, personRunsPerDay: 50, globalSubmitsPerDay: 300, globalRunsPerDay: 1000 };
export const JUDGE_LIMIT_MIN = 1;
export const JUDGE_LIMIT_MAX = 1_000_000;

export const JUDGE_COLUMNS = 'person_submits_per_day, person_runs_per_day, global_submits_per_day, global_runs_per_day, updated_at';
export interface JudgeSettingsRow {
  person_submits_per_day: number | null;
  person_runs_per_day: number | null;
  global_submits_per_day: number | null;
  global_runs_per_day: number | null;
  updated_at?: string;
}

export function resolveJudgeLimits(row: JudgeSettingsRow | null | undefined): JudgeLimits {
  const pick = (value: number | null | undefined, fallback: number) => (Number.isInteger(value) && value! >= JUDGE_LIMIT_MIN ? value! : fallback);
  return {
    personSubmitsPerDay: pick(row?.person_submits_per_day, DEFAULT_JUDGE_LIMITS.personSubmitsPerDay),
    personRunsPerDay: pick(row?.person_runs_per_day, DEFAULT_JUDGE_LIMITS.personRunsPerDay),
    globalSubmitsPerDay: pick(row?.global_submits_per_day, DEFAULT_JUDGE_LIMITS.globalSubmitsPerDay),
    globalRunsPerDay: pick(row?.global_runs_per_day, DEFAULT_JUDGE_LIMITS.globalRunsPerDay),
  };
}

/** A teacher checking a test set is not learners' spending: a fixed cap per person, none for the site. */
const VERIFY_PER_PERSON_PER_DAY = 100;

/** The daily caps for one kind of run: per person, and for the whole site (null = none). */
export function capsFor(kind: RunKind, limits: JudgeLimits): { person: number; global: number | null } {
  if (kind === 'submit') return { person: limits.personSubmitsPerDay, global: limits.globalSubmitsPerDay };
  if (kind === 'run') return { person: limits.personRunsPerDay, global: limits.globalRunsPerDay };
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
