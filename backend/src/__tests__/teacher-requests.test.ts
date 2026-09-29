import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { teacherRequestRoutes } from '../routes/teacherRequests.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const REQUEST_ID = '44444444-4444-4444-8444-444444444444';
const student = { id: 'student-1', email: 'an@gmail.com', user_metadata: { display_name: 'Lê An' }, app_metadata: { app_role: 'student' } };
const newcomer = { id: 'user-2', email: 'b@gmail.com', app_metadata: {} };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const pending = { id: REQUEST_ID, user_id: 'student-1', status: 'pending', school: 'THPT A', subject: 'Tin học', created_at: '2026-09-30T00:00:00Z' };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>, updateUserById = vi.fn(async () => ({ data: { user: {} }, error: null }))) {
  const app = Fastify();
  const supabase = mockSupabase(tables) as unknown as Record<string, unknown>;
  supabase.auth = { admin: { updateUserById } };
  app.decorate('supabase', supabase as never);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  await app.register(teacherRequestRoutes);
  await app.ready();
  return { app, updateUserById };
}

const valid = { school: '  THPT Nguyễn Du  ', subject: 'Tin học', note: 'Dạy lớp 10', evidence_url: 'https://thpt-a.edu.vn/giao-vien/an' };

describe('asking to become a teacher', () => {
  it('stores a pending request with who asked', async () => {
    const insert = mockQuery({ data: { ...pending, school: 'THPT Nguyễn Du' }, error: null });
    const { app } = await build(student, { teacher_requests: insert });
    const res = await app.inject({ method: 'POST', url: '/api/teacher-requests', payload: valid });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({
      user_id: 'student-1',
      email: 'an@gmail.com',
      display_name: 'Lê An',
      school: 'THPT Nguyễn Du',
      subject: 'Tin học',
      note: 'Dạy lớp 10',
      evidence_url: 'https://thpt-a.edu.vn/giao-vien/an',
    });
    expect(insert.inserted[0]).not.toHaveProperty('status');
    await app.close();
  });

  it('counts an account without a role as a student', async () => {
    const { app } = await build(newcomer, { teacher_requests: mockQuery({ data: pending, error: null }) });
    expect((await app.inject({ method: 'POST', url: '/api/teacher-requests', payload: valid })).statusCode).toBe(201);
    await app.close();
  });

  it('refuses visitors, teachers, admins and bad input', async () => {
    for (const [user, code] of [[null, 401], [teacher, 409], [admin, 409]] as const) {
      const { app } = await build(user, { teacher_requests: mockQuery({ data: null, error: null }) });
      expect((await app.inject({ method: 'POST', url: '/api/teacher-requests', payload: valid })).statusCode).toBe(code);
      await app.close();
    }
    for (const payload of [
      { ...valid, school: '  ' },
      { ...valid, subject: '' },
      { ...valid, school: 'x'.repeat(201) },
      { ...valid, note: 'x'.repeat(1001) },
      { ...valid, evidence_url: 'javascript:alert(1)' },
      { ...valid, evidence_url: 'ftp://x.vn' },
    ]) {
      const { app } = await build(student, { teacher_requests: mockQuery({ data: null, error: null }) });
      expect((await app.inject({ method: 'POST', url: '/api/teacher-requests', payload })).statusCode, JSON.stringify(payload)).toBe(400);
      await app.close();
    }
  });

  it('allows one open request at a time', async () => {
    const { app } = await build(student, { teacher_requests: mockQuery({ data: null, error: { code: '23505' } }) });
    const res = await app.inject({ method: 'POST', url: '/api/teacher-requests', payload: valid });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('REQUEST_PENDING');
    await app.close();
  });
});

describe('the requester', () => {
  it('sees their latest request', async () => {
    const read = mockQuery({ data: pending, error: null });
    const { app } = await build(student, { teacher_requests: read });
    const res = await app.inject({ method: 'GET', url: '/api/teacher-requests/mine' });
    expect(res.json()).toEqual({ request: expect.objectContaining({ id: REQUEST_ID, status: 'pending' }) });
    expect(read.eqCalls).toContainEqual(['user_id', 'student-1']);
    await app.close();
  });

  it('cancels only their own pending request', async () => {
    const update = mockQuery({ data: [{ id: REQUEST_ID }], error: null });
    const { app } = await build(student, { teacher_requests: update });
    expect((await app.inject({ method: 'DELETE', url: '/api/teacher-requests/mine' })).statusCode).toBe(204);
    expect(update.updated[0]).toEqual({ status: 'cancelled' });
    expect(update.eqCalls).toEqual(expect.arrayContaining([['user_id', 'student-1'], ['status', 'pending']]));
    await app.close();
  });
});

describe('admin review', () => {
  it('is for admins only', async () => {
    for (const user of [student, teacher]) {
      const { app } = await build(user, {});
      expect((await app.inject({ method: 'GET', url: '/api/admin/teacher-requests' })).statusCode).toBe(403);
      expect((await app.inject({ method: 'POST', url: `/api/admin/teacher-requests/${REQUEST_ID}/approve` })).statusCode).toBe(403);
      await app.close();
    }
  });

  it('lists pending requests and counts them', async () => {
    const list = mockQuery({ data: [pending], error: null });
    const { app } = await build(admin, { teacher_requests: [list, mockQuery({ data: null, error: null, count: 3 })] });
    expect((await app.inject({ method: 'GET', url: '/api/admin/teacher-requests' })).json()).toEqual({ requests: [pending] });
    expect(list.eqCalls).toContainEqual(['status', 'pending']);
    expect((await app.inject({ method: 'GET', url: '/api/admin/teacher-requests/count' })).json()).toEqual({ pending: 3 });
    await app.close();
  });

  it('approves: the request closes and the account becomes a teacher', async () => {
    const close = mockQuery({ data: { ...pending, status: 'approved' }, error: null });
    const profile = mockQuery({ data: null, error: null });
    const { app, updateUserById } = await build(admin, { teacher_requests: close, profiles: profile });
    const res = await app.inject({ method: 'POST', url: `/api/admin/teacher-requests/${REQUEST_ID}/approve` });
    expect(res.statusCode).toBe(200);
    expect(close.updated[0]).toMatchObject({ status: 'approved', reviewed_by: 'admin-1' });
    expect(close.eqCalls).toContainEqual(['status', 'pending']);
    expect(updateUserById).toHaveBeenCalledWith('student-1', { app_metadata: { app_role: 'teacher' } });
    expect(profile.updated[0]).toEqual({ role: 'teacher' });
    await app.close();
  });

  it('reopens the request when the role cannot be changed', async () => {
    const close = mockQuery({ data: { ...pending, status: 'approved' }, error: null });
    const reopen = mockQuery({ data: null, error: null });
    const failing = vi.fn(async () => ({ data: { user: null }, error: { message: 'down' } }));
    const { app } = await build(admin, { teacher_requests: [close, reopen] }, failing as never);
    expect((await app.inject({ method: 'POST', url: `/api/admin/teacher-requests/${REQUEST_ID}/approve` })).statusCode).toBe(503);
    expect(reopen.updated[0]).toEqual({ status: 'pending', reviewed_by: null, reviewed_at: null });
    await app.close();
  });

  it('answers 409 for a request already handled', async () => {
    const { app, updateUserById } = await build(admin, { teacher_requests: mockQuery({ data: null, error: null }) });
    expect((await app.inject({ method: 'POST', url: `/api/admin/teacher-requests/${REQUEST_ID}/approve` })).statusCode).toBe(409);
    expect(updateUserById).not.toHaveBeenCalled();
    await app.close();
  });

  it('declines with a reason, and only with one', async () => {
    const close = mockQuery({ data: { ...pending, status: 'rejected' }, error: null });
    const { app, updateUserById } = await build(admin, { teacher_requests: close });
    expect((await app.inject({ method: 'POST', url: `/api/admin/teacher-requests/${REQUEST_ID}/reject`, payload: { note: ' ' } })).statusCode).toBe(400);
    const res = await app.inject({ method: 'POST', url: `/api/admin/teacher-requests/${REQUEST_ID}/reject`, payload: { note: 'Chưa có minh chứng' } });
    expect(res.statusCode).toBe(200);
    expect(close.updated[0]).toMatchObject({ status: 'rejected', review_note: 'Chưa có minh chứng', reviewed_by: 'admin-1' });
    expect(updateUserById).not.toHaveBeenCalled();
    await app.close();
  });

  it('treats a malformed id as not found', async () => {
    const { app } = await build(admin, {});
    expect((await app.inject({ method: 'POST', url: '/api/admin/teacher-requests/abc/approve' })).statusCode).toBe(404);
    await app.close();
  });
});
