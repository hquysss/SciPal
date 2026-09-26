// backend/src/__tests__/authoring-lesson-create.test.ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authoringRoutes } from '../routes/authoring.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const TOPIC_ID = '33333333-3333-4333-8333-333333333333';
const SUBJECT_ID = '11111111-1111-4111-8111-111111111111';
const TRACK_ID = '44444444-4444-4444-8444-444444444444';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const body = { topic_id: TOPIC_ID, grade: 11, title_en: 'Search', title_vi: 'Tìm kiếm' };

async function buildApp(tables: Parameters<typeof mockSupabase>[0]) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (request) => { (request as any).user = teacher; });
  await app.register(authoringRoutes);
  await app.ready();
  return app;
}

const baseTables = (over: Record<string, unknown> = {}) => ({
  topics: mockQuery({ data: { id: TOPIC_ID, subject_id: SUBJECT_ID, grade: null }, error: null }),
  subjects: mockQuery({ data: { id: SUBJECT_ID }, error: null }),
  subject_grade_catalog: mockQuery({ data: { id: 'c1' }, error: null }),
  subject_tracks: mockQuery({ data: { id: TRACK_ID, subject_id: SUBJECT_ID, grades: [10, 11, 12] }, error: null }),
  lessons: [mockQuery({ data: null, error: null }), mockQuery({ data: { id: 'lesson-1' }, error: null })],
  ...over,
});

describe('POST /api/authoring/lessons grade rules', () => {
  it('requires a grade', async () => {
    const app = await buildApp(baseTables());
    const { grade: _grade, ...noGrade } = body;
    expect((await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: noGrade })).statusCode).toBe(400);
    await app.close();
  });

  it('rejects a grade that differs from the topic grade', async () => {
    const app = await buildApp(baseTables({
      topics: mockQuery({ data: { id: TOPIC_ID, subject_id: SUBJECT_ID, grade: 10 }, error: null }),
    }));
    expect((await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: body })).statusCode).toBe(400);
    await app.close();
  });

  it('rejects a grade outside the subject catalog', async () => {
    const app = await buildApp(baseTables({ subject_grade_catalog: mockQuery({ data: null, error: null }) }));
    expect((await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: body })).statusCode).toBe(400);
    await app.close();
  });

  it('rejects a track from another subject or grade', async () => {
    for (const track of [
      { id: TRACK_ID, subject_id: 'other-subject', grades: [11] },
      { id: TRACK_ID, subject_id: SUBJECT_ID, grades: [10] },
    ]) {
      const app = await buildApp(baseTables({ subject_tracks: mockQuery({ data: track, error: null }) }));
      const res = await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: { ...body, track_id: TRACK_ID } });
      expect(res.statusCode).toBe(400);
      await app.close();
    }
  });

  it('creates a draft on any catalog subject with the chosen track', async () => {
    const tables = baseTables();
    const insert = (tables.lessons as ReturnType<typeof mockQuery>[])[1]!;
    const app = await buildApp(tables);
    const res = await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: { ...body, track_id: TRACK_ID } });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ grade: 11, status: 'draft', track_id: TRACK_ID, subject_id: SUBJECT_ID });
    await app.close();
  });
});
