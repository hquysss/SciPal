import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { billingRoutes } from '../routes/billingPlans.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const student = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: {} };
const teacher = { id: 'a0000000-0000-4000-8000-000000000002', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'a0000000-0000-4000-8000-000000000003', app_metadata: { app_role: 'admin' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const P = (n: number) => `b0000000-0000-4000-8000-00000000000${n}`;

const plan = (code: string, audience: string) => ({
  code, audience, name_en: code, name_vi: `${code} vi`, description_en: 'd', description_vi: 'd vi', active: true, version: 1,
});
const catalogTables = (extra: Record<string, MockBuilder | MockBuilder[]> = {}) => ({
  // Out of order on purpose: the answer is sorted student first, free before paid.
  billing_plans: ok([plan('teacher_pro', 'teacher'), plan('student_free', 'student'), plan('teacher_free', 'teacher'), plan('student_plus', 'student')]),
  billing_prices: ok([
    { id: P(1), plan_code: 'student_plus', interval: 'month', amount_vnd: 39000 },
    { id: P(2), plan_code: 'student_plus', interval: 'year', amount_vnd: 390000 },
    { id: P(3), plan_code: 'teacher_pro', interval: 'year', amount_vnd: 990000 },
    { id: P(4), plan_code: 'teacher_pro', interval: 'month', amount_vnd: 99000 },
  ]),
  billing_plan_limits: ok([
    { plan_code: 'student_free', metric: 'graded_exam_attempts', kind: 'monthly', limit_value: 3 },
    { plan_code: 'student_free', metric: 'tutor_requests', kind: 'daily', limit_value: 5 },
    { plan_code: 'teacher_pro', metric: 'import_files', kind: 'monthly', limit_value: 100 },
  ]),
  ...extra,
});

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  if (user) app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(billingRoutes);
  await app.ready();
  return app;
}

beforeEach(() => { rpcCalls.length = 0; });

describe('GET /api/billing/plans', () => {
  it('lists the four plans with their prices and limits, and says checkout is not open yet', async () => {
    const app = await build(null, catalogTables());
    const res = await app.inject({ method: 'GET', url: '/api/billing/plans' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.checkoutOpen).toBe(false);
    expect(body.plans.map((p: { code: string }) => p.code)).toEqual(['student_free', 'student_plus', 'teacher_free', 'teacher_pro']);
    expect(body.plans[1]).toMatchObject({ name: { en: 'student_plus', vi: 'student_plus vi' }, prices: [{ interval: 'month', amountVnd: 39000 }, { interval: 'year', amountVnd: 390000 }] });
    expect(body.plans[3].prices.map((p: { interval: string }) => p.interval)).toEqual(['month', 'year']);
    expect(body.plans[0].limits).toEqual([{ metric: 'tutor_requests', kind: 'daily', limit: 5 }, { metric: 'graded_exam_attempts', kind: 'monthly', limit: 3 }]);
    expect(body.plans[0].prices).toEqual([]);
    await app.close();
  });

  it('never makes up prices: a broken or incomplete catalog is 503', async () => {
    const broken = await build(null, catalogTables({ billing_prices: mockQuery({ data: null, error: { message: 'down' } }) }));
    const res = await broken.inject({ method: 'GET', url: '/api/billing/plans' });
    expect(res.statusCode).toBe(503);
    expect(res.json().code).toBe('BILLING_UNAVAILABLE');
    await broken.close();

    const missingYear = await build(null, catalogTables({ billing_prices: ok([{ id: P(1), plan_code: 'student_plus', interval: 'month', amount_vnd: 39000 }]) }));
    expect((await missingYear.inject({ method: 'GET', url: '/api/billing/plans' })).statusCode).toBe(503);
    await missingYear.close();
  });
});

describe('GET /api/billing/me', () => {
  const quotaRow = (metric: string, kind: string, limit: number, used: number) => ({ metric, kind, quota_limit: limit, used, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-09-30T17:00:00+00:00' });

  it('shows a student their free plan and what is left', async () => {
    const app = await build(student, {
      'rpc:billing_get_effective_quotas': ok([quotaRow('tutor_requests', 'daily', 5, 2), quotaRow('graded_exam_attempts', 'monthly', 3, 1)]),
      billing_subscriptions: ok(null),
    });
    const res = await app.inject({ method: 'GET', url: '/api/billing/me' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ role: 'student', plan: 'student_free', paidThrough: null });
    expect(res.json().quotas[0]).toMatchObject({ metric: 'tutor_requests', kind: 'daily', limit: 5, used: 2 });
    expect(rpcCalls[0][1]).toMatchObject({ p_user_id: student.id });
    await app.close();
  });

  it('shows a paid teacher plan until it runs out, then the free one', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const paid = await build(teacher, { 'rpc:billing_get_effective_quotas': ok([]), billing_subscriptions: ok({ plan_code: 'teacher_pro', paid_through: future }) });
    expect((await paid.inject({ method: 'GET', url: '/api/billing/me' })).json()).toMatchObject({ role: 'teacher', plan: 'teacher_pro', paidThrough: new Date(future).toISOString() });
    await paid.close();

    const lapsed = await build(teacher, { 'rpc:billing_get_effective_quotas': ok([]), billing_subscriptions: ok({ plan_code: 'teacher_pro', paid_through: '2020-01-01T00:00:00Z' }) });
    expect((await lapsed.inject({ method: 'GET', url: '/api/billing/me' })).json()).toMatchObject({ plan: 'teacher_free', paidThrough: null });
    await lapsed.close();
  });

  it('returns only the renewal amount, interval and next date for the account page', async () => {
    const paidThrough = new Date(Date.now() + 86_400_000).toISOString();
    const nextChargeAt = new Date(Date.now() + 60_000).toISOString();
    const app = await build(student, {
      'rpc:billing_get_effective_quotas': ok([]),
      billing_subscriptions: ok({ plan_code: 'student_plus', paid_through: paidThrough, renewal_mode: 'auto', mandate_id: 'd0000000-0000-4000-8000-000000000001' }),
      billing_mandates: ok({ status: 'active', interval: 'month', amount_vnd: 39_000, next_charge_at: nextChargeAt }),
    });
    const response = await app.inject({ method: 'GET', url: '/api/billing/me' });
    expect(response.json().renewal).toEqual({ status: 'active', interval: 'month', amountVnd: 39_000, nextChargeAt });
    expect(JSON.stringify(response.json())).not.toContain('provider_token');
    await app.close();
  });

  it('tells an admin they have no limits, without asking the ledger', async () => {
    const app = await build(admin, {});
    const res = await app.inject({ method: 'GET', url: '/api/billing/me' });
    expect(res.json()).toEqual({ role: 'admin', plan: null, paidThrough: null, renewal: null, quotas: [] });
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('answers 503 when the ledger cannot be read', async () => {
    const app = await build(student, { 'rpc:billing_get_effective_quotas': mockQuery({ data: null, error: { message: 'down' } }), billing_subscriptions: ok(null) });
    const res = await app.inject({ method: 'GET', url: '/api/billing/me' });
    expect(res.statusCode).toBe(503);
    expect(res.json().code).toBe('BILLING_UNAVAILABLE');
    await app.close();
  });
});

describe('checkout switch in the catalog', () => {
  it('reports checkout closed while BILLING_CHECKOUT_DISABLED is set, even with payOS keys', async () => {
    Object.assign(process.env, { PAYOS_CLIENT_ID: 'a', PAYOS_API_KEY: 'b', PAYOS_CHECKSUM_KEY: 'c' });
    try {
      const open = await build(null, catalogTables());
      expect((await open.inject({ method: 'GET', url: '/api/billing/plans' })).json().checkoutOpen).toBe(true);
      await open.close();
      process.env.BILLING_CHECKOUT_DISABLED = 'true';
      const closed = await build(null, catalogTables());
      expect((await closed.inject({ method: 'GET', url: '/api/billing/plans' })).json().checkoutOpen).toBe(false);
      await closed.close();
    } finally {
      for (const key of ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY', 'BILLING_CHECKOUT_DISABLED']) delete process.env[key];
    }
  });

  it('opens MoMo renewal only when server credentials, HTTPS IPN and cron authentication are configured', async () => {
    const keys = ['MOMO_ENV', 'MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY', 'MOMO_PUBLIC_KEY', 'MOMO_IPN_URL', 'CRON_SECRET'] as const;
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    Object.assign(process.env, {
      MOMO_ENV: 'sandbox',
      MOMO_PARTNER_CODE: 'partner',
      MOMO_ACCESS_KEY: 'access',
      MOMO_SECRET_KEY: '0123456789abcdef0123456789abcdef',
      MOMO_PUBLIC_KEY: 'public-key',
      MOMO_IPN_URL: 'https://api.scipal.test/api/billing/webhooks/momo',
      CRON_SECRET: 'cron-secret',
    });
    try {
      const enabled = await build(null, catalogTables());
      expect((await enabled.inject({ method: 'GET', url: '/api/billing/plans' })).json()).toMatchObject({ checkoutOpen: true, payosCheckoutOpen: false, momoAutoRenewOpen: true });
      await enabled.close();

      process.env.MOMO_IPN_URL = 'http://api.scipal.test/api/billing/webhooks/momo';
      const disabled = await build(null, catalogTables());
      expect((await disabled.inject({ method: 'GET', url: '/api/billing/plans' })).json()).toMatchObject({ checkoutOpen: false, momoAutoRenewOpen: false });
      await disabled.close();
    } finally {
      for (const key of keys) {
        const value = previous[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
