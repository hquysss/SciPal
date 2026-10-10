import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { billingCheckoutRoutes } from '../routes/billingCheckout.js';
import { billingMomoRoutes } from '../routes/billingMomo.js';
import { createMomoClient, type MomoClient, type MomoSubscriptionAction, type MomoVerifiedPayment } from '../billing/providers/momo.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const user = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: {} };
const priceId = 'b0000000-0000-4000-8000-000000000001';
const orderId = 'c0000000-0000-4000-8000-000000000001';
const mandateId = 'd0000000-0000-4000-8000-000000000001';
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const future = new Date(Date.now() + 30 * 60_000).toISOString();
const studentOrder = { order_id: orderId, plan_code: 'student_plus', billing_interval: 'month', amount_vnd: 39_000, status: 'pending', expires_at: future, created: true };

const payment: MomoVerifiedPayment = {
  orderId,
  requestId: orderId,
  partnerClientId: user.id,
  amountVnd: 39_000,
  transactionId: 'momo-tx-1',
  resultCode: 0,
  paid: true,
  paidAt: '2026-10-10T00:00:00.000Z',
  callbackToken: 'callback-token',
};

function fakeMomo(overrides: Partial<MomoClient> = {}): MomoClient {
  const client = createMomoClient({
    partnerCode: 'SCIPAL_TEST',
    accessKey: 'access-test',
    secretKey: '0123456789abcdef0123456789abcdef',
    publicKey: 'public key unused in these route tests',
    apiBaseUrl: 'https://momo.test',
  }, async () => new Response('{}'));
  return {
    ...client,
    startSubscription: vi.fn(async () => ({ checkoutUrl: 'https://test-payment.momo.vn/session/1' })),
    getSubscriptionToken: vi.fn(async () => 'encrypted-aes-token'),
    queryCallbackToken: vi.fn(async () => 'callback-token'),
    queryTransaction: vi.fn(async () => ({ resultCode: 42, amountVnd: null, transactionId: null, paidAt: null })),
    chargeSubscription: vi.fn(async () => ({ orderId: 'renewal-order', amountVnd: 39_000, transactionId: 'renewal-tx', resultCode: 0, paidAt: '2026-11-10T00:00:00.000Z' })),
    cancelSubscription: vi.fn(async () => undefined),
    verifyNotification: vi.fn((_value: unknown) => payment),
    verifySubscriptionAction: vi.fn((_value: unknown): MomoSubscriptionAction | null => ({ orderId, requestId: 'action-1', partnerClientId: user.id, action: 'cancel' })),
    ...overrides,
  };
}

function withUser(userValue: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  if (userValue) app.addHook('onRequest', async (request) => { (request as typeof request & { user?: object }).user = userValue; });
  return app;
}

beforeEach(() => { rpcCalls.length = 0; });

describe('MoMo checkout consent', () => {
  it('records consent and persists the order reference before creating subscription checkout', async () => {
    const insert = ok({ id: 'attempt-1' });
    const update = ok();
    const momo = fakeMomo();
    const app = withUser(user, {
      'rpc:billing_create_order': ok([studentOrder]),
      'rpc:billing_prepare_momo_mandate': ok(mandateId),
      billing_payment_attempts: [ok([]), insert, update],
    });
    await app.register(billingCheckoutRoutes, { payos: null, momo, momoIpnUrl: 'https://api.scipal.test/api/billing/webhooks/momo', renewalSchedulerReady: true, webBase: 'https://scipal.test' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      payload: { priceId, provider: 'momo', idempotencyKey: 'momo-click-001', autoRenew: true },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ orderId, checkoutUrl: 'https://test-payment.momo.vn/session/1', status: 'pending' });
    expect(rpcCalls).toContainEqual(['billing_prepare_momo_mandate', { p_user_id: user.id, p_order_id: orderId, p_consent_version: 'momo-subscription-v1' }]);
    expect(insert.inserted[0]).toMatchObject({ order_id: orderId, provider: 'momo', provider_reference: orderId, amount_vnd: 39_000 });
    expect(momo.startSubscription).toHaveBeenCalledWith(expect.objectContaining({ orderId, amountVnd: 39_000, partnerClientId: user.id, interval: 'month' }));
    await app.close();
  });

  it('rejects MoMo without opt-in and payOS with auto-renewal', async () => {
    const app = withUser(user, {});
    await app.register(billingCheckoutRoutes, { payos: null, momo: fakeMomo(), momoIpnUrl: 'https://api.scipal.test/api/billing/webhooks/momo', renewalSchedulerReady: true });
    const missingConsent = await app.inject({ method: 'POST', url: '/api/billing/checkout', payload: { priceId, provider: 'momo', idempotencyKey: 'momo-click-001', autoRenew: false } });
    const payosRenewal = await app.inject({ method: 'POST', url: '/api/billing/checkout', payload: { priceId, provider: 'payos', idempotencyKey: 'payos-click-01', autoRenew: true } });
    expect(missingConsent.statusCode).toBe(400);
    expect(payosRenewal.statusCode).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });
});

describe('MoMo notifications and account controls', () => {
  it('applies only the verified payment and stores the provider mandate after the grant', async () => {
    const momo = fakeMomo();
    const app = withUser(null, {
      'rpc:billing_apply_momo_payment': ok('applied'),
      'rpc:billing_activate_momo_mandate': ok(true),
      billing_mandates: ok({ status: 'pending' }),
    });
    await app.register(billingMomoRoutes, { momo });
    const response = await app.inject({ method: 'POST', url: '/api/billing/webhooks/momo', payload: { signature: 'signed' } });

    expect(response.statusCode).toBe(200);
    expect(rpcCalls[0]).toEqual(['billing_apply_momo_payment', expect.objectContaining({
      p_reference: orderId,
      p_request_id: orderId,
      p_partner_client_id: user.id,
      p_amount_vnd: 39_000,
      p_outcome: 'paid',
      p_fingerprint: `webhook:${orderId}:momo-tx-1`,
    })]);
    expect(momo.getSubscriptionToken).toHaveBeenCalledWith(expect.objectContaining({ orderId, callbackToken: 'callback-token' }));
    expect(rpcCalls[1]).toEqual(['billing_activate_momo_mandate', { p_order_id: orderId, p_provider_token: 'encrypted-aes-token' }]);
    await app.close();
  });

  it('rejects an invalid notification before calling the database', async () => {
    const momo = fakeMomo({ verifyNotification: vi.fn(() => null) });
    const app = withUser(null, {});
    await app.register(billingMomoRoutes, { momo });
    const response = await app.inject({ method: 'POST', url: '/api/billing/webhooks/momo', payload: { signature: 'invalid' } });
    expect(response.statusCode).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('confirms cancellation only after MoMo succeeds', async () => {
    const cancel = vi.fn(async () => {
      expect(rpcCalls[0]?.[0]).toBe('billing_begin_momo_cancellation');
    });
    const momo = fakeMomo({ cancelSubscription: cancel });
    const app = withUser(user, {
      'rpc:billing_begin_momo_cancellation': ok([{ mandate_id: mandateId, initial_order_id: orderId, partner_client_id: user.id, aes_token: 'encrypted-aes-token', status: 'cancel_pending' }]),
      'rpc:billing_confirm_momo_cancellation': ok(true),
    });
    await app.register(billingMomoRoutes, { momo });
    const response = await app.inject({ method: 'POST', url: '/api/billing/renewal/cancel' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'cancelled' });
    expect(momo.cancelSubscription).toHaveBeenCalledWith({ orderId: `cancel-${mandateId}`, requestId: `cancel-${mandateId}`, partnerClientId: user.id, aesToken: 'encrypted-aes-token' });
    expect(rpcCalls[1]).toEqual(['billing_confirm_momo_cancellation', { p_mandate_id: mandateId, p_status: 'cancelled' }]);
    await app.close();
  });

  it('protects the daily renewal worker with CRON_SECRET', async () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'test-cron-secret';
    try {
      const app = withUser(null, { 'rpc:billing_claim_momo_renewals': ok([]) });
      await app.register(billingMomoRoutes, { momo: fakeMomo() });
      expect((await app.inject({ method: 'GET', url: '/api/internal/billing/renewals/run', headers: { authorization: 'Bearer wrong' } })).statusCode).toBe(401);
      const response = await app.inject({ method: 'GET', url: '/api/internal/billing/renewals/run', headers: { authorization: 'Bearer test-cron-secret' } });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ claimed: 0, applied: 0, failed: 0, pending: 0 });
      expect(rpcCalls).toContainEqual(['billing_claim_momo_renewals', { p_limit: 20 }]);
      await app.close();
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });

  it('does not start scheduled renewals while the billing kill switch is on', async () => {
    const oldCron = process.env.CRON_SECRET;
    const oldDisabled = process.env.BILLING_CHECKOUT_DISABLED;
    process.env.CRON_SECRET = 'test-cron-secret';
    process.env.BILLING_CHECKOUT_DISABLED = 'true';
    try {
      const app = withUser(null, {});
      await app.register(billingMomoRoutes, { momo: fakeMomo() });
      const response = await app.inject({ method: 'GET', url: '/api/internal/billing/renewals/run', headers: { authorization: 'Bearer test-cron-secret' } });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ claimed: 0, disabled: true });
      expect(rpcCalls).toHaveLength(0);
      await app.close();
    } finally {
      if (oldCron === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = oldCron;
      if (oldDisabled === undefined) delete process.env.BILLING_CHECKOUT_DISABLED;
      else process.env.BILLING_CHECKOUT_DISABLED = oldDisabled;
    }
  });
});
