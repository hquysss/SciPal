import { authoringCall, queryString } from '../apiClient';
import type { InteractiveBlock } from '@scipal/types';

export type RequestStatus = 'open' | 'in_progress' | 'done' | 'declined';

export interface SimulationRequest {
  id: string;
  lesson_id: string;
  description: string;
  reference_url: string | null;
  sketch_url: string | null;
  status: RequestStatus;
  admin_note: string | null;
  /** Validated by the server; null unless done. */
  result_block: InteractiveBlock | null;
  created_at: string;
  updated_at: string;
  lesson_title_vi: string;
  lesson_title_en: string;
  subject_slug: string;
  subject_name_vi: string;
  subject_name_en: string;
}

export type { ApiResult } from '../apiClient';

export function createSimulationRequest(lessonId: string, input: { description: string; reference_url?: string; sketch_url?: string }) {
  const body: Record<string, string> = { description: input.description.trim() };
  if (input.reference_url?.trim()) body.reference_url = input.reference_url.trim();
  if (input.sketch_url) body.sketch_url = input.sketch_url;
  return authoringCall<{ request: SimulationRequest }>(`/api/authoring/lessons/${encodeURIComponent(lessonId)}/simulation-requests`, 'POST', body);
}

export function listSimulationRequests(filters: { lesson_id?: string; status?: RequestStatus; subject_id?: string } = {}) {
  return authoringCall<{ requests: SimulationRequest[] }>(`/api/authoring/simulation-requests${queryString(filters)}`, 'GET');
}

export const withdrawSimulationRequest = (id: string) => authoringCall<Record<string, never>>(`/api/authoring/simulation-requests/${encodeURIComponent(id)}`, 'DELETE');

// Admin
export const countOpenSimulationRequests = () => authoringCall<{ open: number }>('/api/admin/simulation-requests/count', 'GET');
export const acceptSimulationRequest = (id: string) => authoringCall<{ request: SimulationRequest }>(`/api/admin/simulation-requests/${encodeURIComponent(id)}/accept`, 'POST', {});
export const declineSimulationRequest = (id: string, note: string) =>
  authoringCall<{ request: SimulationRequest }>(`/api/admin/simulation-requests/${encodeURIComponent(id)}/decline`, 'POST', { note: note.trim() });
export const completeSimulationRequest = (id: string, result_block: InteractiveBlock, note?: string) =>
  authoringCall<{ request: SimulationRequest }>(`/api/admin/simulation-requests/${encodeURIComponent(id)}/complete`, 'POST', { result_block, ...(note?.trim() ? { note: note.trim() } : {}) });

/** Insert each request's result at most once, however many clicks arrive before the re-render. */
export function createInsertGuard<B>(insert: (id: string, block: B) => void) {
  const inserted = new Set<string>();
  const guard = (id: string, block: B) => {
    if (inserted.has(id)) return;
    inserted.add(id);
    insert(id, block);
  };
  guard.done = (id: string) => inserted.has(id);
  return guard;
}
