import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authoringRoutes, teacherCanDeleteDirectly } from '../routes/authoring.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };

async function buildApp(user: typeof teacher, tables: Parameters<typeof mockSupabase>[0]) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (request) => { (request as any).user = user; });
  await app.register(authoringRoutes);
  await app.ready();
  return app;
}

const lessonRow = (over: Record<string, unknown> = {}) =>
  mockQuery({
    data: { id: LESSON_ID, created_by: 'teacher-1', status: 'draft', published_at: null, delete_requested_at: null, ...over },
    error: null,
  });

describe('teacherCanDeleteDirectly', () => {
  it('allows only lessons students never saw', () => {
    expect(teacherCanDeleteDirectly({ status: 'draft', published_at: null })).toBe(true);
    expect(teacherCanDeleteDirectly({ status: 'rejected', published_at: null })).toBe(true);
    expect(teacherCanDeleteDirectly({ status: 'published', published_at: '2026-09-01' })).toBe(false);
    expect(teacherCanDeleteDirectly({ status: 'pending_review', published_at: null })).toBe(false);
    expect(teacherCanDeleteDirectly({ status: 'draft', published_at: '2026-09-01' })).toBe(false);
  });
});

describe('DELETE /api/authoring/lessons/:id', () => {
  it('lets a teacher delete their own draft, keeping its questions in the pool', async () => {
    const remove = mockQuery({ data: null, error: null });
    const questions = mockQuery({ data: null, error: null });
    const app = await buildApp(teacher, { lessons: [lessonRow(), remove], questions });
    const res = await app.inject({ method: 'DELETE', url: `/api/authoring/lessons/${LESSON_ID}` });
    expect(res.statusCode).toBe(204);
    expect(questions.updated).toEqual([{ lesson_id: null }]);
    expect(remove.deleteCalls).toBe(1);
    await app.close();
  });

  it('refuses a teacher deleting a published lesson and points to a request', async () => {
    const app = await buildApp(teacher, { lessons: [lessonRow({ status: 'published', published_at: '2026-09-01' })] });
    const res = await app.inject({ method: 'DELETE', url: `/api/authoring/lessons/${LESSON_ID}` });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toContain('yêu cầu xóa');
    await app.close();
  });

  it("hides another teacher's lesson", async () => {
    const app = await buildApp(teacher, { lessons: [lessonRow({ created_by: 'teacher-2' })] });
    expect((await app.inject({ method: 'DELETE', url: `/api/authoring/lessons/${LESSON_ID}` })).statusCode).toBe(404);
    await app.close();
  });

  it('lets an admin delete a published lesson', async () => {
    const remove = mockQuery({ data: null, error: null });
    const app = await buildApp(admin, {
      lessons: [lessonRow({ status: 'published', published_at: '2026-09-01', created_by: 'teacher-2' }), remove],
      questions: mockQuery({ data: null, error: null }),
    });
    expect((await app.inject({ method: 'DELETE', url: `/api/authoring/lessons/${LESSON_ID}` })).statusCode).toBe(204);
    expect(remove.deleteCalls).toBe(1);
    await app.close();
  });

  it('explains a lesson still assigned to a class', async () => {
    const app = await buildApp(admin, {
      lessons: [lessonRow(), mockQuery({ data: null, error: { code: '23503', message: 'fk' } })],
      questions: mockQuery({ data: null, error: null }),
    });
    const res = await app.inject({ method: 'DELETE', url: `/api/authoring/lessons/${LESSON_ID}` });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toContain('giao cho lớp');
    await app.close();
  });
});

describe('lesson delete requests', () => {
  it('records a teacher request with a note, only while none is open', async () => {
    const write = mockQuery({ data: { id: LESSON_ID, delete_requested_at: 'now', delete_request_note: 'Trùng bài' }, error: null });
    const app = await buildApp(teacher, { lessons: [lessonRow({ status: 'published', published_at: '2026-09-01' }), write] });
    const res = await app.inject({
      method: 'POST',
      url: `/api/authoring/lessons/${LESSON_ID}/delete-request`,
      payload: { note: '  Trùng bài  ' },
    });
    expect(res.statusCode).toBe(201);
    expect(write.updated[0]).toMatchObject({ delete_requested_by: 'teacher-1', delete_request_note: 'Trùng bài' });
    expect(write.isCalls).toContainEqual(['delete_requested_at', null]);
    await app.close();
  });

  it('refuses a second request and a request for a lesson the teacher can delete', async () => {
    const already = await buildApp(teacher, {
      lessons: [lessonRow({ status: 'published', published_at: '2026-09-01', delete_requested_at: '2026-09-02' })],
    });
    expect((await already.inject({ method: 'POST', url: `/api/authoring/lessons/${LESSON_ID}/delete-request` })).statusCode).toBe(409);
    await already.close();

    const draft = await buildApp(teacher, { lessons: [lessonRow()] });
    expect((await draft.inject({ method: 'POST', url: `/api/authoring/lessons/${LESSON_ID}/delete-request` })).statusCode).toBe(400);
    await draft.close();
  });

  it('keeps requests teacher-only', async () => {
    const app = await buildApp(admin, {});
    expect((await app.inject({ method: 'POST', url: `/api/authoring/lessons/${LESSON_ID}/delete-request` })).statusCode).toBe(403);
    await app.close();
  });

  it('lets an admin decline a request', async () => {
    const clear = mockQuery({ data: null, error: null });
    const app = await buildApp(admin, {
      lessons: [lessonRow({ status: 'published', created_by: 'teacher-2', delete_requested_at: '2026-09-02' }), clear],
    });
    const res = await app.inject({ method: 'DELETE', url: `/api/authoring/lessons/${LESSON_ID}/delete-request` });
    expect(res.statusCode).toBe(204);
    expect(clear.updated[0]).toEqual({ delete_requested_at: null, delete_requested_by: null, delete_request_note: null });
    await app.close();
  });

  it('lists requests for admins only', async () => {
    const teacherApp = await buildApp(teacher, {});
    expect((await teacherApp.inject({ method: 'GET', url: '/api/authoring/delete-requests' })).statusCode).toBe(403);
    await teacherApp.close();

    const adminApp = await buildApp(admin, {
      lessons: mockQuery({ data: [{ id: LESSON_ID, title_vi: 'Bài', blocks: [], subjects: null, topics: null }], error: null }),
    });
    const res = await adminApp.inject({ method: 'GET', url: '/api/authoring/delete-requests' });
    expect(res.statusCode).toBe(200);
    expect(res.json().lessons).toHaveLength(1);
    await adminApp.close();
  });
});
