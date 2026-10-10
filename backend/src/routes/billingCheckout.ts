import { createHash, randomInt } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { checkoutDisabled, payosFromEnv, type PayosClient } from '../billing/providers/payos.js';
import { momoFromEnv, type MomoClient } from '../billing/providers/momo.js';
import { applyVerifiedMomoPayment } from '../billing/momoPayments.js';
import { featureAllowed, featureOff } from '../site/features.js';

// Checkout by payOS QR and the order it pays (billing plan Task 6, spec §6–7).
// - The order and its payment reference are saved before payOS is asked for a link.
// - A plan is granted only from a verified webhook or from payOS answering our own query, by
//   billing_apply_payment in one transaction; the return URL of the browser grants nothing.

const ORDER_MINUTES = 30;
const DESCRIPTION = 'SCIPAL'; // at most 9 characters for banks not linked to payOS
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ErrorBody = { code: string; error: string; error_en: string };
const err = (code: string, error: string, error_en: string): ErrorBody => ({ code, error, error_en });
const INVALID = err('INVALID_CHECKOUT', 'Yêu cầu thanh toán không hợp lệ.', 'The checkout request is not valid.');
const CLOSED = err('CHECKOUT_CLOSED', 'Thanh toán chưa mở. Thử lại sau.', 'Checkout is not open yet. Try again later.');
const NOT_FOUND = err('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.', 'Order not found.');
const UNAVAILABLE = err('BILLING_UNAVAILABLE', 'Chưa xử lý được thanh toán. Thử lại sau.', 'Payment could not be processed. Try again later.');
const NOT_PENDING = err('ORDER_NOT_PENDING', 'Đơn này không còn chờ thanh toán nên không hủy được.', 'This order is no longer waiting for payment, so it cannot be cancelled.');
const PROVIDER = err('PAYMENT_PROVIDER_ERROR', 'Cổng thanh toán chưa tạo được mã QR. Thử lại sau ít phút.', 'The payment provider could not create the QR code. Try again in a few minutes.');
const MOMO_PROVIDER = err('MOMO_PROVIDER_ERROR', 'MoMo chưa tạo được liên kết gia hạn. Thử lại sau ít phút.', 'MoMo could not create the renewal link. Try again in a few minutes.');
const RENEWAL_CANCELLATION_PENDING = err('RENEWAL_CANCELLATION_PENDING', 'MoMo chưa xác nhận hủy gia hạn. Chưa tạo thanh toán QR mới; hãy kiểm tra lại sau.', 'MoMo has not confirmed renewal cancellation. No new QR payment was created; check again later.');
const REFUSALS: Record<string, [number, ErrorBody]> = {
  PLAN_NOT_FOR_ROLE: [403, err('PLAN_NOT_FOR_ROLE', 'Gói này dành cho vai trò khác với tài khoản của bạn.', 'This plan is for a different role than your account.')],
  UNSUPPORTED_BILLING_ROLE: [403, err('UNSUPPORTED_BILLING_ROLE', 'Tài khoản quản trị không mua gói.', 'Admin accounts do not buy plans.')],
  IDEMPOTENCY_CONFLICT: [409, err('IDEMPOTENCY_CONFLICT', 'Yêu cầu này đã được dùng cho đơn khác. Tải lại trang rồi thử lại.', 'This request was already used for another order. Reload the page and try again.')],
  PRICE_NOT_AVAILABLE: [400, err('PRICE_NOT_AVAILABLE', 'Giá này không còn bán. Tải lại bảng giá.', 'This price is no longer offered. Reload the pricing page.')],
  BILLING_ACCOUNT_NOT_FOUND: [404, err('BILLING_ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.', 'Account not found.')],
  ACTIVE_MOMO_MANDATE_EXISTS: [409, err('ACTIVE_MOMO_MANDATE_EXISTS', 'Hãy hủy gia hạn MoMo hiện tại trước khi đăng ký gia hạn mới.', 'Cancel the current MoMo renewal before starting another one.')],
  MOMO_ORDER_NOT_PENDING: [409, err('MOMO_ORDER_NOT_PENDING', 'Đơn MoMo không còn chờ thanh toán.', 'This MoMo order is no longer pending.')],
  MOMO_MANDATE_NOT_PENDING: [409, err('MOMO_MANDATE_NOT_PENDING', 'Ủy quyền MoMo không còn ở trạng thái chờ.', 'This MoMo authorization is no longer pending.')],
};

const CheckoutInput = z.object({
  priceId: z.string().regex(UUID),
  provider: z.enum(['payos', 'momo']),
  idempotencyKey: z.string().min(8).max(120),
  autoRenew: z.boolean(),
}).strict().refine((input) => input.provider === 'momo' ? input.autoRenew : !input.autoRenew);

type OrderRow = { order_id: string; plan_code: string; billing_interval: 'month' | 'year'; amount_vnd: number; status: string; expires_at: string; created: boolean };
type StoredOrder = { id: string; user_id: string | null; plan_code: string; interval: string; amount_vnd: number; status: string; expires_at: string; paid_at: string | null };
type Attempt = { id: string; provider: string; provider_reference: string; status: string; checkout_url: string | null };

/** payOS order codes are integers; seconds × 1000 + a random suffix stays unique in practice (unique index backs it). */
const newOrderCode = () => Math.floor(Date.now() / 1000) * 1000 + randomInt(1000);

export const billingCheckoutRoutes: FastifyPluginAsync<{ payos?: PayosClient | null; momo?: MomoClient | null; momoIpnUrl?: string; renewalSchedulerReady?: boolean; webBase?: string }> = async (app, opts) => {
  const payos = opts.payos === undefined ? payosFromEnv() : opts.payos;
  const momo = opts.momo === undefined ? momoFromEnv() : opts.momo;
  const momoIpnUrl = opts.momoIpnUrl ?? process.env.MOMO_IPN_URL;
  const schedulerReady = opts.renewalSchedulerReady ?? Boolean(process.env.CRON_SECRET);
  const momoAvailable = momo !== null && Boolean(momoIpnUrl && URL.canParse(momoIpnUrl) && new URL(momoIpnUrl).protocol === 'https:') && schedulerReady;
  const webBase = (opts.webBase ?? process.env.WEB_APP_URL ?? process.env.CORS_ORIGINS?.split(',')[0] ?? 'https://sci-pal-frontend.vercel.app').replace(/\/+$/, '');
  const userOf = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id: string } }).user;

  const attemptsOf = async (orderId: string): Promise<Attempt[]> => {
    const { data, error } = await app.supabase!
      .from('billing_payment_attempts')
      .select('id, provider, provider_reference, status, checkout_url')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Attempt[];
  };

  const refuse = (request: FastifyRequest, reply: FastifyReply, error: unknown) => {
    const message = (error as { message?: string } | null)?.message ?? '';
    const known = REFUSALS[message];
    if (known) return reply.code(known[0]).send(known[1]);
    request.log.error({ err: error }, 'Checkout failed');
    return reply.code(503).send(UNAVAILABLE);
  };

  const cancelMomoBeforeQr = async (userId: string): Promise<boolean> => {
    const { data, error } = await app.supabase!.rpc('billing_begin_momo_cancellation', { p_user_id: userId });
    if (error) throw error;
    const mandates = (Array.isArray(data) ? data : []) as Array<{ mandate_id: string; partner_client_id: string; aes_token: string | null }>;
    const mandate = mandates[0];
    if (!mandate) return true;
    if (!momo || !mandate.aes_token) return false;
    const requestId = `cancel-${mandate.mandate_id}`;
    try {
      await momo.cancelSubscription({ orderId: requestId, requestId, partnerClientId: mandate.partner_client_id, aesToken: mandate.aes_token });
    } catch {
      return false;
    }
    const confirmed = await app.supabase!.rpc('billing_confirm_momo_cancellation', { p_mandate_id: mandate.mandate_id, p_status: 'cancelled' });
    if (confirmed.error) throw confirmed.error;
    return confirmed.data === true;
  };

  app.post('/api/billing/checkout', async (request, reply) => {
    const parsed = CheckoutInput.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(INVALID);
    const input = parsed.data;
    if (checkoutDisabled() || (input.provider === 'payos' ? !payos : !momoAvailable)) return reply.code(503).send(CLOSED);
    const user = userOf(request)!;
    if (!(await featureAllowed(app, 'pricing', user as never))) return reply.code(403).send(featureOff('pricing'));
    const supabase = app.supabase!;
    const payloadHash = createHash('sha256').update(JSON.stringify([input.priceId, input.provider, input.autoRenew])).digest('hex');

    let order: OrderRow;
    let attempts: Attempt[];
    try {
      const { data, error } = await supabase.rpc('billing_create_order', {
        p_user_id: user.id,
        p_price_id: input.priceId,
        p_idempotency_key: input.idempotencyKey,
        p_payload_hash: payloadHash,
        p_expires_at: new Date(Date.now() + ORDER_MINUTES * 60_000).toISOString(),
      });
      if (error) return refuse(request, reply, error);
      order = (Array.isArray(data) ? data[0] : data) as OrderRow;
      if (!order?.order_id) throw new Error('billing_create_order returned no order');
      attempts = await attemptsOf(order.order_id);
    } catch (error) {
      return refuse(request, reply, error);
    }

    const answer = (status: string, checkoutUrl: string | null) => ({ orderId: order.order_id, status, checkoutUrl, expiresAt: new Date(order.expires_at).toISOString() });
    if (order.status !== 'pending') return reply.code(200).send(answer(order.status, null));
    if (new Date(order.expires_at) <= new Date()) return reply.code(200).send(answer('expired', null));

    if (input.provider === 'payos') {
      try {
        if (!(await cancelMomoBeforeQr(user.id))) return reply.code(202).send(RENEWAL_CANCELLATION_PENDING);
      } catch (error) {
        return refuse(request, reply, error);
      }
    }

    const open = attempts.find((a) => a.provider === input.provider && a.status === 'pending');
    if (open?.checkout_url) return reply.code(200).send(answer('pending', open.checkout_url));

    if (input.provider === 'momo') {
      if (!momo || !momoAvailable || !momoIpnUrl) return reply.code(503).send(CLOSED);
      const consent = await supabase.rpc('billing_prepare_momo_mandate', {
        p_user_id: user.id,
        p_order_id: order.order_id,
        p_consent_version: 'momo-subscription-v1',
      });
      if (consent.error) return refuse(request, reply, consent.error);

      let attemptId = open?.id;
      if (!attemptId) {
        const saved = await supabase.from('billing_payment_attempts')
          .insert({ order_id: order.order_id, provider: 'momo', provider_reference: order.order_id, amount_vnd: order.amount_vnd })
          .select('id')
          .single();
        if (saved.error || !saved.data) return refuse(request, reply, saved.error);
        attemptId = (saved.data as { id: string }).id;
      }

      let link: { checkoutUrl: string };
      try {
        link = await momo.startSubscription({
          orderId: order.order_id,
          amountVnd: order.amount_vnd,
          orderInfo: `SciPal ${order.plan_code} ${order.billing_interval}`,
          partnerClientId: user.id,
          redirectUrl: `${webBase}/checkout/${order.order_id}`,
          ipnUrl: momoIpnUrl,
          subscriptionName: `SciPal ${order.plan_code}`,
          interval: order.billing_interval,
        });
      } catch (error) {
        request.log.warn({ orderId: order.order_id }, 'MoMo could not create a subscription checkout');
        return reply.code(502).send(MOMO_PROVIDER);
      }
      const stored = await supabase.from('billing_payment_attempts').update({ checkout_url: link.checkoutUrl }).eq('id', attemptId);
      if (stored.error) request.log.error({ orderId: order.order_id }, 'MoMo checkout link was not stored');
      return reply.code(201).send(answer('pending', link.checkoutUrl));
    }

    if (!payos) return reply.code(503).send(CLOSED);
    if (open) {
      // A link whose answer never reached us: cancel it at payOS before making another.
      await payos.cancelPaymentLink(Number(open.provider_reference)).catch(() => undefined);
      const { error } = await supabase.from('billing_payment_attempts').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', open.id);
      if (error) return refuse(request, reply, error);
    }

    const orderCode = newOrderCode();
    const saved = await supabase
      .from('billing_payment_attempts')
      .insert({ order_id: order.order_id, provider: 'payos', provider_reference: String(orderCode), amount_vnd: order.amount_vnd })
      .select('id')
      .single();
    if (saved.error || !saved.data) return refuse(request, reply, saved.error);
    const attemptId = (saved.data as { id: string }).id;

    let link: { checkoutUrl: string };
    try {
      link = await payos.createPaymentLink({
        orderCode,
        amount: order.amount_vnd,
        description: DESCRIPTION,
        returnUrl: `${webBase}/checkout/${order.order_id}`,
        cancelUrl: `${webBase}/checkout/${order.order_id}`,
        expiredAt: Math.floor(new Date(order.expires_at).getTime() / 1000),
      });
    } catch (error) {
      request.log.warn({ err: error, orderId: order.order_id }, 'payOS could not create a payment link');
      return reply.code(502).send(PROVIDER);
    }
    const stored = await supabase.from('billing_payment_attempts').update({ checkout_url: link.checkoutUrl }).eq('id', attemptId);
    if (stored.error) request.log.error({ err: stored.error, orderId: order.order_id }, 'Payment link was not stored');
    return reply.code(201).send(answer('pending', link.checkoutUrl));
  });

  /** Applies what payOS itself reports for a pending attempt (a webhook may be late or lost). */
  const syncWithPayos = async (request: FastifyRequest, attempt: Attempt): Promise<{ changed: boolean; providerStatus: string | null }> => {
    if (!payos) return { changed: false, providerStatus: null };
    const orderCode = Number(attempt.provider_reference);
    let status;
    try {
      status = await payos.getPaymentLink(orderCode);
    } catch (error) {
      request.log.warn({ err: error, orderCode }, 'payOS status query failed');
      return { changed: false, providerStatus: null };
    }
    const calls: Array<Record<string, unknown>> = [];
    if (status.status === 'PAID') {
      for (const t of status.transactions) {
        calls.push({ p_transaction_id: t.reference, p_amount_vnd: t.amount, p_outcome: 'paid', p_paid_at: t.paidAt, p_fingerprint: `query:${attempt.provider_reference}:${t.reference}` });
      }
    } else if (status.status === 'CANCELLED' || status.status === 'EXPIRED') {
      const outcome = status.status === 'CANCELLED' ? 'cancelled' : 'expired';
      calls.push({ p_transaction_id: null, p_amount_vnd: null, p_outcome: outcome, p_paid_at: null, p_fingerprint: `query:${attempt.provider_reference}:${outcome}` });
    }
    for (const call of calls) {
      const { error } = await app.supabase!.rpc('billing_apply_payment', { p_provider: 'payos', p_reference: attempt.provider_reference, ...call, p_event_type: 'query' });
      if (error) {
        request.log.error({ err: error, orderCode }, 'Payment from the payOS query was not applied');
        return { changed: false, providerStatus: status.status };
      }
    }
    return { changed: calls.length > 0, providerStatus: status.status };
  };

  const syncWithMomo = async (request: FastifyRequest, order: StoredOrder, attempt: Attempt): Promise<void> => {
    if (!momo || !order.user_id) return;
    try {
      const status = await momo.queryTransaction({ orderId: attempt.provider_reference, requestId: attempt.provider_reference });
      if (status.resultCode !== 0 || status.amountVnd === null || !status.transactionId) return;
      await applyVerifiedMomoPayment(app.supabase!, momo, {
        orderId: attempt.provider_reference,
        requestId: attempt.provider_reference,
        partnerClientId: order.user_id,
        amountVnd: status.amountVnd,
        transactionId: status.transactionId,
        resultCode: status.resultCode,
        paid: true,
        paidAt: status.paidAt,
        callbackToken: null,
      }, 'query', `query:${attempt.provider_reference}:${status.transactionId}`, (orderId) => {
        request.log.warn({ orderId }, 'MoMo mandate activation is pending after payment verification');
      });
    } catch {
      request.log.warn({ orderId: order.id }, 'MoMo status query could not be completed');
    }
  };

  const readOrder = async (id: string) => {
    const { data, error } = await app.supabase!
      .from('billing_orders')
      .select('id, user_id, plan_code, interval, amount_vnd, status, expires_at, paid_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as StoredOrder | null;
  };

  /** Cancels an order only while it is still pending: a payment landing meanwhile wins. */
  const markCancelled = async (id: string) => {
    const { data, error } = await app.supabase!.from('billing_orders').update({ status: 'cancelled' }).eq('id', id).eq('status', 'pending').select('id');
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  };

  const orderView = (order: StoredOrder, open: Attempt | undefined) => {
    const expired = order.status === 'pending' && new Date(order.expires_at) <= new Date();
    const status = expired ? 'expired' : order.status;
    return {
      id: order.id,
      planCode: order.plan_code,
      interval: order.interval,
      amountVnd: order.amount_vnd,
      status,
      expiresAt: new Date(order.expires_at).toISOString(),
      paidAt: order.paid_at ? new Date(order.paid_at).toISOString() : null,
      checkoutUrl: status === 'pending' ? open?.checkout_url ?? null : null,
    };
  };

  app.get('/api/billing/orders/:id', async (request, reply) => {
    const user = userOf(request)!;
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) return reply.code(404).send(NOT_FOUND);
    try {
      let order = await readOrder(id);
      if (!order || order.user_id !== user.id) return reply.code(404).send(NOT_FOUND);
      let attempts = await attemptsOf(order.id);
      const openPayos = attempts.find((a) => a.provider === 'payos' && a.status === 'pending');
      if (order.status === 'pending' && openPayos) {
        const sync = await syncWithPayos(request, openPayos);
        // Cancelled on the payOS page: the order is cancelled too.
        const cancelled = sync.providerStatus === 'CANCELLED' && (await markCancelled(order.id));
        if (sync.changed || cancelled) order = (await readOrder(id)) ?? order;
      }
      const momoAttempt = attempts.find((a) => a.provider === 'momo');
      if (momoAttempt && order.status === 'pending') {
        await syncWithMomo(request, order, momoAttempt);
        order = (await readOrder(id)) ?? order;
        attempts = await attemptsOf(order.id);
      } else if (momoAttempt && order.status === 'paid') {
        const { data: mandate, error } = await app.supabase!
          .from('billing_mandates')
          .select('id')
          .eq('order_id', order.id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();
        if (error) throw error;
        if (mandate) await syncWithMomo(request, order, momoAttempt);
      }
      const open = attempts.find((a) => a.status === 'pending');
      return orderView(order, open);
    } catch (error) {
      request.log.error({ err: error }, 'Order could not be read');
      return reply.code(503).send(UNAVAILABLE);
    }
  });

  // The buyer gives up a pending order. payOS is asked first: money already sent is applied, and
  // the link is cancelled there before the order is cancelled here.
  app.post('/api/billing/orders/:id/cancel', async (request, reply) => {
    const user = userOf(request)!;
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) return reply.code(404).send(NOT_FOUND);
    try {
      let order = await readOrder(id);
      if (!order || order.user_id !== user.id) return reply.code(404).send(NOT_FOUND);
      const notPending = (o: StoredOrder) => reply.code(409).send({ ...NOT_PENDING, status: orderView(o, undefined).status });
      if (order.status !== 'pending') return notPending(order);
      const attempts = await attemptsOf(order.id);
      const open = attempts.find((a) => a.provider === 'payos' && a.status === 'pending');
      if (open) {
        const sync = await syncWithPayos(request, open);
        if (sync.changed) {
          order = (await readOrder(id)) ?? order;
          if (order.status !== 'pending') return notPending(order);
        }
        if (sync.providerStatus !== 'CANCELLED' && payos) {
          try {
            await payos.cancelPaymentLink(Number(open.provider_reference));
          } catch (error) {
            request.log.warn({ err: error, orderId: id }, 'payOS could not cancel the payment link');
            return reply.code(502).send(PROVIDER);
          }
        }
        const { error } = await app.supabase!.from('billing_payment_attempts').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', open.id);
        if (error) throw error;
      }
      if (!(await markCancelled(id))) {
        const latest = (await readOrder(id)) ?? order;
        return notPending(latest);
      }
      return orderView({ ...order, status: 'cancelled' }, undefined);
    } catch (error) {
      request.log.error({ err: error }, 'Order could not be cancelled');
      return reply.code(503).send(UNAVAILABLE);
    }
  });

  // The account's own orders (payment receipts, not tax invoices), newest first.
  const TransactionsQuery = z.object({
    cursor: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }).strict();
  app.get('/api/billing/transactions', async (request, reply) => {
    const parsed = TransactionsQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send(INVALID);
    const { cursor, limit } = parsed.data;
    const user = userOf(request)!;
    let query = app.supabase!
      .from('billing_orders')
      .select('id, plan_code, interval, amount_vnd, status, expires_at, paid_at, created_at')
      .eq('user_id', user.id);
    if (cursor) query = query.lt('created_at', new Date(cursor).toISOString());
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit + 1);
    if (error) {
      request.log.error({ err: error }, 'Transactions could not be read');
      return reply.code(503).send(UNAVAILABLE);
    }
    const rows = (data ?? []) as Array<StoredOrder & { created_at: string }>;
    const page = rows.slice(0, limit);
    const now = new Date();
    const items = page.map((o) => ({
      id: o.id,
      planCode: o.plan_code,
      interval: o.interval,
      amountVnd: o.amount_vnd,
      status: o.status === 'pending' && new Date(o.expires_at) <= now ? 'expired' : o.status,
      createdAt: new Date(o.created_at).toISOString(),
      paidAt: o.paid_at ? new Date(o.paid_at).toISOString() : null,
    }));
    return { items, nextCursor: rows.length > limit ? items[items.length - 1].createdAt : null };
  });

  // Public: payOS calls it. Only a correctly signed body is used.
  app.post('/api/billing/webhooks/payos', async (request, reply) => {
    if (!payos) return reply.code(503).send(CLOSED);
    const payment = payos.verifyWebhook(request.body as Parameters<PayosClient['verifyWebhook']>[0]);
    if (!payment) {
      request.log.warn('payOS webhook with a wrong signature was ignored');
      return reply.code(400).send({ success: false });
    }
    const { error } = await app.supabase!.rpc('billing_apply_payment', {
      p_provider: 'payos',
      p_reference: String(payment.orderCode),
      p_transaction_id: payment.reference,
      p_amount_vnd: payment.amount,
      p_outcome: payment.paid ? 'paid' : 'failed',
      p_paid_at: payment.paidAt,
      p_fingerprint: `webhook:${payment.paymentLinkId}:${payment.reference}`,
      p_event_type: 'webhook',
    });
    if (error) {
      request.log.error({ err: error, orderCode: payment.orderCode }, 'payOS payment was not applied');
      return reply.code(500).send({ success: false });
    }
    return { success: true };
  });
};
