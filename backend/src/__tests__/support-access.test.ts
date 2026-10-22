import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { supportAccessRoutes } from '../routes/supportAccess.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const student = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: {} };
const admin = { id: 'a0000000-0000-4000-8000-000000000003', app_metadata: { app_role: 'admin' } };
const APP_ID = 'c0000000-0000-4000-8000-000000000001';
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]> = {}) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(supportAccessRoutes);
  await app.ready();
  return app;
}
const post = (app: Awaited<ReturnType<typeof build>>, url: string, payload: unknown) => app.inject({ method: 'POST', url, payload: payload as object });

beforeEach(() => { rpcCalls.length = 0; });

describe('POST /api/support/applications', () => {
  const body = { fullName: '  Nguyễn Văn A ', school: 'THCS Bản Hồ', area: 'Bản Hồ, Sa Pa, Lào Cai', reason: 'Sóng yếu, học bằng điện thoại của bố mẹ' };

  it('saves a trimmed application for the signed-in account', async () => {
    const app = await build(student, { 'rpc:support_submit_application': ok([{ result_status: 'ok', result_id: APP_ID }]) });
    const res = await post(app, '/api/support/applications', body);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: APP_ID });
    expect(rpcCalls[0]).toEqual(['support_submit_application', expect.objectContaining({ p_user_id: student.id, p_full_name: 'Nguyễn Văn A', p_school: 'THCS Bản Hồ' })]);
    await app.close();
  });

  it.each([
    ['pending_exists', 409, 'SUPPORT_APPLICATION_PENDING'],
    ['too_many', 429, 'SUPPORT_APPLICATION_LIMIT'],
    ['unsupported', 403, 'SUPPORT_ROLE_UNSUPPORTED'],
  ])('answers %s with %i', async (status, code, error) => {
    const app = await build(student, { 'rpc:support_submit_application': ok([{ result_status: status, result_id: null }]) });
    const res = await post(app, '/api/support/applications', body);
    expect(res.statusCode).toBe(code);
    expect(res.json()).toMatchObject({ code: error });
    await app.close();
  });

  it('refuses empty, oversized and extra fields before asking the database', async () => {
    const app = await build(student);
    for (const bad of [{ ...body, school: '  ' }, { ...body, reason: 'x'.repeat(1001) }, { ...body, role: 'teacher' }, { fullName: 'A' }]) {
      expect((await post(app, '/api/support/applications', bad)).statusCode).toBe(400);
    }
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });
});

describe('GET /api/support/applications/mine', () => {
  it('returns the latest application and the plan the account holds', async () => {
    const app = await build(student, {
      support_applications: ok([{ id: APP_ID, role: 'student', status: 'approved', decision_note: 'Duyệt', granted_months: 3, decided_at: '2026-10-22T01:00:00Z', created_at: '2026-10-21T01:00:00Z' }]),
      billing_subscriptions: ok({ plan_code: 'student_plus', paid_through: '2027-01-22T01:00:00Z' }),
    });
    const res = await app.inject({ method: 'GET', url: '/api/support/applications/mine' });
    expect(res.json()).toMatchObject({ application: { id: APP_ID, status: 'approved', grantedMonths: 3 }, plan: { planCode: 'student_plus', paidThrough: '2027-01-22T01:00:00.000Z' } });
    await app.close();
  });

  it('is empty before anything was sent', async () => {
    const app = await build(student, { support_applications: ok([]), billing_subscriptions: ok(null) });
    expect((await app.inject({ method: 'GET', url: '/api/support/applications/mine' })).json()).toEqual({ application: null, plan: null });
    await app.close();
  });
});

describe('POST /api/billing/codes/redeem', () => {
  it('matches the code exactly as typed (only outer spaces go) and sends only the hash', async () => {
    const app = await build(student, { 'rpc:billing_redeem_code': ok([{ result_status: 'ok', result_plan: 'student_plus', result_through: '2027-01-22T01:00:00Z' }]) });
    const res = await post(app, '/api/billing/codes/redeem', { code: ' ABCD-EFGH-JKMN ' });
    expect(res.json()).toEqual({ planCode: 'student_plus', paidThrough: '2027-01-22T01:00:00.000Z' });
    expect(rpcCalls[0]).toEqual(['billing_redeem_code', expect.objectContaining({ p_user_id: student.id, p_code_hash: sha('ABCD-EFGH-JKMN') })]);
    expect(JSON.stringify(rpcCalls)).not.toContain('ABCD-EFGH-JKMN');
    await app.close();
  });

  it('gives one answer for every wrong code, and a different one when locked', async () => {
    const wrong = await build(student, { 'rpc:billing_redeem_code': ok([{ result_status: 'invalid' }]) });
    const res = await post(wrong, '/api/billing/codes/redeem', { code: 'ABCDEFGHJKMN' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'INVALID_ACCESS_CODE' });
    await wrong.close();
    const locked = await build(student, { 'rpc:billing_redeem_code': ok([{ result_status: 'locked' }]) });
    expect((await post(locked, '/api/billing/codes/redeem', { code: 'ABCDEFGHJKMN' })).statusCode).toBe(429);
    await locked.close();
  });

  it('answers a malformed code the same way without asking the database', async () => {
    const app = await build(student);
    for (const code of ['', 'short', 'has*symbol-12345']) {
      const res = await post(app, '/api/billing/codes/redeem', { code });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ code: 'INVALID_ACCESS_CODE' });
    }
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });
});

describe('admin routes', () => {
  it('refuse everyone who is not an admin', async () => {
    const app = await build(student);
    for (const [method, url] of [
      ['GET', '/api/admin/support/applications'],
      ['POST', `/api/admin/support/applications/${APP_ID}/decision`],
      ['POST', '/api/admin/billing/codes'],
      ['GET', '/api/admin/billing/codes'],
      ['POST', `/api/admin/billing/codes/${APP_ID}/revoke`],
    ] as const) {
      expect((await app.inject({ method, url, payload: {} })).statusCode).toBe(403);
    }
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('lists applications, filtered by status', async () => {
    const list = ok([{ id: APP_ID, user_id: student.id, role: 'student', full_name: 'A', school: 'B', area: 'C', reason: 'D', status: 'pending', created_at: '2026-10-21T01:00:00Z' }]);
    const app = await build(admin, { support_applications: list });
    const res = await app.inject({ method: 'GET', url: '/api/admin/support/applications?status=pending' });
    expect(res.json().applications[0]).toMatchObject({ id: APP_ID, fullName: 'A', status: 'pending', decidedAt: null });
    expect(list.eqCalls).toContainEqual(['status', 'pending']);
    expect((await app.inject({ method: 'GET', url: '/api/admin/support/applications?status=weird' })).statusCode).toBe(400);
    await app.close();
  });

  it('approves with months, rejects with a note, and maps what the database says', async () => {
    const approve = await build(admin, { 'rpc:support_decide_application': ok([{ result_status: 'approved', result_plan: 'student_plus', result_through: '2027-01-22T01:00:00Z' }]) });
    const approved = await post(approve, `/api/admin/support/applications/${APP_ID}/decision`, { approve: true, months: 3 });
    expect(approved.json()).toEqual({ status: 'approved', planCode: 'student_plus', paidThrough: '2027-01-22T01:00:00.000Z' });
    expect(rpcCalls[0]).toEqual(['support_decide_application', expect.objectContaining({ p_id: APP_ID, p_admin: admin.id, p_approve: true, p_months: 3 })]);
    await approve.close();

    const reject = await build(admin, { 'rpc:support_decide_application': ok([{ result_status: 'rejected' }]) });
    expect((await post(reject, `/api/admin/support/applications/${APP_ID}/decision`, { approve: false, note: 'Chưa đủ thông tin' })).json()).toEqual({ status: 'rejected' });
    await reject.close();

    for (const [status, code] of [['already_decided', 409], ['not_found', 404], ['unsupported', 409]] as const) {
      const other = await build(admin, { 'rpc:support_decide_application': ok([{ result_status: status }]) });
      expect((await post(other, `/api/admin/support/applications/${APP_ID}/decision`, { approve: true, months: 1 })).statusCode).toBe(code);
      await other.close();
    }
  });

  it('needs months to approve and a reason to reject', async () => {
    const app = await build(admin);
    for (const bad of [{ approve: true }, { approve: true, months: 13 }, { approve: false }, { approve: false, note: '  ' }, { approve: 'yes' }]) {
      expect((await post(app, `/api/admin/support/applications/${APP_ID}/decision`, bad)).statusCode).toBe(400);
    }
    expect((await post(app, '/api/admin/support/applications/not-an-id/decision', { approve: true, months: 1 })).statusCode).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('creates a code, shows it once and keeps only its hash', async () => {
    const insert = ok({ id: 'code-1' });
    const app = await build(admin, { billing_access_codes: insert });
    const res = await post(app, '/api/admin/billing/codes', { planCode: 'student_plus', months: 3, maxUses: 2, note: 'ho so 12' });
    expect(res.statusCode).toBe(201);
    const { code, display } = res.json();
    expect(code).toMatch(/^([A-HJKMNP-Z2-9]{4}-){2}[A-HJKMNP-Z2-9]{4}$/);
    expect(display).toBe(code);
    expect(insert.inserted[0]).toMatchObject({ code_hash: sha(code), code_hint: code.slice(-4), plan_code: 'student_plus', months: 3, max_uses: 2, note: 'ho so 12', created_by: admin.id });
    expect(JSON.stringify(insert.inserted)).not.toContain(code);
    await app.close();
  });

  it('keeps the code the admin typed, letter for letter', async () => {
    const insert = ok({ id: 'code-2' });
    const app = await build(admin, { billing_access_codes: insert });
    const res = await post(app, '/api/admin/billing/codes', { planCode: 'teacher_pro', code: 'Sapa-2026' });
    expect(res.statusCode).toBe(201);
    expect(res.json().code).toBe('Sapa-2026');
    expect(insert.inserted[0]).toMatchObject({ code_hash: sha('Sapa-2026'), code_hint: '2026' });
    await app.close();
  });

  it('refuses a typed code that is too short or has odd characters', async () => {
    const app = await build(admin);
    for (const code of ['abc', 'sapa_2026', 'sa pa 2026', 'x'.repeat(40)]) {
      expect((await post(app, '/api/admin/billing/codes', { planCode: 'student_plus', code })).statusCode).toBe(400);
    }
    await app.close();
  });

  it('answers 409 when the typed code already exists', async () => {
    const app = await build(admin, { billing_access_codes: mockQuery({ data: null, error: { code: '23505', message: 'duplicate' } }) });
    const res = await post(app, '/api/admin/billing/codes', { planCode: 'student_plus', code: 'SAPA2026' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'ACCESS_CODE_TAKEN' });
    await app.close();
  });

  it('lets an admin reuse the text of a revoked code', async () => {
    const dup = mockQuery({ data: null, error: { code: '23505', message: 'duplicate' } });
    const old = ok({ id: 'old-1' });
    const freed = ok();
    const fresh = ok({ id: 'code-3' });
    const app = await build(admin, { billing_access_codes: [dup, old, freed, fresh] });
    const res = await post(app, '/api/admin/billing/codes', { planCode: 'student_plus', code: 'BANTHUNGHIEM' });
    expect(res.statusCode).toBe(201);
    expect(freed.updated[0]).toEqual({ code_hash: sha('revoked:old-1') });
    expect(fresh.inserted[0]).toMatchObject({ code_hash: sha('BANTHUNGHIEM') });
    await app.close();
  });

  it('refuses a code for another plan, too many months, or a date in the past', async () => {
    const app = await build(admin);
    for (const bad of [{ planCode: 'student_free' }, { planCode: 'student_plus', months: 24 }, { planCode: 'student_plus', expiresAt: '2020-01-01T00:00:00Z' }, { planCode: 'student_plus', maxUses: 0 }]) {
      expect((await post(app, '/api/admin/billing/codes', bad)).statusCode).toBe(400);
    }
    await app.close();
  });

  it('lists codes with their use counts but never the code itself', async () => {
    const app = await build(admin, {
      billing_access_codes: ok([{ id: 'code-1', code_hint: 'JKMN', plan_code: 'student_plus', months: 3, max_uses: 2, expires_at: null, note: null, revoked_at: null, created_at: '2026-10-22T01:00:00Z' }]),
      billing_code_redemptions: ok([{ code_id: 'code-1' }, { code_id: 'code-1' }]),
    });
    const body = (await app.inject({ method: 'GET', url: '/api/admin/billing/codes' })).json();
    expect(body.codes[0]).toMatchObject({ id: 'code-1', hint: 'JKMN', uses: 2, maxUses: 2, revokedAt: null });
    expect(JSON.stringify(body)).not.toMatch(/code_hash|"code"/);
    await app.close();
  });

  it('revokes a live code and says so when there is none to revoke', async () => {
    const live = await build(admin, { billing_access_codes: ok([{ id: APP_ID }]) });
    expect((await post(live, `/api/admin/billing/codes/${APP_ID}/revoke`, {})).json()).toEqual({ revoked: true });
    await live.close();
    const none = await build(admin, { billing_access_codes: ok([]) });
    expect((await post(none, `/api/admin/billing/codes/${APP_ID}/revoke`, {})).statusCode).toBe(404);
    await none.close();
  });
});
