import { authoringCall, type ApiResult } from '../../authoring/apiClient';
import type { AnnouncementInput } from '../../newsletter/newsletterApi';

export type ScheduledKind = 'announcement' | 'maintenance_on' | 'maintenance_off';
export type ScheduledStatus = 'pending' | 'running' | 'done' | 'cancelled' | 'failed';
export type Scheduled = {
  id: string;
  kind: ScheduledKind;
  run_at: string;
  payload: Partial<AnnouncementInput>;
  status: ScheduledStatus;
  error: string | null;
};

export const listScheduled = (): Promise<ApiResult<{ scheduled: Scheduled[] }>> => authoringCall('/api/admin/scheduled', 'GET');
export const createScheduled = (kind: ScheduledKind, runAt: Date, payload?: Omit<AnnouncementInput, 'client_request_id'>): Promise<ApiResult<{ scheduled: Scheduled }>> =>
  authoringCall('/api/admin/scheduled', 'POST', { kind, run_at: runAt.toISOString(), ...(payload ? { payload } : {}) });
export const cancelScheduled = (id: string): Promise<ApiResult<Record<string, never>>> => authoringCall(`/api/admin/scheduled/${encodeURIComponent(id)}`, 'DELETE');

/** `datetime-local` text ("2026-10-20T08:00", the admin's own clock) to a Date; null when empty or not a real time. */
export function parseLocalTime(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
