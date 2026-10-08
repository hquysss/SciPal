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

  it('saves a lesson source trimmed, clears it when empty, and refuses over 300 characters', async () => {
    const write = mockQuery({ data: { id: LESSON_ID, status: 'draft' }, error: null });
    const app = await buildAuthoringApp(admin, {
      lessons: [
        mockQuery({ data: { id: LESSON_ID, created_by: teacher.id, status: 'draft', updated_at: STAMP }, error: null }),
        write,
        mockQuery({ data: { id: LESSON_ID, created_by: teacher.id, status: 'draft', updated_at: STAMP }, error: null }),
      ],
    });
    const url = `/api/authoring/lessons/${LESSON_ID}`;
    const ok = await app.inject({ method: 'PATCH', url, payload: { expected_updated_at: STAMP, source: '  SGK Vật lí 11  ' } });
    expect(ok.statusCode).toBe(200);
    expect(write.updated[0]).toMatchObject({ source: 'SGK Vật lí 11' });
    const long = await app.inject({ method: 'PATCH', url, payload: { expected_updated_at: STAMP, source: 'x'.repeat(301) } });
    expect(long.statusCode).toBe(400);
    await app.close();
  });

  it('moves a lesson to another topic of its own subject and grade, and refuses any other', async () => {
    const SUBJECT = '33333333-3333-4333-8333-333333333333';
    const OTHER_SUBJECT = '44444444-4444-4444-8444-444444444444';
    const TOPIC = '55555555-5555-4555-8555-555555555555';
    const lessonRow = { id: LESSON_ID, subject_id: SUBJECT, grade: 11, created_by: teacher.id, status: 'draft', updated_at: STAMP };
    const write = mockQuery({ data: { id: LESSON_ID, topic_id: TOPIC }, error: null });
    const app = await buildAuthoringApp(teacher, {
      lessons: [
        mockQuery({ data: lessonRow, error: null }),
        write,
        mockQuery({ data: lessonRow, error: null }),
        mockQuery({ data: lessonRow, error: null }),
        mockQuery({ data: lessonRow, error: null }),
      ],
      topics: [
        mockQuery({ data: { id: TOPIC, subject_id: SUBJECT, grade: 11 }, error: null }),
        mockQuery({ data: { id: TOPIC, subject_id: OTHER_SUBJECT, grade: 11 }, error: null }),
        mockQuery({ data: { id: TOPIC, subject_id: SUBJECT, grade: 12 }, error: null }),
      ],
    });
    const send = (payload: Record<string, unknown>) =>
      app.inject({ method: 'PATCH', url: `/api/authoring/lessons/${LESSON_ID}`, payload: { expected_updated_at: STAMP, ...payload } });
    expect((await send({ topic_id: TOPIC })).statusCode).toBe(200);
    expect(write.updated[0]).toMatchObject({ topic_id: TOPIC });
    expect((await send({ topic_id: TOPIC })).statusCode).toBe(400); // another subject
    expect((await send({ topic_id: TOPIC })).statusCode).toBe(400); // another grade
    expect((await send({ topic_id: 'not-a-uuid' })).statusCode).toBe(400);
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

describe('authoring publish timestamps', () => {
  it('editing an already-published lesson keeps its original published_at and approver', async () => {
    const write = mockQuery({ data: { id: LESSON_ID, status: 'published' }, error: null });
    const app = await buildAuthoringApp(admin, {
      lessons: [
        mockQuery({ data: { id: LESSON_ID, created_by: teacher.id, status: 'published', updated_at: STAMP }, error: null }),
        write,
      ],
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}`,
      payload: { expected_updated_at: STAMP, status: 'published', title_vi: 'Tìm kiếm nhị phân' },
    });
    expect(res.statusCode).toBe(200);
    const row = write.updated[0] as Record<string, unknown>;
    expect(row).not.toHaveProperty('published_at');
    expect(row).not.toHaveProperty('reviewed_by');
    expect(row.title_vi).toBe('Tìm kiếm nhị phân');
    await app.close();
  });
});

describe('authoring block errors', () => {
  it('names the part, block and field of a bad block', async () => {
    const app = await buildAuthoringApp(teacher, {
      lessons: mockQuery({ data: { id: LESSON_ID, created_by: teacher.id, status: 'draft', updated_at: STAMP }, error: null }),
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/authoring/lessons/${LESSON_ID}`,
      payload: { expected_updated_at: STAMP, blocks: [{ type: 'formula', katex: 7 }] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues[0]).toMatchObject({ part: 'lesson', index: 0, field: 'katex' });
    expect(res.json().error_en).toBeDefined();
    await app.close();
  });
});

describe('authoring lesson ids', () => {
  it('answers a non-UUID lesson id with 404 without querying the database', async () => {
    const app = await buildAuthoringApp(admin, {});
    for (const [method, url] of [
      ['GET', '/api/authoring/lessons/not-a-uuid'],
      ['PATCH', '/api/authoring/lessons/not-a-uuid'],
      ['PATCH', '/api/authoring/lessons/not-a-uuid/review'],
    ] as const) {
      const res = await app.inject({
        method,
        url,
        payload: method === 'GET' ? undefined : { expected_updated_at: STAMP, decision: 'approve', title_en: 'T' },
      });
      expect(res.statusCode, `${method} ${url}`).toBe(404);
    }
    await app.close();
  });
});
