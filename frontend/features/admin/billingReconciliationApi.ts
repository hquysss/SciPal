import { createBrowserClient } from '@/lib/supabase';

export type BillingReconciliationReason = {
  code: string;
  en: string;
  vi: string;
};

export type BillingReconciliationItem = {
  id: string;
  source: 'event' | 'attempt';
  eventId: string | null;
  attemptId: string | null;
  orderId: string | null;
  createdAt: string;
  providerReference: string | null;
  bankTransactionId: string | null;
  amountReceivedVnd: number | null;
  amountOrderedVnd: number | null;
  paidAt: string | null;
  account: { id: string | null; email: string | null; displayName: string | null; role: string | null };
  plan: { code: string | null; nameEn: string | null; nameVi: string | null; audience: string | null };
  reason: BillingReconciliationReason;
  canReconcile: boolean;
};

export type BillingReconciliationPage = {
  page: number;
  pageSize: number;
  totalCount: number;
  items: BillingReconciliationItem[];
};

export type BillingReconciliationResult = {
  orderId: string;
  providerStatus: string;
  results: Array<{ transactionId: string; result: string }>;
};

export class BillingReconciliationApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'BillingReconciliationApiError';
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session }, error: sessionError } = await createBrowserClient().auth.getSession();
  if (sessionError || !session?.access_token) throw new BillingReconciliationApiError('Authentication required', 401);

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: unknown } | null;
    const message = typeof body?.error === 'string' ? body.error : `Request failed (${response.status})`;
    throw new BillingReconciliationApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

export function listBillingReconciliation(page: number, signal?: AbortSignal): Promise<BillingReconciliationPage> {
  const query = new URLSearchParams({ page: String(page), limit: '20' });
  return apiFetch(`/api/admin/billing/reconciliation?${query}`, { signal });
}

export function recheckBillingOrder(orderId: string): Promise<BillingReconciliationResult> {
  return apiFetch(`/api/admin/billing/orders/${encodeURIComponent(orderId)}/reconcile`, { method: 'POST' });
}

export type BillingOrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'reconciliation';

export type BillingOrderItem = {
  id: string;
  status: BillingOrderStatus;
  amountVnd: number;
  interval: string;
  createdAt: string;
  paidAt: string | null;
  account: { id: string; email: string | null; displayName: string | null };
  plan: { code: string; nameVi: string | null; nameEn: string | null };
  providerReference: string | null;
  bankTransactionId: string | null;
};

export type BillingOrdersPage = { page: number; pageSize: number; totalCount: number; items: BillingOrderItem[] };

/** Every order, newest first; `status` narrows it to one state. */
export function listBillingOrders(page: number, status: BillingOrderStatus | null, signal?: AbortSignal): Promise<BillingOrdersPage> {
  const query = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) query.set('status', status);
  return apiFetch(`/api/admin/billing/orders?${query}`, { signal });
}
