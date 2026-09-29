import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { billingReconciliationRoutes } from '../routes/billingReconciliation.js';
import type { PayosClient } from '../billing/providers/payos.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'a0000000-0000-4000-8000-000000000005', app_metadata: { app_role: 'admin' } };
const student = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: { app_role: 'student' } };
const ORDER = 'c0000000-0000-4000-8000-000000000001';

beforeEach(() => { rpcCalls.length = 0; });

function fakePayos(overrides: Partial<PayosClient> = {}): PayosClient {
  return {
    createPaymentLink: vi.fn(),
    getPaymentLink: vi.fn(),
    cancelPaymentLink: vi.fn(),
    verifyWebhook: vi.fn(),
    ...overrides,
  } as PayosClient;
}

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>, payos: PayosClient | null = fakePayos()) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  if (user) app.addHook('onRequest', async (request) => { Object.assign(request, { user }); });
  await app.register(billingReconciliationRoutes, { payos });
  await app.ready();
  return app;
}

describe('GET /api/admin/billing/reconciliation', () => {
  it('returns paginated reconciliation rows with a backend-classified reason', async () => {
    const app = await build(admin, {
      'rpc:billing_reconciliation_page': mockQuery({
        data: {
          items: [{
          incident_id: 'd0000000-0000-4000-8000-000000000001',
          source: 'event',
          event_id: 'd0000000-0000-4000-8000-000000000001',
          attempt_id: 'e0000000-0000-4000-8000-000000000001',
          order_id: 'c0000000-0000-4000-8000-000000000001',
          created_at: '2026-09-29T03:15:00.000Z',
          provider_reference: '1234567890',
          provider_transaction_id: 'FT9',
          amount_received_vnd: 3900,
          paid_at: '2026-09-29T03:15:00.000Z',
          attempt_status: 'reconciliation',
          order_status: 'reconciliation',
          expected_amount_vnd: 39000,
          order_amount_vnd: 39000,
          order_expires_at: '2026-09-29T03:30:00.000Z',
          user_id: 'a0000000-0000-4000-8000-000000000001',
          account_email: 'learner@example.test',
          display_name: 'Học sinh',
          current_role: 'student',
          plan_code: 'student_plus',
          plan_name_en: 'Student Plus',
          plan_name_vi: 'Học sinh Plus',
          plan_audience: 'student',
          }],
          total_count: 5,
        },
        error: null,
      }),
    }, null);

    const response = await app.inject({ method: 'GET', url: '/api/admin/billing/reconciliation?page=2&limit=2' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      page: 2,
      pageSize: 2,
      totalCount: 5,
      items: [{
        orderId: 'c0000000-0000-4000-8000-000000000001',
        amountReceivedVnd: 3900,
        reason: { code: 'incorrect_amount' },
      }],
    });
    expect(rpcCalls).toContainEqual(['billing_reconciliation_page', { p_limit: 2, p_offset: 2 }]);
    await app.close();
  });

  it('denies authenticated non-admins', async () => {
    const app = await build(student, {});
    const response = await app.inject({ method: 'GET', url: '/api/admin/billing/reconciliation' });
    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it('rejects invalid page sizes before querying the database', async () => {
    const app = await build(admin, {}, null);
    const response = await app.inject({ method: 'GET', url: '/api/admin/billing/reconciliation?page=0&limit=1000' });
    expect(response.statusCode).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('rejects offsets outside the database integer range', async () => {
    const app = await build(admin, {});
    const response = await app.inject({ method: 'GET', url: '/api/admin/billing/reconciliation?page=2147483647&limit=100' });
    expect(response.statusCode).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });
});

describe('POST /api/admin/billing/orders/:id/reconcile', () => {
  it('rechecks payOS and applies each transaction through the payment RPC', async () => {
    const attempt = mockQuery({ data: { id: 'e0000000-0000-4000-8000-000000000001', provider_reference: '1234567890', status: 'reconciliation' }, error: null });
    const apply = mockQuery({ data: 'reconciliation', error: null });
    const payos = fakePayos({
      getPaymentLink: vi.fn().mockResolvedValue({
        status: 'PAID',
        amountPaid: 39000,
        paymentLinkId: 'payos-link',
        transactions: [{ reference: 'FT9', amount: 39000, paidAt: '2026-09-29T03:15:00.000Z' }],
      }),
    });
    const app = await build(admin, { billing_payment_attempts: attempt, 'rpc:billing_apply_payment': apply }, payos);

    const response = await app.inject({ method: 'POST', url: `/api/admin/billing/orders/${ORDER}/reconcile` });

    expect(response.statusCode).toBe(200);
    expect(payos.getPaymentLink).toHaveBeenCalledWith(1234567890);
    expect(rpcCalls).toContainEqual(['billing_apply_payment', expect.objectContaining({
      p_provider: 'payos',
      p_reference: '1234567890',
      p_transaction_id: 'FT9',
      p_amount_vnd: 39000,
      p_outcome: 'paid',
      p_event_type: 'admin_reconciliation',
    })]);
    expect(attempt.updated).toHaveLength(0);
    await app.close();
  });

  it('rechecks duplicate-payment events linked to an already-paid attempt', async () => {
    const attempt = mockQuery({ data: { id: 'e0000000-0000-4000-8000-000000000001', provider_reference: '1234567890', status: 'paid' }, error: null });
    const apply = mockQuery({ data: 'duplicate', error: null });
    const payos = fakePayos({
      getPaymentLink: vi.fn().mockResolvedValue({
        status: 'PAID',
        amountPaid: 78000,
        paymentLinkId: 'payos-link',
        transactions: [
          { reference: 'FT-paid', amount: 39000, paidAt: '2026-09-29T03:15:00.000Z' },
          { reference: 'FT-double', amount: 39000, paidAt: '2026-09-29T03:16:00.000Z' },
        ],
      }),
    });
    const app = await build(admin, { billing_payment_attempts: attempt, 'rpc:billing_apply_payment': apply }, payos);

    const response = await app.inject({ method: 'POST', url: `/api/admin/billing/orders/${ORDER}/reconcile` });

    expect(response.statusCode).toBe(200);
    expect(attempt.inCalls).toContainEqual(['status', ['reconciliation', 'paid']]);
    expect(payos.getPaymentLink).toHaveBeenCalledWith(1234567890);
    expect(rpcCalls).toHaveLength(2);
    expect(attempt.updated).toHaveLength(0);
    await app.close();
  });

  it('does not let non-admins query the provider or apply payment events', async () => {
    const payos = fakePayos();
    const app = await build(student, {}, payos);
    const response = await app.inject({ method: 'POST', url: `/api/admin/billing/orders/${ORDER}/reconcile` });
    expect(response.statusCode).toBe(403);
    expect(payos.getPaymentLink).not.toHaveBeenCalled();
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('does not query payOS with an invalid stored reference', async () => {
    const payos = fakePayos();
    const app = await build(admin, {
      billing_payment_attempts: mockQuery({ data: { id: 'e0000000-0000-4000-8000-000000000001', provider_reference: 'not-numeric', status: 'reconciliation' }, error: null }),
    }, payos);
    const response = await app.inject({ method: 'POST', url: `/api/admin/billing/orders/${ORDER}/reconcile` });
    expect(response.statusCode).toBe(409);
    expect(payos.getPaymentLink).not.toHaveBeenCalled();
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('does not apply a paid status without transaction evidence from payOS', async () => {
    const payos = fakePayos({
      getPaymentLink: vi.fn().mockResolvedValue({ status: 'PAID', amountPaid: 39000, paymentLinkId: 'payos-link', transactions: [] }),
    });
    const app = await build(admin, {
      billing_payment_attempts: mockQuery({ data: { id: 'e0000000-0000-4000-8000-000000000001', provider_reference: '1234567890', status: 'reconciliation' }, error: null }),
    }, payos);
    const response = await app.inject({ method: 'POST', url: `/api/admin/billing/orders/${ORDER}/reconcile` });
    expect(response.statusCode).toBe(502);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });
});

describe('GET /api/admin/billing/orders', () => {
  const USER = 'a0000000-0000-4000-8000-000000000001';
  const orderRow = { id: ORDER, user_id: USER, plan_code: 'student_plus', interval: 'month', amount_vnd: 39000, status: 'paid', created_at: '2026-09-29T11:21:54Z', paid_at: '2026-09-29T11:22:39Z', expires_at: '2026-09-29T11:36:54Z' };

  async function buildOrders(user: object | null, orders: MockBuilder, getUserById = vi.fn(async () => ({ data: { user: { email: 'an@gmail.com' } }, error: null }))) {
    const app = Fastify();
    const supabase = mockSupabase({
      billing_orders: orders,
      billing_payment_attempts: mockQuery({ data: [
        { order_id: ORDER, provider_reference: '1790680000000', provider_transaction_id: null, status: 'cancelled', created_at: '2026-09-29T11:21:00Z' },
        { order_id: ORDER, provider_reference: '1790680914261', provider_transaction_id: 'FT26272707395690', status: 'paid', created_at: '2026-09-29T11:22:00Z' },
      ], error: null }),
      billing_plans: mockQuery({ data: [{ code: 'student_plus', name_vi: 'Học sinh Plus', name_en: 'Student Plus' }], error: null }),
      profiles: mockQuery({ data: [{ id: USER, display_name: 'Lê An' }], error: null }),
    }) as unknown as Record<string, unknown>;
    supabase.auth = { admin: { getUserById } };
    app.decorate('supabase', supabase as never);
    if (user) app.addHook('onRequest', async (request) => { Object.assign(request, { user }); });
    await app.register(billingReconciliationRoutes, { payos: fakePayos() });
    await app.ready();
    return { app, getUserById };
  }

  it('lists every order newest first with its account, plan and latest payment', async () => {
    const orders = mockQuery({ data: [orderRow], error: null, count: 1 });
    const { app, getUserById } = await buildOrders(admin, orders);
    const res = await app.inject({ method: 'GET', url: '/api/admin/billing/orders?page=1&limit=20' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalCount).toBe(1);
    expect(body.items[0]).toMatchObject({
      id: ORDER,
      status: 'paid',
      amountVnd: 39000,
      interval: 'month',
      account: { id: USER, email: 'an@gmail.com', displayName: 'Lê An' },
      plan: { code: 'student_plus', nameVi: 'Học sinh Plus' },
      providerReference: '1790680914261',
      bankTransactionId: 'FT26272707395690',
    });
    expect(orders.rangeCalls).toContainEqual([0, 19]);
    expect(getUserById).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('filters by status and refuses an unknown one', async () => {
    const orders = mockQuery({ data: [], error: null, count: 0 });
    const { app } = await buildOrders(admin, orders);
    expect((await app.inject({ method: 'GET', url: '/api/admin/billing/orders?status=paid' })).statusCode).toBe(200);
    expect(orders.eqCalls).toContainEqual(['status', 'paid']);
    expect((await app.inject({ method: 'GET', url: '/api/admin/billing/orders?status=hacked' })).statusCode).toBe(400);
    await app.close();
  });

  it('is for admins only', async () => {
    const { app } = await buildOrders(student, mockQuery({ data: [], error: null, count: 0 }));
    expect((await app.inject({ method: 'GET', url: '/api/admin/billing/orders' })).statusCode).toBe(403);
    await app.close();
  });
});
