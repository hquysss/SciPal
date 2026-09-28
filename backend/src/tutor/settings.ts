// The tutor's settings: the admin's row in `ai_settings` first, then the environment
// (AI_PROVIDER, TUTOR_MODEL, TUTOR_DAILY_LIMIT), then the defaults. API keys are never settings:
// they stay in the environment (invariant 5).

export type TutorProvider = 'gemini' | 'openai';

export interface TutorSettings {
  provider: TutorProvider;
  model: string;
  dailyLimit: number;
  enabled: boolean;
}

/** The `ai_settings` row; every field may be unset. */
export interface AiSettingsRow {
  provider: string | null;
  model: string | null;
  daily_limit: number | null;
  enabled: boolean | null;
}

type Env = Record<string, string | undefined>;

export const DEFAULT_MODELS: Record<TutorProvider, string> = { gemini: 'gemini-3.8-flash', openai: 'gpt-4o-mini' };
export const DEFAULT_DAILY_LIMIT = 30;
export const DAILY_LIMIT_MAX = 200;
const CACHE_MS = 60_000;

const asProvider = (value: string | null | undefined): TutorProvider | null => {
  const v = value?.trim().toLowerCase();
  return v === 'gemini' || v === 'openai' ? v : null;
};
const asLimit = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= DAILY_LIMIT_MAX ? n : null;
};
const asText = (value: string | null | undefined) => value?.trim() || null;

export function resolveTutorSettings(row: AiSettingsRow | null, env: Env): TutorSettings {
  const provider = asProvider(row?.provider) ?? asProvider(env.AI_PROVIDER) ?? 'gemini';
  // A model set for one provider means nothing to the other: the env model applies only when the
  // row does not pick a provider of its own.
  const envModel = asProvider(row?.provider) ? null : asText(env.TUTOR_MODEL);
  return {
    provider,
    model: asText(row?.model) ?? envModel ?? DEFAULT_MODELS[provider],
    dailyLimit: asLimit(row?.daily_limit) ?? asLimit(env.TUTOR_DAILY_LIMIT) ?? DEFAULT_DAILY_LIMIT,
    enabled: row?.enabled ?? true,
  };
}

export interface SettingsStore {
  get(): Promise<TutorSettings>;
  invalidate(): void;
}

/** Settings read at most once a minute; a failed read falls back to the environment. */
export function createSettingsStore(load: () => Promise<AiSettingsRow | null>, env: Env = process.env, now: () => number = Date.now): SettingsStore {
  let cached: { at: number; value: TutorSettings } | null = null;
  return {
    async get() {
      if (cached && now() - cached.at < CACHE_MS) return cached.value;
      let row: AiSettingsRow | null = null;
      try {
        row = await load();
      } catch {
        row = null;
      }
      cached = { at: now(), value: resolveTutorSettings(row, env) };
      return cached.value;
    },
    invalidate() {
      cached = null;
    },
  };
}
