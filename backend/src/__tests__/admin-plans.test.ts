import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { adminPlanRoutes } from '../routes/adminPlans.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'a0000000-0000-4000-8000-000000000002', app_metadata: { app_role: 'teacher' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const fail = (message: string) => mockQuery({ data: null, error: { code: 'P0001', message } });

const plan = (code: string, audience: string, version = 1) => ({ code, audience, name_en: code, name_vi: `${code} vi`, description_en: 'd', description_vi: 'd vi', version });
const tables = (extra: Record<string, MockBuilder | MockBuilder[]> = {}) => ({
  billing_plans: ok([plan('teacher_pro', 'teacher'), plan('student_free', 'student', 3), plan('student_plus', 'student'), plan('teacher_free', 'teacher')]),
  billing_plan_limits: ok([
    { plan_code: 'student_free', metric: 'graded_exam_attempts', kind: 'monthly', limit_value: 3 },
    { plan_code: 'student_free', metric: 'tutor_requests', kind: 'daily', limit_value: 5 },
  ]),
  billing_prices: ok([{ id: 'p1', plan_code: 'student_plus', interval: 'year', amount_vnd: 390000 }, { id: 'p2', plan_code: 'student_plus', interval: 'month', amount_vnd: 39000 }]),
  billing_plan_audit: ok([{ id: 'x1', plan_code: 'student_free', actor_id: admin.id, reason: 'Thử', before_state: {}, after_state: {}, created_at: '2026-09-29T02:00:00Z' }]),
  ...extra,
});

async function build(user: object, t: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(t));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(adminPlanRoutes);
  await app.ready();
  return app;
}

beforeEach(() => { rpcCalls.length = 0; });

describe('GET /api/admin/plans', () => {
  it('gives admins every plan with its limits in a fixed order, prices, version and recent changes', async () => {
    const app = await build(admin, tables());
    const res = await app.inject({ method: 'GET', url: '/api/admin/plans' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.plans.map((p: { code: string }) => p.code)).toEqual(['student_free', 'student_plus', 'teacher_free', 'teacher_pro']);
    expect(body.plans[0]).toMatchObject({ version: 3, description: { en: 'd', vi: 'd vi' }, prices: null });
    expect(body.plans[0].limits).toEqual([{ metric: 'tutor_requests', kind: 'daily', limit: 5 }, { metric: 'graded_exam_attempts', kind: 'monthly', limit: 3 }]);
    expect(body.plans[1].prices).toEqual({ month: 39000, year: 390000 });
    expect(body.audit[0]).toMatchObject({ planCode: 'student_free', reason: 'Thử', createdAt: '2026-09-29T02:00:00.000Z' });
    await app.close();
  });

  it('is for admins only', async () => {
    const app = await build(teacher, tables());
    expect((await app.inject({ method: 'GET', url: '/api/admin/plans' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'PATCH', url: '/api/admin/plans/student_free', payload: { expectedVersion: 1, reason: 'x' } })).statusCode).toBe(403);
    await app.close();
  });
});

describe('PATCH /api/admin/plans/:code', () => {
  const patch = (app: Awaited<ReturnType<typeof build>>, code: string, payload: Record<string, unknown>) =>
    app.inject({ method: 'PATCH', url: `/api/admin/plans/${code}`, payload });

  it('saves limits, description and prices in one call, as the admin, with the reason', async () => {
    const app = await build(admin, { 'rpc:billing_update_plan': ok(4) });
    const res = await patch(app, 'student_plus', {
      expectedVersion: 3,
      reason: '  Tăng lượt Tutor  ',
      limits: [{ metric: 'tutor_requests', kind: 'monthly', limit: 300 }],
      description: { en: 'More', vi: 'Nhiều hơn' },
      prices: { month: 49000, year: 490000 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ version: 4 });
    expect(rpcCalls[0]).toEqual(['billing_update_plan', {
      p_actor_id: admin.id, p_plan_code: 'student_plus', p_expected_version: 3, p_reason: 'Tăng lượt Tutor',
      p_limits: [{ metric: 'tutor_requests', kind: 'monthly', limit: 300 }],
      p_description: { en: 'More', vi: 'Nhiều hơn' }, p_prices: { month: 49000, year: 490000 },
    }]);
    await app.close();
  });

  it('refuses a bad request before the database', async () => {
    const app = await build(admin, {});
    for (const body of [
      { expectedVersion: 1, reason: '' },
      { expectedVersion: 1, reason: 'x', limits: [{ metric: 'tutor_requests', kind: 'monthly', limit: -1 }] },
      { expectedVersion: 1, reason: 'x', prices: { month: 1.5 } },
      { expectedVersion: 1, reason: 'x', role: 'admin' },
    ]) {
      expect((await patch(app, 'student_plus', body)).statusCode, JSON.stringify(body)).toBe(400);
    }
    expect((await patch(app, 'premium', { expectedVersion: 1, reason: 'x' })).statusCode).toBe(404);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('answers a stale save and a refused change in both languages', async () => {
    for (const [message, status] of [['PLAN_VERSION_CONFLICT', 409], ['INVALID_PLAN_CHANGE', 400], ['PLAN_NOT_FOUND', 404]] as const) {
      const app = await build(admin, { 'rpc:billing_update_plan': fail(message) });
      const res = await patch(app, 'student_free', { expectedVersion: 1, reason: 'x' });
      expect(res.statusCode).toBe(status);
      expect(res.json()).toMatchObject({ code: message });
      expect(res.json().error_en).toBeTruthy();
      await app.close();
    }
  });
});
