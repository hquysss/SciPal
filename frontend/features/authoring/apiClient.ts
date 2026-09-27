import { createBrowserClient } from '@scipal/supabase';

// A call to the authoring API with the signed-in teacher's token. Errors come back in both
// languages (`error` / `error_en` from the server, or a fallback).

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

type Bilingual = { en: string; vi: string };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: Bilingual };

const FALLBACK: Bilingual = { en: 'The server refused the request.', vi: 'Máy chủ từ chối thao tác.' };

export async function authoringCall<T>(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<ApiResult<T>> {
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

/** `?a=1&b=2` from the params that are set. */
export function queryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params)
    .filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '')
    .map(([key, value]) => [key, String(value)]);
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
}
