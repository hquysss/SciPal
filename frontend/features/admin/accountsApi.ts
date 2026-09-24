import { createBrowserClient } from '@/lib/supabase';

export interface Account {
  id: string;
  display_name: string | null;
  email: string | null;
  app_role: 'admin' | 'student' | 'teacher';
  created_at: string | null;
  last_sign_in_at: string | null;
}

export interface CreateAccountInput {
  display_name: string;
  email: string;
  password: string;
  app_role: 'student' | 'teacher';
}

export interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
}

export class AccountsApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'AccountsApiError';
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createBrowserClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.access_token) {
    throw new AccountsApiError('Authentication required', 401);
  }

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${session.access_token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: unknown } | null;
    const message = typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`;
    throw new AccountsApiError(message, response.status);
  }

  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

export async function listAccounts(signal?: AbortSignal): Promise<Account[]> {
  const data = await apiFetch<{ accounts: Account[] }>('/api/auth/accounts', { signal });
  return data.accounts;
}

export function createAccount(input: CreateAccountInput): Promise<Account> {
  return apiFetch<Account>('/api/auth/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAccountRole(id: string, role: 'student' | 'teacher'): Promise<Account> {
  return apiFetch<Account>(`/api/auth/accounts/${encodeURIComponent(id)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ app_role: role }),
  });
}

export function deleteAccount(id: string): Promise<void> {
  return apiFetch<void>(`/api/auth/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function updateSelfProfile(input: UpdateProfileInput): Promise<void> {
  return apiFetch<void>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
