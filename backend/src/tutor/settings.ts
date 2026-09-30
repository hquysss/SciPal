// The tutor's settings: the admin's row in `ai_settings` first, then the environment
// (AI_PROVIDER, TUTOR_MODEL, TUTOR_DAILY_LIMIT, TUTOR_VOICE_MODEL), then the defaults. API keys are never settings:
// they stay in the environment (invariant 5).

export type TutorProvider = 'gemini' | 'openai';
/** How long the model may think before answering (Gemini's reasoning_effort). */
export type ReasoningEffort = 'low' | 'medium' | 'high';
export const REASONING_EFFORTS: ReasoningEffort[] = ['low', 'medium', 'high'];

export interface TutorSettings {
  provider: TutorProvider;
  model: string;
  dailyLimit: number;
  enabled: boolean;
  /** The Gemini Live model of spoken sessions (always Gemini, whatever the text provider). */
  voiceModel: string;
  /** Spoken sessions on or off, apart from the tutor itself. */
  voiceEnabled: boolean;
  reasoningEffort: ReasoningEffort;
}

/** The `ai_settings` row; every field may be unset. */
export interface AiSettingsRow {
  provider: string | null;
  model: string | null;
  daily_limit: number | null;
  enabled: boolean | null;
  translate_enabled?: boolean | null;
  translate_daily_chars?: number | null;
  voice_model?: string | null;
  voice_enabled?: boolean | null;
  reasoning_effort?: string | null;
}

/** Automatic translation for authors (routes/translate.ts): on/off and characters per author per day. */
export interface TranslateSettings {
  enabled: boolean;
  dailyChars: number;
}

export const DEFAULT_TRANSLATE_DAILY_CHARS = 200_000;
export const TRANSLATE_DAILY_CHARS_MIN = 1_000;
export const TRANSLATE_DAILY_CHARS_MAX = 5_000_000;

type Env = Record<string, string | undefined>;

export const DEFAULT_MODELS: Record<TutorProvider, string> = { gemini: 'gemini-3.8-flash', openai: 'gpt-4o-mini' };
export const DEFAULT_VOICE_MODEL = 'gemini-3.8-live';
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
    voiceModel: asText(row?.voice_model) ?? asText(env.TUTOR_VOICE_MODEL) ?? DEFAULT_VOICE_MODEL,
    voiceEnabled: row?.voice_enabled ?? true,
    // Low keeps answers quick and cheap (it was the only setting before 03/10).
    reasoningEffort: (REASONING_EFFORTS as string[]).includes(row?.reasoning_effort ?? '') ? (row!.reasoning_effort as ReasoningEffort) : 'low',
  };
}

const asChars = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n >= TRANSLATE_DAILY_CHARS_MIN && n <= TRANSLATE_DAILY_CHARS_MAX ? n : null;
};

export function resolveTranslateSettings(row: AiSettingsRow | null, env: Env): TranslateSettings {
  return {
    enabled: row?.translate_enabled ?? true,
    dailyChars: asChars(row?.translate_daily_chars) ?? asChars(env.AUTHOR_TRANSLATE_DAILY_CHARS) ?? DEFAULT_TRANSLATE_DAILY_CHARS,
  };
}

export interface SettingsStore {
  get(): Promise<TutorSettings>;
  /** Translation settings from the same row (optional so simple test stores need not provide it). */
  translate?(): Promise<TranslateSettings>;
  invalidate(): void;
}

/** Settings read at most once a minute; a failed read falls back to the environment. */
export function createSettingsStore(load: () => Promise<AiSettingsRow | null>, env: Env = process.env, now: () => number = Date.now): Required<SettingsStore> {
  let cached: { at: number; value: TutorSettings; translate: TranslateSettings } | null = null;
  const fresh = async () => {
    if (cached && now() - cached.at < CACHE_MS) return cached;
    let row: AiSettingsRow | null = null;
    try {
      row = await load();
    } catch {
      row = null;
    }
    cached = { at: now(), value: resolveTutorSettings(row, env), translate: resolveTranslateSettings(row, env) };
    return cached;
  };
  return {
    async get() {
      return (await fresh()).value;
    },
    async translate() {
      return (await fresh()).translate;
    },
    invalidate() {
      cached = null;
    },
  };
}
