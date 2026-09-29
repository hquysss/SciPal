import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { problemReportRoutes } from '../routes/problemReports.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const REPORT_ID = '55555555-5555-4555-8555-555555555555';
const student = { id: 'student-1', email: 'an@gmail.com', app_metadata: { app_role: 'student' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const SECRET = 'x'.repeat(40);
const open = { id: REPORT_ID, category: 'bug', message: 'Nút Học ngay không bấm được', status: 'open', created_at: '2026-10-01T00:00:00Z' };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables) as never);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  await app.register(problemReportRoutes);
  await app.ready();
  return app;
}

const valid = { category: 'bug', message: '  Nút Học ngay không bấm được  ', page_url: 'https://scipal.vercel.app/', email: 'khach@gmail.com' };

describe('reporting a problem', () => {
  beforeEach(() => {
    process.env.GUEST_TRIAL_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.GUEST_TRIAL_SECRET;
  });

  it('stores a report from an account with its e-mail', async () => {
    const recent = mockQuery({ data: null, error: null, count: 0 });
    const insert = mockQuery({ data: { id: REPORT_ID }, error: null });
    const app = await build(student, { problem_reports: [recent, insert] });
    const res = await app.inject({ method: 'POST', url: '/api/problem-reports', payload: valid, headers: { 'user-agent': 'Phone' } });
    expect(res.statusCode).toBe(201);
    expect(recent.eqCalls).toContainEqual(['user_id', 'student-1']);
    expect(insert.inserted[0]).toMatchObject({
      user_id: 'student-1',
      visitor_hash: null,
      email: 'an@gmail.com',
      category: 'bug',
      message: 'Nút Học ngay không bấm được',
      page_url: 'https://scipal.vercel.app/',
      user_agent: 'Phone',
    });
    expect(insert.inserted[0]).not.toHaveProperty('status');
    await app.close();
  });

  it('lets a visitor report, known only by a hash of their address', async () => {
    const recent = mockQuery({ data: null, error: null, count: 0 });
    const insert = mockQuery({ data: { id: REPORT_ID }, error: null });
    const app = await build(null, { problem_reports: [recent, insert] });
    const res = await app.inject({ method: 'POST', url: '/api/problem-reports', payload: valid, headers: { 'x-real-ip': '1.2.3.4' } });
    expect(res.statusCode).toBe(201);
    const row = insert.inserted[0] as Record<string, unknown>;
    expect(row.user_id).toBeNull();
    expect(row.email).toBe('khach@gmail.com');
    expect(row.visitor_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain('1.2.3.4');
    await app.close();
  });

  it('turns visitors away while guest hashing is not configured', async () => {
    delete process.env.GUEST_TRIAL_SECRET;
    const app = await build(null, { problem_reports: mockQuery({ data: null, error: null }) });
    expect((await app.inject({ method: 'POST', url: '/api/problem-reports', payload: valid })).statusCode).toBe(401);
    await app.close();
  });

  it('limits how many reports one person sends in an hour', async () => {
    const app = await build(student, { problem_reports: mockQuery({ data: null, error: null, count: 5 }) });
    expect((await app.inject({ method: 'POST', url: '/api/problem-reports', payload: valid })).statusCode).toBe(429);
    await app.close();
  });

  it('refuses bad input', async () => {
    for (const payload of [
      { ...valid, category: 'spam' },
      { ...valid, message: 'ngắn' },
      { ...valid, message: 'a'.repeat(2001) },
      { ...valid, page_url: 'javascript:alert(1)' },
      { ...valid, email: 'not-an-email' },
    ]) {
      const app = await build(student, { problem_reports: mockQuery({ data: null, error: null, count: 0 }) });
      expect((await app.inject({ method: 'POST', url: '/api/problem-reports', payload })).statusCode).toBe(400);
      await app.close();
    }
  });
});

describe('admin review of reports', () => {
  it('lists open reports for admins only', async () => {
    const list = mockQuery({ data: [open], error: null });
    const app = await build(admin, { problem_reports: list });
    const res = await app.inject({ method: 'GET', url: '/api/admin/problem-reports' });
    expect(res.statusCode).toBe(200);
    expect(res.json().reports).toHaveLength(1);
    expect(list.eqCalls).toContainEqual(['status', 'open']);
    await app.close();

    for (const user of [null, student]) {
      const other = await build(user, { problem_reports: mockQuery({ data: [open], error: null }) });
      expect((await other.inject({ method: 'GET', url: '/api/admin/problem-reports' })).statusCode).toBe(403);
      await other.close();
    }
  });

  it('marks a report resolved once', async () => {
    const update = mockQuery({ data: { ...open, status: 'resolved' }, error: null });
    const app = await build(admin, { problem_reports: update });
    const res = await app.inject({ method: 'POST', url: `/api/admin/problem-reports/${REPORT_ID}/resolve` });
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ status: 'resolved', resolved_by: 'admin-1' });
    expect(update.eqCalls).toContainEqual(['status', 'open']);
    await app.close();

    const gone = await build(admin, { problem_reports: mockQuery({ data: null, error: null }) });
    expect((await gone.inject({ method: 'POST', url: `/api/admin/problem-reports/${REPORT_ID}/resolve` })).statusCode).toBe(409);
    expect((await gone.inject({ method: 'POST', url: '/api/admin/problem-reports/nope/resolve' })).statusCode).toBe(404);
    await gone.close();
  });
});
