import { authoringCall } from '../authoring/apiClient';

export type AiProvider = 'gemini' | 'openai';

export interface AiSettingsSnapshot {
  saved: { provider: AiProvider | null; model: string | null; daily_limit: number | null; enabled: boolean; updated_at: string } | null;
  effective: { provider: AiProvider; model: string; dailyLimit: number; enabled: boolean };
  /** Whether each key is set on the backend; the values never leave it. */
  keys: Record<AiProvider, boolean>;
  defaults: Record<AiProvider, string>;
  usage: { today: number; week: number; students_week: number };
}

export interface AiSettingsInput {
  provider: AiProvider;
  model: string | null;
  daily_limit: number;
  enabled: boolean;
}

export type AiTestResult = { ok: true; reply: string; ms: number; provider: AiProvider; model: string } | { ok: false; error: string; ms: number; provider: AiProvider; model: string };

export const getAiSettings = () => authoringCall<AiSettingsSnapshot>('/api/admin/ai-settings', 'GET');
export const saveAiSettings = (input: AiSettingsInput) => authoringCall<AiSettingsSnapshot>('/api/admin/ai-settings', 'PATCH', input);
export const testAiSettings = () => authoringCall<AiTestResult>('/api/admin/ai-settings/test', 'POST');
