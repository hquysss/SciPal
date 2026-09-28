import type { QuotaMetric } from '@scipal/types';
import { authoringCall } from '../authoring/apiClient';

// Per-account quotas for admins (backend/src/routes/accountQuotas.ts).

export interface AccountQuota {
  metric: QuotaMetric;
  kind: 'daily' | 'monthly' | 'capacity';
  limit: number;
  /** What the plan alone would give. */
  planLimit: number;
  used: number;
  reserved: number;
  source: 'plan' | 'override';
  expiresAt: string | null;
  resetsAt: string | null;
}

export interface AccountQuotaSnapshot {
  account: { id: string; plan: string; paidThrough: string | null };
  version: number;
  quotas: AccountQuota[];
}

export type QuotaChangeInput = { metric: QuotaMetric; action: 'set'; limit: number; expiresAt: string | null } | { metric: QuotaMetric; action: 'reset' };

export interface QuotaAuditEntry {
  id: string;
  actor: { id: string; name: string | null } | null;
  before: Record<string, { limit: number; expires_at: string | null }>;
  after: Record<string, { limit: number; expires_at: string | null }>;
  reason: string;
  createdAt: string;
}

const base = (id: string) => `/api/admin/accounts/${encodeURIComponent(id)}`;

export const getAccountQuotas = (id: string) => authoringCall<AccountQuotaSnapshot>(`${base(id)}/quotas`, 'GET');
export const saveAccountQuotas = (id: string, body: { expectedVersion: number; reason: string; changes: QuotaChangeInput[] }) =>
  authoringCall<AccountQuotaSnapshot>(`${base(id)}/quotas`, 'PATCH', body);
export const getQuotaAudit = (id: string, cursor?: string) =>
  authoringCall<{ entries: QuotaAuditEntry[]; next: string | null }>(`${base(id)}/quota-audit${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, 'GET');
