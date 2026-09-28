import { z } from 'zod';

const QuotaMetricSchema = z.enum([
  'tutor_requests',
  'graded_exam_attempts',
  'active_classes',
  'students_per_class',
  'import_files',
  'active_authored_exams',
  'author_ai_requests',
]);
const EffectiveQuotaRowSchema = z.object({
  metric: QuotaMetricSchema,
  kind: z.enum(['monthly', 'capacity']),
  quota_limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  source: z.enum(['plan', 'override']),
  expires_at: z.string().datetime({ offset: true }).nullable(),
  resets_at: z.string().datetime({ offset: true }).nullable(),
}).strict();
const ReservationRowSchema = z.object({
  operation_id: z.string().uuid(),
  state: z.enum(['reserved', 'committed', 'released']),
  remaining: z.number().int().nonnegative(),
  resets_at: z.string().datetime({ offset: true }).nullable(),
}).strict();
type EffectiveQuota = {
  metric: z.infer<typeof QuotaMetricSchema>;
  kind: 'monthly' | 'capacity';
  limit: number;
  used: number;
  reserved: number;
  source: 'plan' | 'override';
  expiresAt: string | null;
  resetsAt: string | null;
};
type Reservation = {
  operationId: string;
  state: 'reserved' | 'committed' | 'released';
  remaining: number;
  resetsAt: string | null;
};
type QuotaMetric = z.infer<typeof QuotaMetricSchema>;

type RpcError = { code?: string; message?: string };
type RpcResult = { data: unknown; error: RpcError | null };
type BillingRpc = (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

export class BillingRepositoryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'BillingRepositoryError';
    this.code = code;
  }
}

function throwRpcError(error: RpcError): never {
  const message = error.message ?? 'Billing database request failed';
  const knownCode = ['QUOTA_EXCEEDED', 'IDEMPOTENCY_CONFLICT', 'CAPACITY_RESERVATION_UNSUPPORTED', 'BILLING_ACCOUNT_NOT_FOUND', 'UNSUPPORTED_BILLING_ROLE']
    .find((code) => message.includes(code));
  const code = knownCode ?? error.code ?? 'BILLING_DATABASE_ERROR';
  throw new BillingRepositoryError(code, message);
}

function parseQuotaRow(row: unknown): EffectiveQuota {
  const parsed = EffectiveQuotaRowSchema.parse(row);
  return {
    metric: parsed.metric,
    kind: parsed.kind,
    limit: parsed.quota_limit,
    used: parsed.used,
    reserved: parsed.reserved,
    source: parsed.source,
    expiresAt: parsed.expires_at === null ? null : new Date(parsed.expires_at).toISOString(),
    resetsAt: parsed.resets_at === null ? null : new Date(parsed.resets_at).toISOString(),
  };
}

export function createBillingRepository(rpc: BillingRpc) {
  return {
    async getEffectiveQuotas(userId: string, now: Date): Promise<EffectiveQuota[]> {
      const { data, error } = await rpc('billing_get_effective_quotas', {
        p_user_id: userId,
        p_now: now.toISOString(),
      });
      if (error) throwRpcError(error);
      if (!Array.isArray(data)) {
        throw new BillingRepositoryError('INVALID_BILLING_RESPONSE', 'Invalid effective quota response');
      }
      return data.map(parseQuotaRow);
    },

    async reserveQuota(
      userId: string,
      metric: QuotaMetric,
      operationId: string,
      units: number,
      requestHash: string,
    ): Promise<Reservation> {
      const { data, error } = await rpc('billing_reserve_quota', {
        p_user_id: userId,
        p_metric: metric,
        p_operation_id: operationId,
        p_request_hash: requestHash,
        p_units: units,
      });
      if (error) throwRpcError(error);
      const parsed = ReservationRowSchema.safeParse(data);
      if (!parsed.success) {
        throw new BillingRepositoryError('INVALID_BILLING_RESPONSE', 'Invalid quota reservation response');
      }
      return {
        operationId: parsed.data.operation_id,
        state: parsed.data.state,
        remaining: parsed.data.remaining,
        resetsAt: parsed.data.resets_at === null ? null : new Date(parsed.data.resets_at).toISOString(),
      };
    },

    async settleQuota(operationId: string, outcome: 'commit' | 'release'): Promise<void> {
      const { data, error } = await rpc('billing_settle_quota', {
        p_operation_id: operationId,
        p_outcome: outcome,
      });
      if (error) throwRpcError(error);
      if (data === false) {
        throw new BillingRepositoryError('QUOTA_SETTLEMENT_REJECTED', 'Quota reservation can no longer be settled');
      }
      if (data !== true) {
        throw new BillingRepositoryError('INVALID_BILLING_RESPONSE', 'Quota settlement was not confirmed');
      }
    },
  };
}
