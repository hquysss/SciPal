import { timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { applyVerifiedMomoPayment } from '../billing/momoPayments.js';
import { runMomoRenewals, type MomoRenewalAttempt } from '../billing/renewals.js';
import { momoFromEnv, type MomoClient, type MomoVerifiedPayment } from '../billing/providers/momo.js';
import { checkoutDisabled } from '../billing/providers/payos.js';

const Claim = z.array(z.object({
  attempt_id: z.string().uuid(),
  mandate_id: z.string().uuid(),
  order_id: z.string(),
  initial_order_id: z.string(),
  request_id: z.string(),
  partner_client_id: z.string().uuid(),
  amount_vnd: z.number().int().positive(),
  billing_interval: z.enum(['month', 'year']),
  next_payment_date: z.string(),
  aes_token: z.string().min(1),
  state: z.enum(['ready', 'unknown']),
}));

const UNAVAILABLE = { code: 'BILLING_UNAVAILABLE', error: 'Chưa xử lý được yêu cầu gia hạn. Thử lại sau.', error_en: 'The renewal request could not be processed. Try again later.' };
const PROVIDER_PENDING = { code: 'RENEWAL_CANCELLATION_PENDING', error: 'MoMo chưa xác nhận việc hủy. Không tạo thêm lần thu mới; hãy kiểm tra lại sau.', error_en: 'MoMo has not confirmed cancellation yet. No new charges will be started; check again later.' };

function cronAuthorized(header: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const received = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export const billingMomoRoutes: FastifyPluginAsync<{ momo?: MomoClient | null }> = async (app, opts) => {
  const momo = opts.momo === undefined ? momoFromEnv() : opts.momo;
  const userOf = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id: string } }).user;

  app.post('/api/billing/webhooks/momo', async (request, reply) => {
    if (!momo) return reply.code(503).send(UNAVAILABLE);
    const body = request.body as Record<string, unknown> | null;
    if (body?.tokenType === 'subscription' || ['pause', 'cancel', 'lock', 'expire'].includes(String(body?.requestType))) {
      const action = momo.verifySubscriptionAction(body);
      if (!action) return reply.code(400).send({ success: false });
      const { error } = await app.supabase!.rpc('billing_apply_momo_subscription_action', {
        p_order_id: action.orderId,
        p_partner_client_id: action.partnerClientId,
        p_action: action.action,
      });
      if (error) {
        request.log.error({ err: error }, 'MoMo subscription action was not applied');
        return reply.code(500).send({ success: false });
      }
      return reply.code(204).send();
    }

    const payment = momo.verifyNotification(body);
    if (!payment) return reply.code(400).send({ success: false });
    try {
      await applyVerifiedMomoPayment(
        app.supabase!,
        momo,
        payment,
        'webhook',
        payment.transactionId ? `webhook:${payment.orderId}:${payment.transactionId}` : `webhook:${payment.orderId}:${payment.requestId}:${payment.resultCode}`,
        (orderId) => request.log.warn({ orderId }, 'MoMo mandate activation is pending after payment verification'),
      );
      return { success: true };
    } catch (error) {
      request.log.error({ err: error }, 'Verified MoMo payment could not be applied');
      return reply.code(500).send({ success: false });
    }
  });

  app.post('/api/billing/renewal/cancel', async (request, reply) => {
    const user = userOf(request)!;
    if (!momo) return reply.code(503).send(UNAVAILABLE);
    try {
      const { data, error } = await app.supabase!.rpc('billing_begin_momo_cancellation', { p_user_id: user.id });
      if (error) throw error;
      const records = (Array.isArray(data) ? data : []) as Array<{
        mandate_id: string; initial_order_id: string; partner_client_id: string; aes_token: string | null; status: string;
      }>;
      const mandate = records[0];
      if (!mandate) return { status: 'cancelled' };
      if (!mandate.aes_token) return reply.code(202).send(PROVIDER_PENDING);
      try {
        const requestId = `cancel-${mandate.mandate_id}`;
        await momo.cancelSubscription({
          orderId: requestId,
          requestId,
          partnerClientId: mandate.partner_client_id,
          aesToken: mandate.aes_token,
        });
      } catch {
        return reply.code(202).send(PROVIDER_PENDING);
      }
      const confirmed = await app.supabase!.rpc('billing_confirm_momo_cancellation', {
        p_mandate_id: mandate.mandate_id,
        p_status: 'cancelled',
      });
      if (confirmed.error || confirmed.data !== true) return reply.code(202).send(PROVIDER_PENDING);
      return { status: 'cancelled' };
    } catch (error) {
      request.log.error({ err: error }, 'MoMo renewal could not be cancelled');
      return reply.code(503).send(UNAVAILABLE);
    }
  });

  app.get('/api/internal/billing/renewals/run', async (request, reply) => {
    if (!cronAuthorized(request.headers.authorization)) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    if (checkoutDisabled()) return { claimed: 0, applied: 0, failed: 0, pending: 0, disabled: true };
    if (!momo) return reply.code(503).send(UNAVAILABLE);
    try {
      const { data, error } = await app.supabase!.rpc('billing_claim_momo_renewals', { p_limit: 20 });
      if (error) throw error;
      const rows = Claim.parse(data ?? []);
      const attempts: MomoRenewalAttempt[] = rows.map((row) => ({
        attemptId: row.attempt_id,
        mandateId: row.mandate_id,
        orderId: row.order_id,
        initialOrderId: row.initial_order_id,
        requestId: row.request_id,
        partnerClientId: row.partner_client_id,
        amountVnd: row.amount_vnd,
        interval: row.billing_interval,
        nextPaymentDate: row.next_payment_date,
        aesToken: row.aes_token,
        state: row.state,
      }));
      const result = await runMomoRenewals({
        claimDue: async () => attempts,
        momo,
        apply: async (item, payment) => {
          const verified: MomoVerifiedPayment = {
            orderId: payment.orderId,
            requestId: item.requestId,
            partnerClientId: item.partnerClientId,
            amountVnd: payment.amountVnd,
            transactionId: payment.transactionId,
            resultCode: payment.resultCode,
            paid: payment.resultCode === 0,
            paidAt: payment.paidAt,
            callbackToken: null,
          };
          const outcome = await applyVerifiedMomoPayment(
            app.supabase!, momo, verified, 'renewal', `renewal:${payment.orderId}:${payment.transactionId ?? 'unknown'}`,
            (orderId) => app.log.warn({ orderId }, 'MoMo renewal mandate activation is pending after payment verification'),
          );
          if (!['applied', 'duplicate', 'reconciliation'].includes(outcome)) throw new Error('MoMo renewal payment was not recorded');
          return outcome as 'applied' | 'duplicate' | 'reconciliation';
        },
        markUnknown: async (item) => {
          const result = await app.supabase!.rpc('billing_mark_momo_renewal_unknown', { p_attempt_id: item.attemptId });
          if (result.error) throw result.error;
        },
        markFailed: async (item, resultCode) => {
          const result = await app.supabase!.rpc('billing_mark_momo_renewal_failed', { p_attempt_id: item.attemptId, p_result_code: resultCode });
          if (result.error) throw result.error;
        },
      });
      return result;
    } catch (error) {
      request.log.error({ err: error }, 'MoMo renewal worker failed');
      return reply.code(503).send(UNAVAILABLE);
    }
  });
};
