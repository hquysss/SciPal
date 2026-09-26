// backend/src/__tests__/authoring-topics.test.ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { authoringRoutes } from '../routes/authoring.js';
import { planNewTopic, toSubjectOptions, type ExistingTopic } from '../authoring/topicPlanning.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const SUBJECT_ID = '11111111-1111-4111-8111-111111111111';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };

async function buildApp(user: object | null, tables: Parameters<typeof mockSupabase>[0]) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (request) => {
    if (user) (request as any).user = user;
  });
  await app.register(authoringRoutes);
  await app.ready();
  return app;
}

const topic = (over: Partial<ExistingTopic>): ExistingTopic => ({
  id: 't1', slug: 'g4-thuat-toan', grade: 4, name_en: 'Algorithms', name_vi: 'Thuật toán', sort_order: 0, ...over,
});

describe('planNewTopic', () => {
  it('treats names differing only by case and spaces as duplicates in the same grade', () => {
    const existing = [topic({})];
    expect(planNewTopic(existing, { grade: 4, name_en: 'Other', name_vi: '  thuật toán ' }))
      .toEqual({ kind: 'duplicate', topic: existing[0] });
    expect(planNewTopic(existing, { grade: 5, name_en: 'Algorithms', name_vi: 'Thuật toán' }).kind).toBe('new');
  });

  it('prefixes the grade and suffixes clashes within the subject', () => {
    const existing = [topic({ slug: 'g4-plants', name_en: 'x', name_vi: 'x' }), topic({ id: 't2', slug: 'g4-plants-2', name_en: 'y', name_vi: 'y' })];
    expect(planNewTopic(existing, { grade: 4, name_en: 'Plants', name_vi: 'Thực vật' }))
      .toMatchObject({ kind: 'new', slug: 'g4-plants-3' });
    expect(planNewTopic([], { grade: 7, name_en: '!!!', name_vi: 'Chủ đề' }))
      .toMatchObject({ slug: 'g7-chu-de' });
  });

  it('orders a new topic after the last one of the same grade', () => {
    const existing = [topic({ sort_order: 3 }), topic({ id: 't2', slug: 'g5-a', grade: 5, sort_order: 9, name_en: 'a', name_vi: 'a' })];
    expect(planNewTopic(existing, { grade: 4, name_en: 'New', name_vi: 'Mới' })).toMatchObject({ sort_order: 4 });
    expect(planNewTopic([], { grade: 4, name_en: 'New', name_vi: 'Mới' })).toMatchObject({ sort_order: 0 });
  });
});

describe('toSubjectOptions', () => {
  it('keeps active grades sorted and drops subjects without any', () => {
    const rows = [
      { id: 'm', slug: 'math', name_en: 'Math', name_vi: 'Toán', sort_order: 2,
        subject_grade_catalog: [{ grade: 2, active: true }, { grade: 1, active: true }, { grade: 3, active: false }] },
      { id: 'x', slug: 'retired', name_en: 'R', name_vi: 'R', sort_order: 3, subject_grade_catalog: [{ grade: 1, active: false }] },
    ];
    expect(toSubjectOptions(rows)).toEqual([
      { id: 'm', slug: 'math', name_en: 'Math', name_vi: 'Toán', sort_order: 2, grades: [1, 2] },
    ]);
  });
});

describe('GET /api/authoring/options', () => {
  const tables = () => ({
    subjects: mockQuery({ data: [{ id: SUBJECT_ID, slug: 'science', name_en: 'Science', name_vi: 'Khoa học', sort_order: 9,
      subject_grade_catalog: [{ grade: 4, active: true }, { grade: 5, active: true }] }], error: null }),
    topics: mockQuery({ data: [], error: null }),
    subject_tracks: mockQuery({ data: [], error: null }),
  });

  it('serves admins as well as teachers, with catalog grades', async () => {
    for (const user of [teacher, admin]) {
      const app = await buildApp(user, tables());
      const res = await app.inject({ method: 'GET', url: '/api/authoring/options' });
      expect(res.statusCode).toBe(200);
      expect(res.json().subjects[0].grades).toEqual([4, 5]);
      expect(res.json()).toHaveProperty('tracks');
      await app.close();
    }
  });

  it('refuses students', async () => {
    const app = await buildApp(student, tables());
    expect((await app.inject({ method: 'GET', url: '/api/authoring/options' })).statusCode).toBe(403);
    await app.close();
  });
});

describe('POST /api/authoring/topics', () => {
  const payload = { subject_id: SUBJECT_ID, grade: 4, name_en: 'Plants and animals', name_vi: 'Thực vật và động vật' };

  it('requires a token', async () => {
    const app = Fastify();
    await app.register(authPlugin);
    await app.register(authoringRoutes);
    await app.ready();
    expect((await app.inject({ method: 'POST', url: '/api/authoring/topics', payload })).statusCode).toBe(401);
    await app.close();
  });

  it('refuses students', async () => {
    const app = await buildApp(student, {});
    expect((await app.inject({ method: 'POST', url: '/api/authoring/topics', payload })).statusCode).toBe(403);
    await app.close();
  });

  it('rejects a grade outside the subject catalog', async () => {
    const app = await buildApp(teacher, {
      subjects: mockQuery({ data: { id: SUBJECT_ID }, error: null }),
      subject_grade_catalog: mockQuery({ data: null, error: null }),
    });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/topics', payload: { ...payload, grade: 11 } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns the existing topic on a duplicate name', async () => {
    const app = await buildApp(teacher, {
      subjects: mockQuery({ data: { id: SUBJECT_ID }, error: null }),
      subject_grade_catalog: mockQuery({ data: { id: 'c1' }, error: null }),
      topics: mockQuery({ data: [topic({ id: 'dup', name_vi: 'Thực vật và động vật' })], error: null }),
    });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/topics', payload: { ...payload, name_vi: ' thực vật VÀ động vật ' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().topic.id).toBe('dup');
    await app.close();
  });

  it('creates a core topic with a grade-prefixed slug', async () => {
    const insert = mockQuery({ data: { id: 'new', slug: 'g4-plants-and-animals' }, error: null });
    const app = await buildApp(admin, {
      subjects: mockQuery({ data: { id: SUBJECT_ID }, error: null }),
      subject_grade_catalog: mockQuery({ data: { id: 'c1' }, error: null }),
      topics: [mockQuery({ data: [], error: null }), insert],
    });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/topics', payload });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({
      subject_id: SUBJECT_ID, grade: 4, kind: 'core', slug: 'g4-plants-and-animals', sort_order: 0,
      name_en: 'Plants and animals', name_vi: 'Thực vật và động vật',
    });
    await app.close();
  });
});
