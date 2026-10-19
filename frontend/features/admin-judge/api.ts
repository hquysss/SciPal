import { authoringCall } from '../authoring/apiClient';

export interface JudgeLimits {
  personSubmitsPerDay: number;
  personRunsPerDay: number;
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
  person_submits_per_day: number | null;
  person_runs_per_day: number | null;
  global_submits_per_day: number | null;
  global_runs_per_day: number | null;
}

export const getJudgeSettings = () => authoringCall<JudgeSettingsSnapshot>('/api/admin/judge-settings', 'GET');
export const saveJudgeSettings = (input: JudgeSettingsInput) => authoringCall<JudgeSettingsSnapshot>('/api/admin/judge-settings', 'PATCH', input);
