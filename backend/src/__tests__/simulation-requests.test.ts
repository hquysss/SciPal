import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { simulationRequestRoutes } from '../routes/simulationRequests.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const BASE = 'https://pub-test.r2.dev';
const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const REQUEST_ID = '33333333-3333-4333-8333-333333333333';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const otherTeacher = { id: 'teacher-2', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };
const lesson = { id: LESSON_ID, created_by: 'teacher-1', title_vi: 'Khúc xạ', title_en: 'Refraction', subject_id: 'subject-1' };
const validResult = { type: 'interactive', kind: 'embed', heading: { vi: 'Khúc xạ', en: 'Refraction' }, offline: false, embed_url: 'https://phet.colorado.edu/sims/html/bending-light/latest/bending-light_all.html', config: {} };

beforeEach(() => {
  vi.stubEnv('MEDIA_PUBLIC_URL', BASE);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => {
    (req as any).user = user;
  });
  await app.register(simulationRequestRoutes);
  await app.ready();
  return app;
}

const post = (app: Awaited<ReturnType<typeof build>>, payload: object) =>
  app.inject({ method: 'POST', url: `/api/authoring/lessons/${LESSON_ID}/simulation-requests`, payload });

describe('creating a request', () => {
  it('stores the request for the lesson author', async () => {
    const insert = mockQuery({ data: { id: REQUEST_ID, status: 'open' }, error: null });
    const app = await build(teacher, { lessons: mockQuery({ data: lesson, error: null }), simulation_requests: insert });
    const res = await post(app, {
      description: '  Kéo góc tới, thấy tia khúc xạ  ',
      reference_url: 'https://phet.colorado.edu/en/simulations/bending-light',
      sketch_url: `${BASE}/teacher-1/s.png`,
    });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ lesson_id: LESSON_ID, requested_by: 'teacher-1', description: 'Kéo góc tới, thấy tia khúc xạ', status: 'open' });
    await app.close();
  });

  it('refuses students, other teachers and bad input', async () => {
    const studentApp = await build(student, {});
    expect((await post(studentApp, { description: 'x' })).statusCode).toBe(403);
    await studentApp.close();

    const other = await build(otherTeacher, { lessons: mockQuery({ data: lesson, error: null }) });
    expect((await post(other, { description: 'x' })).statusCode).toBe(404);
    await other.close();

    for (const payload of [
      { description: '   ' },
      { description: 'x'.repeat(1001) },
      { description: 'x', reference_url: 'http://phet.colorado.edu/x' },
      { description: 'x', reference_url: 'javascript:alert(1)' },
      { description: 'x', sketch_url: "https://evil.example.com/1.png" },
      { description: 'x', sketch_url: 'https://evil.example/lesson-media/1.png' },
    ]) {
      const app = await build(teacher, { lessons: mockQuery({ data: lesson, error: null }), simulation_requests: mockQuery({ data: null, error: null }) });
      expect((await post(app, payload)).statusCode, JSON.stringify(payload)).toBe(400);
      await app.close();
    }
  });

  it('lets an admin request for any lesson', async () => {
    const app = await build(admin, { lessons: mockQuery({ data: lesson, error: null }), simulation_requests: mockQuery({ data: { id: REQUEST_ID }, error: null }) });
    expect((await post(app, { description: 'Cần mô phỏng' })).statusCode).toBe(201);
    await app.close();
  });
});

describe('listing requests', () => {
  const row = (result_block: unknown) => ({
    id: REQUEST_ID,
    status: 'done',
    result_block,
    lessons: { id: LESSON_ID, title_vi: 'Khúc xạ', title_en: 'Refraction', subject_id: 'subject-1', subjects: { slug: 'physics', name_vi: 'Vật lý', name_en: 'Physics' } },
  });

  it("shows a teacher only their own requests, with lesson and subject, and drops an invalid result", async () => {
    const list = mockQuery({ data: [row(validResult), row({ type: 'interactive', kind: 'embed', embed_url: 'https://evil.example' })], error: null });
    const app = await build(teacher, { simulation_requests: list });
    const res = await app.inject({ method: 'GET', url: `/api/authoring/simulation-requests?lesson_id=${LESSON_ID}` });
    expect(res.statusCode).toBe(200);
    expect(list.eqCalls).toContainEqual(['requested_by', 'teacher-1']);
    expect(list.eqCalls).toContainEqual(['lesson_id', LESSON_ID]);
    const body = res.json();
    expect(body.requests[0]).toMatchObject({ lesson_title_vi: 'Khúc xạ', subject_slug: 'physics', result_block: validResult });
    expect(body.requests[1].result_block).toBeNull();
    await app.close();
  });

  it('shows admins every request, filtered by status', async () => {
    const list = mockQuery({ data: [], error: null });
    const app = await build(admin, { simulation_requests: list });
    expect((await app.inject({ method: 'GET', url: '/api/authoring/simulation-requests?status=open' })).statusCode).toBe(200);
    expect(list.eqCalls).not.toContainEqual(['requested_by', 'admin-1']);
    expect(list.eqCalls).toContainEqual(['status', 'open']);
    expect((await app.inject({ method: 'GET', url: '/api/authoring/simulation-requests?status=nope' })).statusCode).toBe(400);
    await app.close();
  });
});

describe('withdrawing', () => {
  it('only while open, only by the requester', async () => {
    const del = mockQuery({ data: [{ id: REQUEST_ID }], error: null });
    const app = await build(teacher, { simulation_requests: [mockQuery({ data: { id: REQUEST_ID, requested_by: 'teacher-1', status: 'open' }, error: null }), del] });
    expect((await app.inject({ method: 'DELETE', url: `/api/authoring/simulation-requests/${REQUEST_ID}` })).statusCode).toBe(204);
    expect(del.deleteCalls).toBe(1);
    expect(del.eqCalls).toContainEqual(['status', 'open']);
    await app.close();

    const taken = await build(teacher, { simulation_requests: mockQuery({ data: { id: REQUEST_ID, requested_by: 'teacher-1', status: 'in_progress' }, error: null }) });
    expect((await taken.inject({ method: 'DELETE', url: `/api/authoring/simulation-requests/${REQUEST_ID}` })).statusCode).toBe(409);
    await taken.close();

    const other = await build(otherTeacher, { simulation_requests: mockQuery({ data: { id: REQUEST_ID, requested_by: 'teacher-1', status: 'open' }, error: null }) });
    expect((await other.inject({ method: 'DELETE', url: `/api/authoring/simulation-requests/${REQUEST_ID}` })).statusCode).toBe(404);
    await other.close();
  });
});

describe('admin transitions', () => {
  const act = (app: Awaited<ReturnType<typeof build>>, action: string, payload: object = {}) =>
    app.inject({ method: 'POST', url: `/api/admin/simulation-requests/${REQUEST_ID}/${action}`, payload });

  it('are for admins only', async () => {
    const app = await build(teacher, {});
    expect((await act(app, 'accept')).statusCode).toBe(403);
    await app.close();
  });

  it('accept moves an open request to in progress, guarded by its status', async () => {
    const update = mockQuery({ data: { id: REQUEST_ID, status: 'in_progress' }, error: null });
    const app = await build(admin, { simulation_requests: update });
    const res = await act(app, 'accept');
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ status: 'in_progress', handled_by: 'admin-1' });
    expect(update.eqCalls).toContainEqual(['status', 'open']);
    await app.close();
  });

  it('the second of two competing admins gets 409 and changes nothing', async () => {
    const app = await build(admin, {
      simulation_requests: [
        mockQuery({ data: null, error: null }), // the guarded update matched no row
        mockQuery({ data: { id: REQUEST_ID, status: 'declined' }, error: null }), // it exists, already handled
      ],
    });
    const res = await act(app, 'complete', { result_block: validResult });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it('decline needs a note', async () => {
    const app = await build(admin, { simulation_requests: mockQuery({ data: { id: REQUEST_ID }, error: null }) });
    expect((await act(app, 'decline', { note: '  ' })).statusCode).toBe(400);
    await app.close();

    const update = mockQuery({ data: { id: REQUEST_ID, status: 'declined' }, error: null });
    const ok = await build(admin, { simulation_requests: update });
    expect((await act(ok, 'decline', { note: 'Đã có trong danh mục: dùng mẫu Chuyển động' })).statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ status: 'declined', admin_note: 'Đã có trong danh mục: dùng mẫu Chuyển động' });
    await ok.close();
  });

  it('complete needs a valid simulation block', async () => {
    for (const result_block of [
      undefined,
      { type: 'theory', content: { vi: 'a', en: 'a' } },
      { ...validResult, embed_url: 'https://evil.example/x' },
      { type: 'interactive', kind: 'motion', heading: { vi: 'A', en: 'A' }, offline: true, config: { v0: 9999 } },
    ]) {
      const app = await build(admin, { simulation_requests: mockQuery({ data: { id: REQUEST_ID }, error: null }) });
      expect((await act(app, 'complete', { result_block })).statusCode, JSON.stringify(result_block)).toBe(400);
      await app.close();
    }
    const update = mockQuery({ data: { id: REQUEST_ID, status: 'done' }, error: null });
    const ok = await build(admin, { simulation_requests: update });
    expect((await act(ok, 'complete', { result_block: validResult })).statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ status: 'done', result_block: validResult, handled_by: 'admin-1' });
    await ok.close();
  });

  it('counts open requests for the admin menu', async () => {
    const app = await build(admin, { simulation_requests: mockQuery({ data: null, error: null, count: 3 } as never) });
    const res = await app.inject({ method: 'GET', url: '/api/admin/simulation-requests/count' });
    expect(res.json()).toEqual({ open: 3 });
    await app.close();
  });
});

describe('migration', () => {
  const sql = readFileSync('../supabase/migrations/20260927130000_simulation_requests.sql', 'utf8').toLowerCase();

  it('keeps writes on the server and reads to the requester or an admin', () => {
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('revoke insert, update, delete on public.simulation_requests from anon, authenticated');
    expect(sql).toContain('(select auth.uid())');
    expect(sql).not.toMatch(/create policy[^;]*for (insert|update|delete|all)/);
  });

  it('enforces the workflow in the table too', () => {
    expect(sql).toContain("status in ('open', 'in_progress', 'done', 'declined')");
    expect(sql).toContain("status <> 'done' or result_block is not null");
    expect(sql).toContain("status <> 'declined' or admin_note is not null");
  });
});
