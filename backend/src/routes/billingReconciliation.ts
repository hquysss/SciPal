import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { payosFromEnv, type PayosClient } from '../billing/providers/payos.js';
import { classifyReconciliationReason } from '../billing/reconciliationReason.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const Query = z.object({ page: z.coerce.number().int().min(1).max(2_147_483_647).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).strict();

const ORDER_STATUSES = ['pending', 'paid', 'failed', 'expired', 'cancelled', 'reconciliation'] as const;
const OrdersQuery = z.object({
  page: z.coerce.number().int().min(1).max(2_147_483_647).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
}).strict();

type OrderRow = { id: string; user_id: string; plan_code: string; interval: string; amount_vnd: number; status: string; created_at: string; paid_at: string | null; expires_at: string | null };
type AttemptRow = { order_id: string; provider_reference: string | null; provider_transaction_id: string | null; status: string; created_at: string };

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
      .in('status', ['reconciliation', 'paid'])
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

  // Every order ever made, newest first: the payment history for admins (the reconciliation list
  // above only holds the cases that need review).
  app.get('/api/admin/billing/orders', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(UNAVAILABLE);
    const parsed = OrdersQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send(INVALID);
    const { page, limit, status } = parsed.data;
    const offset = (page - 1) * limit;
    if (!Number.isSafeInteger(offset) || offset > 2_147_483_647) return reply.code(400).send(INVALID);

    let query = supabase
      .from('billing_orders')
      .select('id, user_id, plan_code, interval, amount_vnd, status, created_at, paid_at, expires_at', { count: 'exact' });
    if (status) query = query.eq('status', status);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) {
      request.log.error({ err: error }, 'Could not list billing orders');
      return reply.code(503).send(UNAVAILABLE);
    }
    const orders = (data ?? []) as OrderRow[];
    const orderIds = orders.map((o) => o.id);
    const userIds = [...new Set(orders.map((o) => o.user_id))];
    const planCodes = [...new Set(orders.map((o) => o.plan_code))];

    const [attempts, plans, profiles, emails] = orders.length === 0
      ? [[], [], [], new Map<string, string | null>()] as const
      : await Promise.all([
        supabase.from('billing_payment_attempts').select('order_id, provider_reference, provider_transaction_id, status, created_at').in('order_id', orderIds)
          .then((r) => (r.data ?? []) as AttemptRow[]),
        supabase.from('billing_plans').select('code, name_vi, name_en').in('code', planCodes)
          .then((r) => (r.data ?? []) as Array<{ code: string; name_vi: string; name_en: string }>),
        supabase.from('profiles').select('id, display_name').in('id', userIds)
          .then((r) => (r.data ?? []) as Array<{ id: string; display_name: string | null }>),
        Promise.all(userIds.map(async (id) => {
          try {
            const { data: found } = await supabase.auth.admin.getUserById(id);
            return [id, found?.user?.email ?? null] as const;
          } catch {
            return [id, null] as const;
          }
        })).then((pairs) => new Map<string, string | null>(pairs)),
      ]);

    // The latest attempt of each order is the one that carries its outcome.
    const latest = new Map<string, AttemptRow>();
    for (const attempt of attempts) {
      const seen = latest.get(attempt.order_id);
      if (!seen || attempt.created_at > seen.created_at) latest.set(attempt.order_id, attempt);
    }
    const planByCode = new Map(plans.map((p) => [p.code, p]));
    const nameById = new Map(profiles.map((p) => [p.id, p.display_name]));

    return {
      page,
      pageSize: limit,
      totalCount: count ?? 0,
      items: orders.map((order) => {
        const attempt = latest.get(order.id);
        const plan = planByCode.get(order.plan_code);
        return {
          id: order.id,
          status: order.status,
          amountVnd: order.amount_vnd,
          interval: order.interval,
          createdAt: order.created_at,
          paidAt: order.paid_at,
          account: { id: order.user_id, email: emails.get(order.user_id) ?? null, displayName: nameById.get(order.user_id) ?? null },
          plan: { code: order.plan_code, nameVi: plan?.name_vi ?? null, nameEn: plan?.name_en ?? null },
          providerReference: attempt?.provider_reference ?? null,
          bankTransactionId: attempt?.provider_transaction_id ?? null,
        };
      }),
    };
  });
};
