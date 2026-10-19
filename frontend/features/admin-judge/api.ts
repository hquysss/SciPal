import { authoringCall } from '../authoring/apiClient';

/** What the whole site may run a day. A person's share is a quota of their plan (/admin/plans). */
export interface JudgeLimits {
  globalSubmitsPerDay: number;
  globalRunsPerDay: number;
}

export interface JudgeSettingsSnapshot {
  /** The limits in force: what was saved, with the default for anything left empty. */
  effective: JudgeLimits;
  defaults: JudgeLimits;
  /** Runs the whole site has started today (Vietnam day). */
  usage: { submits: number; runs: number };
}

export interface JudgeSettingsInput {
  global_submits_per_day: number | null;
  global_runs_per_day: number | null;
}

export const getJudgeSettings = () => authoringCall<JudgeSettingsSnapshot>('/api/admin/judge-settings', 'GET');
export const saveJudgeSettings = (input: JudgeSettingsInput) => authoringCall<JudgeSettingsSnapshot>('/api/admin/judge-settings', 'PATCH', input);
