import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { payosFromEnv, type PayosClient } from '../billing/providers/payos.js';
import { classifyReconciliationReason } from '../billing/reconciliationReason.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const Query = z.object({ page: z.coerce.number().int().min(1).max(2_147_483_647).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).strict();

type ErrorBody = { code: string; error: string; error_en: string };
const err = (code: string, error: string, error_en: string): ErrorBody => ({ code, error, error_en });
const FORBIDDEN = err('FORBIDDEN', 'Chỉ quản trị viên mới được xem đối soát thanh toán.', 'Only administrators can view payment reconciliation.');
const INVALID = err('INVALID_RECONCILIATION_QUERY', 'Trang hoặc số dòng mỗi trang không hợp lệ.', 'The page or page size is invalid.');
const NOT_FOUND = err('RECONCILIATION_ORDER_NOT_FOUND', 'Không tìm thấy lần thanh toán cần đối soát.', 'Reconciliation payment attempt not found.');
const REFERENCE_INVALID = err('PAYMENT_REFERENCE_INVALID', 'Mã payOS của lần thanh toán không hợp lệ.', 'The payOS reference for this attempt is invalid.');
const CLOSED = err('PAYMENT_PROVIDER_UNAVAILABLE', 'Chưa kết nối được payOS. Thử lại sau.', 'payOS is not configured. Try again later.');
const PROVIDER_ERROR = err('PAYMENT_PROVIDER_ERROR', 'Chưa hỏi lại được payOS. Thử lại sau.', 'Could not query payOS. Try again later.');
const UNAVAILABLE = err('BILLING_UNAVAILABLE', 'Chưa tải được dữ liệu đối soát. Thử lại sau.', 'Reconciliation data is not available. Try again later.');

type IncidentRow = {
  incident_id: string;
  event_id: string | null;
  attempt_id: string | null;
  order_id: string | null;
  created_at: string;
  provider_reference: string | null;
  provider_transaction_id: string | null;
  amount_received_vnd: number | null;
  paid_at: string | null;
  attempt_status: string | null;
  order_status: string | null;
  expected_amount_vnd: number | null;
  order_amount_vnd: number | null;
  order_expires_at: string | null;
  user_id: string | null;
  account_email: string | null;
  display_name: string | null;
  current_role: string | null;
  plan_code: string | null;
  plan_name_en: string | null;
  plan_name_vi: string | null;
  plan_audience: string | null;
};

type PageResult = { items: IncidentRow[]; total_count: number };
type PaymentAttempt = { id: string; provider_reference: string; status: string };

export const billingReconciliationRoutes: FastifyPluginAsync<{ payos?: PayosClient | null }> = async (app, opts) => {
  const payos = opts.payos === undefined ? payosFromEnv() : opts.payos;
  const actor = (request: FastifyRequest) => (request as FastifyRequest & { user?: { app_metadata?: { app_role?: string } } }).user;
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (actor(request)?.app_metadata?.app_role !== 'admin') return reply.code(403).send(FORBIDDEN);
  };

  app.get('/api/admin/billing/reconciliation', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const parsed = Query.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send(INVALID);
    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset) || offset > 2_147_483_647) return reply.code(400).send(INVALID);
    const { data, error } = await app.supabase.rpc('billing_reconciliation_page', { p_limit: limit, p_offset: offset });
    if (error) {
      request.log.error({ err: error }, 'Could not load billing reconciliation');
      return reply.code(503).send(UNAVAILABLE);
    }
    const result = (Array.isArray(data) ? data[0] : data) as PageResult | null;
    const rows = result?.items ?? [];
    return {
      page,
      pageSize: limit,
      totalCount: Number(result?.total_count ?? 0),
      items: rows.map((row) => ({
        id: row.incident_id,
        source: row.event_id ? 'event' : 'attempt',
        eventId: row.event_id,
        attemptId: row.attempt_id,
        orderId: row.order_id,
        createdAt: row.created_at,
        providerReference: row.provider_reference,
        bankTransactionId: row.provider_transaction_id,
        amountReceivedVnd: row.amount_received_vnd,
        amountOrderedVnd: row.order_amount_vnd ?? row.expected_amount_vnd,
        paidAt: row.paid_at,
        account: { id: row.user_id, email: row.account_email, displayName: row.display_name, role: row.current_role },
        plan: { code: row.plan_code, nameEn: row.plan_name_en, nameVi: row.plan_name_vi, audience: row.plan_audience },
        reason: classifyReconciliationReason({
          orderId: row.order_id,
          amountReceivedVnd: row.amount_received_vnd,
          expectedAmountVnd: row.expected_amount_vnd,
          orderAmountVnd: row.order_amount_vnd,
          paidAt: row.paid_at,
          orderExpiresAt: row.order_expires_at,
          attemptStatus: row.attempt_status,
          orderStatus: row.order_status,
          userId: row.user_id,
          currentRole: row.current_role,
          planAudience: row.plan_audience,
        }),
        canReconcile: Boolean(row.order_id && row.attempt_id),
      })),
    };
  });

  app.post('/api/admin/billing/orders/:id/reconcile', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const orderId = (request.params as { id: string }).id;
    if (!UUID.test(orderId)) return reply.code(404).send(NOT_FOUND);
    const attemptResult = await app.supabase
      .from('billing_payment_attempts')
      .select('id, provider_reference, status')
      .eq('order_id', orderId)
      .eq('provider', 'payos')
      .eq('status', 'reconciliation')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (attemptResult.error) {
      request.log.error({ err: attemptResult.error, orderId }, 'Could not load payOS payment attempt');
      return reply.code(503).send(UNAVAILABLE);
    }
    const attempt = attemptResult.data as PaymentAttempt | null;
    if (!attempt) return reply.code(404).send(NOT_FOUND);
    const orderCode = Number(attempt.provider_reference);
    if (!/^\d+$/.test(attempt.provider_reference) || !Number.isSafeInteger(orderCode)) return reply.code(409).send(REFERENCE_INVALID);
    if (!payos) return reply.code(503).send(CLOSED);

    let providerResult;
    try {
      providerResult = await payos.getPaymentLink(orderCode);
    } catch (error) {
      request.log.warn({ err: error, orderId }, 'payOS reconciliation query failed');
      return reply.code(502).send(PROVIDER_ERROR);
    }

    const apply = async (input: { transactionId: string | null; amount: number | null; outcome: 'paid' | 'failed' | 'cancelled' | 'expired'; paidAt: string | null }) => {
      const { data, error } = await app.supabase!.rpc('billing_apply_payment', {
        p_provider: 'payos',
        p_reference: attempt.provider_reference,
        p_transaction_id: input.transactionId,
        p_amount_vnd: input.amount,
        p_outcome: input.outcome,
        p_paid_at: input.paidAt,
        p_fingerprint: `admin-reconciliation:${randomUUID()}`,
        p_event_type: 'admin_reconciliation',
      });
      if (error) throw error;
      return data as string;
    };

    try {
      const results: Array<{ transactionId: string; result: string }> = [];
      if (providerResult.status === 'PAID') {
        const transactions = providerResult.transactions.filter((transaction) =>
          Boolean(transaction.reference) && Number.isSafeInteger(transaction.amount) && transaction.amount > 0);
        if (transactions.length === 0) return reply.code(502).send(PROVIDER_ERROR);
        for (const transaction of transactions) {
          results.push({ transactionId: transaction.reference, result: await apply({
            transactionId: transaction.reference,
            amount: transaction.amount,
            outcome: 'paid',
            paidAt: transaction.paidAt,
          }) });
        }
      } else {
        const outcome = providerResult.status === 'CANCELLED' ? 'cancelled'
          : providerResult.status === 'EXPIRED' ? 'expired'
            : providerResult.status === 'FAILED' ? 'failed' : null;
        if (outcome) results.push({ transactionId: '', result: await apply({ transactionId: null, amount: null, outcome, paidAt: null }) });
      }
      return { orderId, providerStatus: providerResult.status, results };
    } catch (error)
{
      request.log.error({ err: error, orderId }, 'Could not apply payOS reconciliation result');
      return reply.code(503).send(UNAVAILABLE);
    }
  });
};
