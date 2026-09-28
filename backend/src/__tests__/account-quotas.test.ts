import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { accountQuotaRoutes } from '../routes/accountQuotas.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'a0000000-0000-4000-8000-000000000002', app_metadata: { app_role: 'teacher' } };
const S1 = 's0000000-0000-4000-8000-000000000001'.replace('s', 'b');
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const fail = (message: string) => mockQuery({ data: null, error: { code: 'P0001', message } });

const row = (metric: string, patch: Record<string, unknown> = {}) => ({
  metric,
  kind: metric === 'tutor_requests' || metric === 'graded_exam_attempts' ? 'monthly' : 'capacity',
  quota_limit: 10,
  used: 0,
  reserved: 0,
  source: 'plan',
  expires_at: null,
  resets_at: '2026-09-30T17:00:00+00:00',
  ...patch,
});
const studentQuotas = () => ok([row('graded_exam_attempts', { quota_limit: 3, used: 1 }), row('tutor_requests', { quota_limit: 500, used: 40, source: 'override' })]);
const snapshotTables = (extra: Record<string, MockBuilder | MockBuilder[]> = {}) => ({
  'rpc:billing_get_effective_quotas': studentQuotas(),
  account_quota_versions: ok({ version: 3 }),
  billing_subscriptions: ok(null),
  billing_plan_limits: ok([{ metric: 'graded_exam_attempts', limit_value: 3 }, { metric: 'tutor_requests', limit_value: 10 }]),
  ...extra,
});

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(accountQuotaRoutes);
  await app.ready();
  return app;
}

const change = (payload: unknown) => ({ method: 'PATCH' as const, url: `/api/admin/accounts/${S1}/quotas`, payload: payload as Record<string, unknown> });
const valid = { expectedVersion: 3, reason: 'Lớp chuyên', changes: [{ metric: 'tutor_requests', action: 'set', limit: 500, expiresAt: null }] };

beforeEach(() => { rpcCalls.length = 0; });

describe('admin account quotas', () => {
  it('are for admins only', async () => {
    const app = await build(teacher, {});
    for (const req of [
      { method: 'GET' as const, url: `/api/admin/accounts/${S1}/quotas` },
      change(valid),
      { method: 'GET' as const, url: `/api/admin/accounts/${S1}/quota-audit` },
    ]) {
      const res = await app.inject(req);
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ code: 'FORBIDDEN', error_en: expect.any(String) });
    }
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('shows the plan, the version and each quota with its plan default', async () => {
    const app = await build(admin, snapshotTables());
    const res = await app.inject({ method: 'GET', url: `/api/admin/accounts/${S1}/quotas` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      account: { id: S1, plan: 'student_free', paidThrough: null },
      version: 3,
      quotas: [
        { metric: 'graded_exam_attempts', kind: 'monthly', limit: 3, planLimit: 3, used: 1, reserved: 0, source: 'plan', expiresAt: null, resetsAt: '2026-09-30T17:00:00.000Z' },
        { metric: 'tutor_requests', kind: 'monthly', limit: 500, planLimit: 10, used: 40, reserved: 0, source: 'override', expiresAt: null, resetsAt: '2026-09-30T17:00:00.000Z' },
      ],
    });
    await app.close();
  });

  it('knows a paid plan and a first-time account (version 0)', async () => {
    const app = await build(admin, snapshotTables({
      account_quota_versions: ok(null),
      billing_subscriptions: ok({ plan_code: 'student_plus', paid_through: '2099-01-01T00:00:00Z' }),
    }));
    const body = (await app.inject({ method: 'GET', url: `/api/admin/accounts/${S1}/quotas` })).json();
    expect(body.account).toMatchObject({ plan: 'student_plus', paidThrough: '2099-01-01T00:00:00.000Z' });
    expect(body.version).toBe(0);
    await app.close();
  });

  it('answers 404 for an unknown account and 409 for an admin account', async () => {
    const missing = await build(admin, { 'rpc:billing_get_effective_quotas': fail('BILLING_ACCOUNT_NOT_FOUND') });
    expect((await missing.inject({ method: 'GET', url: `/api/admin/accounts/${S1}/quotas` })).statusCode).toBe(404);
    await missing.close();
    const other = await build(admin, { 'rpc:billing_get_effective_quotas': fail('UNSUPPORTED_BILLING_ROLE') });
    const res = await other.inject({ method: 'GET', url: `/api/admin/accounts/${S1}/quotas` });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('UNSUPPORTED_BILLING_ROLE');
    await other.close();
    const bad = await build(admin, {});
    expect((await bad.inject({ method: 'GET', url: '/api/admin/accounts/not-a-uuid/quotas' })).statusCode).toBe(404);
    await bad.close();
  });

  it('saves a batch in one call and answers the new state', async () => {
    const app = await build(admin, snapshotTables({ 'rpc:billing_update_account_quotas': ok(4), account_quota_versions: ok({ version: 4 }) }));
    const res = await app.inject(change({ ...valid, reason: '  Lớp chuyên  ', changes: [...valid.changes, { metric: 'graded_exam_attempts', action: 'reset' }] }));
    expect(res.statusCode).toBe(200);
    expect(res.json().version).toBe(4);
    expect(rpcCalls[0]).toEqual(['billing_update_account_quotas', {
      p_actor_id: admin.id,
      p_target_id: S1,
      p_expected_version: 3,
      p_changes: [{ metric: 'tutor_requests', action: 'set', limit: 500, expires_at: null }, { metric: 'graded_exam_attempts', action: 'reset' }],
      p_reason: 'Lớp chuyên',
      p_now: expect.any(String),
    }]);
    await app.close();
  });

  it('refuses bad input before the database', async () => {
    const app = await build(admin, {});
    const past = new Date(Date.now() - 60_000).toISOString();
    for (const payload of [
      { ...valid, changes: [{ metric: 'video_minutes', action: 'reset' }] },
      { ...valid, changes: [{ metric: 'tutor_requests', action: 'set', limit: -1, expiresAt: null }] },
      { ...valid, changes: [{ metric: 'tutor_requests', action: 'set', limit: 1.5, expiresAt: null }] },
      { ...valid, changes: [{ metric: 'tutor_requests', action: 'set', limit: 5, expiresAt: past }] },
      { ...valid, changes: [{ metric: 'tutor_requests', action: 'reset' }, { metric: 'tutor_requests', action: 'reset' }] },
      { ...valid, changes: [] },
      { ...valid, reason: '   ' },
      { ...valid, reason: 'x'.repeat(501) },
      { ...valid, expectedVersion: -1 },
      { ...valid, userId: 'someone-else' },
    ]) {
      const res = await app.inject(change(payload));
      expect(res.statusCode, JSON.stringify(payload).slice(0, 80)).toBe(400);
      expect(res.json()).toMatchObject({ code: 'INVALID_QUOTA_CHANGE', error_en: expect.any(String) });
    }
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('answers 409 when another admin saved first, and 400 when the database refuses a change', async () => {
    const stale = await build(admin, { 'rpc:billing_update_account_quotas': fail('QUOTA_VERSION_CONFLICT') });
    const res = await stale.inject(change(valid));
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'QUOTA_VERSION_CONFLICT', error: expect.stringContaining('Tải lại') });
    await stale.close();
    const refused = await build(admin, { 'rpc:billing_update_account_quotas': fail('INVALID_QUOTA_CHANGE') });
    expect((await refused.inject(change(valid))).statusCode).toBe(400);
    await refused.close();
    const broken = await build(admin, { 'rpc:billing_update_account_quotas': mockQuery({ data: null, error: { code: '08006', message: 'connection lost' } }) });
    const down = await broken.inject(change(valid));
    expect(down.statusCode).toBe(503);
    expect(down.json().error).not.toContain('connection lost');
    await broken.close();
  });

  it('lists the audit newest first with who changed what, 20 at a time', async () => {
    const entries = Array.from({ length: 21 }, (_, i) => ({
      id: `e${i}`, actor_id: admin.id, before_state: {}, after_state: { tutor_requests: { limit: 500, expires_at: null } },
      reason: 'Lớp chuyên', created_at: `2026-09-${String(28 - i).padStart(2, '0')}T00:00:00+00:00`,
    }));
    const audit = ok(entries);
    const app = await build(admin, { account_quota_audit: [audit, ok([])], profiles: ok([{ id: admin.id, display_name: 'Cô Hà' }]) });
    const res = await app.inject({ method: 'GET', url: `/api/admin/accounts/${S1}/quota-audit` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.entries).toHaveLength(20);
    expect(body.entries[0]).toEqual({ id: 'e0', actor: { id: admin.id, name: 'Cô Hà' }, before: {}, after: { tutor_requests: { limit: 500, expires_at: null } }, reason: 'Lớp chuyên', createdAt: '2026-09-28T00:00:00.000Z' });
    expect(body.next).toBe('2026-09-09T00:00:00.000Z');
    expect(audit.eqCalls).toEqual([['target_id', S1]]);
    const more = await app.inject({ method: 'GET', url: `/api/admin/accounts/${S1}/quota-audit?cursor=${encodeURIComponent(body.next)}` });
    expect(more.json()).toEqual({ entries: [], next: null });
    expect((await app.inject({ method: 'GET', url: `/api/admin/accounts/${S1}/quota-audit?cursor=soon` })).statusCode).toBe(400);
    await app.close();
  });
});
