import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { billingCheckoutRoutes } from '../routes/billingCheckout.js';
import type { PayosClient, PayosPayment } from '../billing/providers/payos.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const student = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: {} };
const other = { id: 'a0000000-0000-4000-8000-000000000009', app_metadata: {} };
const PRICE = 'b0000000-0000-4000-8000-000000000001';
const ORDER = 'c0000000-0000-4000-8000-000000000001';
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const fail = (message: string) => mockQuery({ data: null, error: { code: 'P0001', message } });
const future = () => new Date(Date.now() + 30 * 60_000).toISOString();
const orderRow = (patch: Record<string, unknown> = {}) => ({
  order_id: ORDER, plan_code: 'student_plus', billing_interval: 'month', amount_vnd: 39000, status: 'pending', expires_at: future(), created: true, ...patch,
});
const input = { priceId: PRICE, provider: 'payos', idempotencyKey: 'click-0001-abcd', autoRenew: false };

function fakePayos(overrides: Partial<PayosClient> = {}): PayosClient {
  return {
    createPaymentLink: vi.fn().mockResolvedValue({ checkoutUrl: 'https://pay.payos.vn/web/new', paymentLinkId: 'new' }),
    getPaymentLink: vi.fn(),
    cancelPaymentLink: vi.fn().mockResolvedValue(undefined),
    verifyWebhook: vi.fn(),
    ...overrides,
  } as PayosClient;
}

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>, payos: PayosClient | null = fakePayos()) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  if (user) app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(billingCheckoutRoutes, { payos, webBase: 'https://scipal.test' });
  await app.ready();
  return app;
}
const checkout = (app: Awaited<ReturnType<typeof build>>, payload: unknown = input) => app.inject({ method: 'POST', url: '/api/billing/checkout', payload });

beforeEach(() => { rpcCalls.length = 0; });

describe('POST /api/billing/checkout', () => {
  it('saves the order and its payment reference before asking payOS, at the price of the database', async () => {
    const insert = ok({ id: 'attempt-1' });
    const update = ok();
    const payos = fakePayos();
    const app = await build(student, { 'rpc:billing_create_order': ok([orderRow()]), billing_payment_attempts: [ok([]), insert, update] }, payos);
    const res = await checkout(app);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ orderId: ORDER, checkoutUrl: 'https://pay.payos.vn/web/new', status: 'pending' });
    expect(rpcCalls[0][1]).toMatchObject({ p_user_id: student.id, p_price_id: PRICE, p_idempotency_key: 'click-0001-abcd' });
    const attempt = insert.inserted[0] as { order_id: string; provider: string; provider_reference: string; amount_vnd: number };
    expect(attempt).toMatchObject({ order_id: ORDER, provider: 'payos', amount_vnd: 39000 });
    expect(attempt.provider_reference).toMatch(/^\d{10,15}$/);
    const link = (payos.createPaymentLink as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(link).toMatchObject({ orderCode: Number(attempt.provider_reference), amount: 39000, returnUrl: `https://scipal.test/checkout/${ORDER}`, cancelUrl: `https://scipal.test/checkout/${ORDER}` });
    expect(link.description.length).toBeLessThanOrEqual(9);
    expect(update.updated[0]).toEqual({ checkout_url: 'https://pay.payos.vn/web/new' });
    await app.close();
  });

  it('refuses a client that sends its own amount, account, or auto-renewal', async () => {
    const app = await build(student, {});
    expect((await checkout(app, { ...input, amountVnd: 1 })).statusCode).toBe(400);
    expect((await checkout(app, { ...input, userId: other.id })).statusCode).toBe(400);
    expect((await checkout(app, { ...input, autoRenew: true })).statusCode).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('opens the same payment page again for the same click, without a second link', async () => {
    const payos = fakePayos();
    const app = await build(student, {
      'rpc:billing_create_order': ok([orderRow({ created: false })]),
      billing_payment_attempts: ok([{ id: 'attempt-1', provider: 'payos', provider_reference: '1234567890', status: 'pending', checkout_url: 'https://pay.payos.vn/web/old' }]),
    }, payos);
    const res = await checkout(app);
    expect(res.statusCode).toBe(200);
    expect(res.json().checkoutUrl).toBe('https://pay.payos.vn/web/old');
    expect(payos.createPaymentLink).not.toHaveBeenCalled();
    await app.close();
  });

  it('does not reopen payment for an order already paid', async () => {
    const payos = fakePayos();
    const app = await build(student, { 'rpc:billing_create_order': ok([orderRow({ created: false, status: 'paid' })]), billing_payment_attempts: ok([]) }, payos);
    const res = await checkout(app);
    expect(res.json()).toMatchObject({ orderId: ORDER, status: 'paid', checkoutUrl: null });
    expect(payos.createPaymentLink).not.toHaveBeenCalled();
    await app.close();
  });

  it('answers each refusal of the database in both languages', async () => {
    for (const [message, status] of [['PLAN_NOT_FOR_ROLE', 403], ['UNSUPPORTED_BILLING_ROLE', 403], ['IDEMPOTENCY_CONFLICT', 409], ['PRICE_NOT_AVAILABLE', 400]] as const) {
      const app = await build(student, { 'rpc:billing_create_order': fail(message) });
      const res = await checkout(app);
      expect(res.statusCode).toBe(status);
      expect(res.json()).toMatchObject({ code: message });
      expect(res.json().error).toBeTruthy();
      expect(res.json().error_en).toBeTruthy();
      await app.close();
    }
  });

  it('is closed while payOS is not configured, and says so when payOS fails', async () => {
    const closed = await build(student, {}, null);
    expect((await checkout(closed)).statusCode).toBe(503);
    await closed.close();

    const payos = fakePayos({ createPaymentLink: vi.fn().mockRejectedValue(new Error('payOS refused (500)')) });
    const app = await build(student, { 'rpc:billing_create_order': ok([orderRow()]), billing_payment_attempts: [ok([]), ok({ id: 'attempt-1' })] }, payos);
    const res = await checkout(app);
    expect(res.statusCode).toBe(502);
    expect(res.json().code).toBe('PAYMENT_PROVIDER_ERROR');
    await app.close();
  });

  it('replaces a link that was never received, cancelling the old one first', async () => {
    const payos = fakePayos();
    const cancelOld = ok();
    const app = await build(student, {
      'rpc:billing_create_order': ok([orderRow({ created: false })]),
      billing_payment_attempts: [ok([{ id: 'attempt-0', provider: 'payos', provider_reference: '1111111111', status: 'pending', checkout_url: null }]), cancelOld, ok({ id: 'attempt-1' }), ok()],
    }, payos);
    const res = await checkout(app);
    expect(res.statusCode).toBe(201);
    expect(payos.cancelPaymentLink).toHaveBeenCalledWith(1111111111);
    expect(cancelOld.updated[0]).toMatchObject({ status: 'cancelled' });
    await app.close();
  });
});

describe('GET /api/billing/orders/:id', () => {
  const stored = (patch: Record<string, unknown> = {}) => ({ id: ORDER, user_id: student.id, plan_code: 'student_plus', interval: 'month', amount_vnd: 39000, status: 'pending', expires_at: future(), paid_at: null, ...patch });
  const payosAttempt = [{ id: 'attempt-1', provider: 'payos', provider_reference: '1234567890', status: 'pending', checkout_url: 'https://pay.payos.vn/web/x' }];

  it('shows an order only to its owner', async () => {
    const app = await build(other, { billing_orders: ok(stored()) });
    expect((await app.inject({ method: 'GET', url: `/api/billing/orders/${ORDER}` })).statusCode).toBe(404);
    await app.close();
  });

  it('asks payOS itself when the order is still pending, and applies a verified payment', async () => {
    const payos = fakePayos({ getPaymentLink: vi.fn().mockResolvedValue({ status: 'PAID', amountPaid: 39000, paymentLinkId: 'x', transactions: [{ reference: 'FT9', amount: 39000, paidAt: '2026-09-29T03:15:00.000Z' }] }) });
    const app = await build(student, {
      billing_orders: [ok(stored()), ok(stored({ status: 'paid', paid_at: '2026-09-29T03:15:00.000Z' }))],
      billing_payment_attempts: ok(payosAttempt),
      'rpc:billing_apply_payment': ok('applied'),
    }, payos);
    const res = await app.inject({ method: 'GET', url: `/api/billing/orders/${ORDER}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: ORDER, status: 'paid', planCode: 'student_plus', amountVnd: 39000 });
    expect(rpcCalls[0][1]).toEqual({
      p_provider: 'payos', p_reference: '1234567890', p_transaction_id: 'FT9', p_amount_vnd: 39000, p_outcome: 'paid',
      p_paid_at: '2026-09-29T03:15:00.000Z', p_fingerprint: 'query:1234567890:FT9', p_event_type: 'query',
    });
    await app.close();
  });

  it('shows a pending order past its time as expired, without granting anything', async () => {
    const payos = fakePayos({ getPaymentLink: vi.fn().mockResolvedValue({ status: 'PENDING', amountPaid: 0, paymentLinkId: 'x', transactions: [] }) });
    const app = await build(student, { billing_orders: ok(stored({ expires_at: '2020-01-01T00:00:00Z' })), billing_payment_attempts: ok(payosAttempt) }, payos);
    const res = await app.inject({ method: 'GET', url: `/api/billing/orders/${ORDER}` });
    expect(res.json()).toMatchObject({ status: 'expired', checkoutUrl: null });
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });
});

describe('POST /api/billing/webhooks/payos', () => {
  const payment: PayosPayment = { orderCode: 1234567890, amount: 39000, reference: 'FT9', paymentLinkId: 'link-9', paid: true, paidAt: '2026-09-29T03:15:00.000Z' };
  const hook = (app: Awaited<ReturnType<typeof build>>) => app.inject({ method: 'POST', url: '/api/billing/webhooks/payos', payload: { data: {}, signature: 'x' } });

  it('ignores a webhook whose signature is wrong', async () => {
    const app = await build(null, {}, fakePayos({ verifyWebhook: vi.fn().mockReturnValue(null) }));
    expect((await hook(app)).statusCode).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('applies a verified payment once per bank transaction', async () => {
    const app = await build(null, { 'rpc:billing_apply_payment': ok('applied') }, fakePayos({ verifyWebhook: vi.fn().mockReturnValue(payment) }));
    const res = await hook(app);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
    expect(rpcCalls[0][1]).toMatchObject({ p_reference: '1234567890', p_transaction_id: 'FT9', p_amount_vnd: 39000, p_outcome: 'paid', p_fingerprint: 'webhook:link-9:FT9', p_event_type: 'webhook' });
    await app.close();
  });

  it('asks payOS to retry when the payment could not be saved', async () => {
    const app = await build(null, { 'rpc:billing_apply_payment': mockQuery({ data: null, error: { message: 'db down' } }) }, fakePayos({ verifyWebhook: vi.fn().mockReturnValue(payment) }));
    expect((await hook(app)).statusCode).toBe(500);
    await app.close();
  });
});
