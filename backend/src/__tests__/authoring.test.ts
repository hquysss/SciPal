import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { authoringRoutes } from '../routes/authoring.js';

describe('Authoring Routes', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(authPlugin);
    await app.register(authoringRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('PATCH /api/authoring/lessons/:id returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/authoring/lessons/test-lesson-id',
      payload: {
        title_vi: 'Lý thuyết thuật toán mới',
        published: true,
      },
    });

    expect(res.statusCode).toBe(401);
  });
});

import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const STAMP = '2026-09-26T00:00:00.000Z';
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };

async function buildAuthoringApp(
  user: { id: string; app_metadata: { app_role: string } },
  tables: Parameters<typeof mockSupabase>[0],
) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (request) => {
    (request as any).user = user;
  });
  await app.register(authoringRoutes);
  await app.ready();
  return app;
}

describe('authoring lesson status', () => {
  it('approving a pending lesson publishes it with a timestamp', async () => {
    const write = mockQuery({ data: { id: LESSON_ID, status: 'published' }, error: null });
    const app = await buildAuthoringApp(admin, {
      lessons: [mockQuery({ data: { id: LESSON_ID, status: 'pending_review', updated_at: STAMP }, error: null }), write],
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}/review`,
      payload: { decision: 'approve', expected_updated_at: STAMP },
    });
    expect(res.statusCode).toBe(200);
    const row = write.updated[0] as Record<string, unknown>;
    expect(row.status).toBe('published');
    expect(typeof row.published_at).toBe('string');
    expect(row.review_note).toBeNull();
    expect(write.eqCalls).toContainEqual(['status', 'pending_review']);
    await app.close();
  });

  it('rejecting stores the reviewer note and clears published_at', async () => {
    const write = mockQuery({ data: { id: LESSON_ID, status: 'rejected' }, error: null });
    const app = await buildAuthoringApp(admin, {
      lessons: [mockQuery({ data: { id: LESSON_ID, status: 'pending_review', updated_at: STAMP }, error: null }), write],
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}/review`,
      payload: { decision: 'reject', expected_updated_at: STAMP, note: '  Thiếu bản tiếng Anh  ' },
    });
    expect(res.statusCode).toBe(200);
    expect(write.updated[0]).toMatchObject({ status: 'rejected', review_note: 'Thiếu bản tiếng Anh', published_at: null });
    await app.close();
  });

  it('the review queue lists pending_review lessons', async () => {
    const list = mockQuery({ data: [], error: null });
    const app = await buildAuthoringApp(admin, { lessons: list });
    const res = await app.inject({ method: 'GET', url: '/api/authoring/reviews' });
    expect(res.statusCode).toBe(200);
    expect(list.eqCalls).toContainEqual(['status', 'pending_review']);
    await app.close();
  });

  it('teachers cannot submit a published lesson', async () => {
    const app = await buildAuthoringApp(teacher, {
      lessons: mockQuery({
        data: { id: LESSON_ID, created_by: teacher.id, status: 'published', updated_at: STAMP },
        error: null,
      }),
    });
    const res = await app.inject({
      method: 'POST',
      url: `/api/authoring/lessons/${LESSON_ID}/submit`,
      payload: {
        title_en: 'Search',
        title_vi: 'Tìm kiếm',
        expected_updated_at: STAMP,
        blocks: [{ type: 'theory', content: { en: 'a', vi: 'b' } }],
      },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('teachers cannot change status directly', async () => {
    const app = await buildAuthoringApp(teacher, {
      lessons: mockQuery({
        data: { id: LESSON_ID, created_by: teacher.id, status: 'draft', updated_at: STAMP },
        error: null,
      }),
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}`,
      payload: { expected_updated_at: STAMP, status: 'published' },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('admins can unpublish and republish; republishing records the approver', async () => {
    const unpublishWrite = mockQuery({ data: { id: LESSON_ID, status: 'draft' }, error: null });
    const republishWrite = mockQuery({ data: { id: LESSON_ID, status: 'published' }, error: null });
    const app = await buildAuthoringApp(admin, {
      lessons: [
        mockQuery({ data: { id: LESSON_ID, created_by: teacher.id, status: 'published', updated_at: STAMP }, error: null }),
        unpublishWrite,
        mockQuery({ data: { id: LESSON_ID, created_by: teacher.id, status: 'draft', updated_at: STAMP }, error: null }),
        republishWrite,
      ],
    });
    const off = await app.inject({
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}`,
      payload: { expected_updated_at: STAMP, status: 'draft' },
    });
    expect(off.statusCode).toBe(200);
    expect(unpublishWrite.updated[0]).toMatchObject({ status: 'draft', published_at: null });

    const on = await app.inject({
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}`,
      payload: { expected_updated_at: STAMP, status: 'published' },
    });
    expect(on.statusCode).toBe(200);
    expect(republishWrite.updated[0]).toMatchObject({ status: 'published', reviewed_by: admin.id });
    await app.close();
  });

  it('rejects the retired published flag', async () => {
    const app = await buildAuthoringApp(admin, {
      lessons: mockQuery({ data: { id: LESSON_ID, created_by: teacher.id, status: 'draft', updated_at: STAMP }, error: null }),
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}`,
      payload: { expected_updated_at: STAMP, published: true },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
