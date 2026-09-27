import { createBrowserClient } from '@scipal/supabase';
import type { InteractiveBlock } from '@scipal/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

type Bilingual = { en: string; vi: string };
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

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: Bilingual };

const FALLBACK: Bilingual = { en: 'The server refused the request.', vi: 'Máy chủ từ chối thao tác.' };

async function call<T>(path: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<ApiResult<T>> {
  try {
    const {
      data: { session },
    } = await createBrowserClient().auth.getSession();
    if (!session) return { ok: false, status: 401, error: { en: 'Your session expired. Sign in again.', vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.' } };
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as Record<string, unknown>);
    if (res.ok) return { ok: true, data: data as T };
    const vi = typeof data.error === 'string' ? data.error : FALLBACK.vi;
    const en = typeof data.error_en === 'string' ? data.error_en : FALLBACK.en;
    return { ok: false, status: res.status, error: { vi, en } };
  } catch {
    return { ok: false, status: 0, error: { en: 'Could not reach the server.', vi: 'Không kết nối được máy chủ.' } };
  }
}

const query = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter((e): e is [string, string] => Boolean(e[1]));
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

export function createSimulationRequest(lessonId: string, input: { description: string; reference_url?: string; sketch_url?: string }) {
  const body: Record<string, string> = { description: input.description.trim() };
  if (input.reference_url?.trim()) body.reference_url = input.reference_url.trim();
  if (input.sketch_url) body.sketch_url = input.sketch_url;
  return call<{ request: SimulationRequest }>(`/api/authoring/lessons/${encodeURIComponent(lessonId)}/simulation-requests`, 'POST', body);
}

export function listSimulationRequests(filters: { lesson_id?: string; status?: RequestStatus; subject_id?: string } = {}) {
  return call<{ requests: SimulationRequest[] }>(`/api/authoring/simulation-requests${query(filters)}`, 'GET');
}

export const withdrawSimulationRequest = (id: string) => call<Record<string, never>>(`/api/authoring/simulation-requests/${encodeURIComponent(id)}`, 'DELETE');

// Admin
export const countOpenSimulationRequests = () => call<{ open: number }>('/api/admin/simulation-requests/count', 'GET');
export const acceptSimulationRequest = (id: string) => call<{ request: SimulationRequest }>(`/api/admin/simulation-requests/${encodeURIComponent(id)}/accept`, 'POST', {});
export const declineSimulationRequest = (id: string, note: string) =>
  call<{ request: SimulationRequest }>(`/api/admin/simulation-requests/${encodeURIComponent(id)}/decline`, 'POST', { note: note.trim() });
export const completeSimulationRequest = (id: string, result_block: InteractiveBlock, note?: string) =>
  call<{ request: SimulationRequest }>(`/api/admin/simulation-requests/${encodeURIComponent(id)}/complete`, 'POST', { result_block, ...(note?.trim() ? { note: note.trim() } : {}) });

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
