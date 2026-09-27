import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { questionRoutes } from '../routes/questions.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const OTHER_SUBJECT = '99999999-9999-4999-8999-999999999999';
const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const Q_ID = '33333333-3333-4333-8333-333333333333';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const otherTeacher = { id: 'teacher-2', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };

const lesson = { id: LESSON_ID, subject_id: SUBJECT, created_by: 'teacher-1', status: 'draft' };
const mcData = {
  stem: { vi: '2 + 2 bằng?', en: '2 + 2 is?' },
  options: [
    { id: 'a', text: { vi: '3', en: '3' } },
    { id: 'b', text: { vi: '4', en: '4' } },
  ],
  answer: 'b',
  explanation: { vi: 'Cộng.', en: 'Add.' },
};
const input = { usage: 'practice', subject_id: SUBJECT, lesson_id: LESSON_ID, type: 'mc', difficulty: 1, data: mcData };
const row = (patch: Record<string, unknown> = {}) => ({
  id: Q_ID,
  usage: 'practice',
  subject_id: SUBJECT,
  lesson_id: LESSON_ID,
  grade: null,
  type: 'mc',
  difficulty: 1,
  status: 'draft',
  created_by: 'teacher-1',
  created_at: '2026-09-27T00:00:00Z',
  data: mcData,
  ...patch,
});

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => {
    (req as any).user = user;
  });
  await app.register(questionRoutes);
  await app.ready();
  return app;
}

describe('who may use the question bank', () => {
  it('refuses students on every route', async () => {
    const app = await build(student, {});
    for (const [method, url] of [
      ['GET', '/api/authoring/questions?usage=practice'],
      ['POST', '/api/authoring/questions'],
      ['PATCH', `/api/authoring/questions/${Q_ID}`],
      ['DELETE', `/api/authoring/questions/${Q_ID}`],
    ] as const) {
      expect((await app.inject({ method, url, payload: method === 'GET' || method === 'DELETE' ? undefined : input })).statusCode, url).toBe(403);
    }
    await app.close();
  });
});

describe('creating a question', () => {
  it('stores a draft practice question for the author of an editable lesson', async () => {
    const insert = mockQuery({ data: row(), error: null });
    const app = await build(teacher, { lessons: mockQuery({ data: lesson, error: null }), questions: insert });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/questions', payload: { ...input, status: 'published', created_by: 'x' } });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ usage: 'practice', lesson_id: LESSON_ID, status: 'draft', created_by: 'teacher-1', type: 'mc' });
    expect(res.json().question).toMatchObject({ id: Q_ID, editable: true, data: { answer: 'b' } });
    await app.close();
  });

  it('refuses a lesson of another subject, another teacher, or one under review', async () => {
    for (const [name, found, user] of [
      ['other subject', { ...lesson, subject_id: OTHER_SUBJECT }, teacher],
      ['other teacher', lesson, otherTeacher],
      ['missing lesson', null, teacher],
      ['lesson under review', { ...lesson, status: 'pending_review' }, teacher],
      ['published lesson (teacher)', { ...lesson, status: 'published' }, teacher],
    ] as const) {
      const insert = mockQuery({ data: row(), error: null });
      const app = await build(user, { lessons: mockQuery({ data: found, error: null }), questions: insert });
      const res = await app.inject({ method: 'POST', url: '/api/authoring/questions', payload: input });
      expect([400, 404, 409], name).toContain(res.statusCode);
      expect(res.json().error_en, name).toBeTruthy();
      expect(insert.inserted, name).toHaveLength(0);
      await app.close();
    }
  });

  it('needs a lesson for a practice question and none for an exam question', async () => {
    const app = await build(teacher, { lessons: mockQuery({ data: lesson, error: null }), questions: mockQuery({ data: row(), error: null }) });
    const { lesson_id: _drop, ...noLesson } = input;
    expect((await app.inject({ method: 'POST', url: '/api/authoring/questions', payload: noLesson })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/authoring/questions', payload: { ...input, usage: 'exam' } })).statusCode).toBe(400);
    await app.close();
  });

  it('refuses invalid question data with a bilingual message', async () => {
    const app = await build(teacher, { lessons: mockQuery({ data: lesson, error: null }), questions: mockQuery({ data: row(), error: null }) });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/questions', payload: { ...input, data: { ...mcData, answer: 'z' } } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: expect.any(String), error_en: expect.any(String) });
    await app.close();
  });

  it('publishes an admin question added to a published lesson only when it is complete', async () => {
    const published = { ...lesson, status: 'published' };
    const insert = mockQuery({ data: row({ status: 'published', created_by: 'admin-1' }), error: null });
    const app = await build(admin, { lessons: [mockQuery({ data: published, error: null }), mockQuery({ data: published, error: null })], questions: insert });
    expect((await app.inject({ method: 'POST', url: '/api/authoring/questions', payload: input })).statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ status: 'published' });
    const half = { ...input, data: { ...mcData, stem: { vi: 'Câu?', en: '' } } };
    expect((await app.inject({ method: 'POST', url: '/api/authoring/questions', payload: half })).statusCode).toBe(400);
    await app.close();
  });
});

describe('listing questions', () => {
  it('shows a teacher published questions and their own, with answers only on their own', async () => {
    const list = mockQuery({ data: [row(), row({ id: '44444444-4444-4444-8444-444444444444', created_by: 'teacher-2', status: 'published' })], error: null });
    (list as any).count = 2;
    const app = await build(teacher, { questions: list });
    const res = await app.inject({ method: 'GET', url: `/api/authoring/questions?usage=practice&subject_id=${SUBJECT}&q=${encodeURIComponent('50%_off')}&page=2` });
    expect(res.statusCode).toBe(200);
    expect(list.eqCalls).toEqual(expect.arrayContaining([['usage', 'practice'], ['subject_id', SUBJECT]]));
    expect(list.orCalls).toEqual(['status.eq.published,created_by.eq.teacher-1']);
    expect(list.ilikeCalls[0]![1]).toBe('%50\\%\\_off%');
    expect(list.rangeCalls).toEqual([[20, 39]]);
    const [own, other] = res.json().questions;
    expect(own).toMatchObject({ editable: true, data: { answer: 'b' } });
    expect(other).toMatchObject({ editable: false });
    expect(JSON.stringify(other)).not.toMatch(/"answer"|"explanation"|"correct"/);
    await app.close();
  });

  it('lets an admin see every question, answers included', async () => {
    const list = mockQuery({ data: [row({ created_by: 'teacher-2', status: 'pending_review' })], error: null });
    const app = await build(admin, { questions: list });
    const res = await app.inject({ method: 'GET', url: '/api/authoring/questions?usage=exam' });
    expect(list.orCalls).toEqual([]);
    expect(res.json().questions[0]).toMatchObject({ editable: true, data: { answer: 'b' } });
    await app.close();
  });

  it('fetches exact questions by id for the lesson editor', async () => {
    const list = mockQuery({ data: [row()], error: null });
    const app = await build(teacher, { questions: list });
    const res = await app.inject({ method: 'GET', url: `/api/authoring/questions?usage=practice&ids=${Q_ID}` });
    expect(res.statusCode).toBe(200);
    expect(list.inCalls).toEqual([['id', [Q_ID]]]);
    await app.close();
  });

  it('refuses a missing usage and malformed filters', async () => {
    const app = await build(teacher, { questions: mockQuery({ data: [], error: null }) });
    for (const query of ['', 'usage=homework', 'usage=practice&subject_id=x', 'usage=practice&type=essay', `usage=practice&q=${'x'.repeat(101)}`, 'usage=practice&ids=nope', 'usage=practice&difficulty=5', 'usage=practice&status=gone']) {
      expect((await app.inject({ method: 'GET', url: `/api/authoring/questions?${query}` })).statusCode, query).toBe(400);
    }
    await app.close();
  });
});

describe('editing and deleting', () => {
  const patch = (app: Awaited<ReturnType<typeof build>>, payload: object) =>
    app.inject({ method: 'PATCH', url: `/api/authoring/questions/${Q_ID}`, payload });

  it('lets the author edit a draft, guarded by its status', async () => {
    const update = mockQuery({ data: row({ difficulty: 2 }), error: null });
    const app = await build(teacher, { questions: [mockQuery({ data: row(), error: null }), update] });
    const res = await patch(app, { ...input, difficulty: 2 });
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ difficulty: 2, type: 'mc' });
    expect(update.updated[0]).not.toHaveProperty('usage');
    expect(update.updated[0]).not.toHaveProperty('status');
    expect(update.eqCalls).toEqual(expect.arrayContaining([['id', Q_ID], ['status', 'draft']]));
    await app.close();
  });

  it('answers 409 when the question changed status while saving', async () => {
    const app = await build(teacher, { questions: [mockQuery({ data: row(), error: null }), mockQuery({ data: null, error: null })] });
    expect((await patch(app, input)).statusCode).toBe(409);
    await app.close();
  });

  it('never changes usage, subject or lesson', async () => {
    for (const change of [{ usage: 'exam', lesson_id: undefined }, { subject_id: OTHER_SUBJECT }, { lesson_id: '55555555-5555-4555-8555-555555555555' }]) {
      const update = mockQuery({ data: row(), error: null });
      const app = await build(teacher, { questions: [mockQuery({ data: row(), error: null }), update] });
      expect((await patch(app, { ...input, ...change })).statusCode, JSON.stringify(change)).toBe(400);
      expect(update.updated).toHaveLength(0);
      await app.close();
    }
  });

  it('hides another teacher’s question and locks published or pending ones for teachers', async () => {
    const other = await build(otherTeacher, { questions: mockQuery({ data: row(), error: null }) });
    expect((await patch(other, input)).statusCode).toBe(404);
    expect((await other.inject({ method: 'DELETE', url: `/api/authoring/questions/${Q_ID}` })).statusCode).toBe(404);
    await other.close();

    for (const status of ['published', 'pending_review']) {
      const app = await build(teacher, { questions: mockQuery({ data: row({ status }), error: null }) });
      expect((await patch(app, input)).statusCode, status).toBe(403);
      expect((await app.inject({ method: 'DELETE', url: `/api/authoring/questions/${Q_ID}` })).statusCode, status).toBe(403);
      await app.close();
    }
  });

  it('lets an admin edit a published question only into a complete one', async () => {
    const app = await build(admin, { questions: [mockQuery({ data: row({ status: 'published' }), error: null }), mockQuery({ data: row({ status: 'published' }), error: null }), mockQuery({ data: row({ status: 'published' }), error: null })] });
    expect((await patch(app, { ...input, data: { ...mcData, stem: { vi: 'Câu?', en: '' } } })).statusCode).toBe(400);
    expect((await patch(app, input)).statusCode).toBe(200);
    await app.close();
  });

  it('deletes an unused draft and refuses one a lesson or exam still uses', async () => {
    const del = mockQuery({ data: { id: Q_ID }, error: null });
    const app = await build(teacher, {
      questions: [mockQuery({ data: row(), error: null }), del],
      lessons: mockQuery({ data: [], error: null }),
      exam_blueprints: mockQuery({ data: [], error: null }),
    });
    expect((await app.inject({ method: 'DELETE', url: `/api/authoring/questions/${Q_ID}` })).statusCode).toBe(204);
    expect(del.deleteCalls).toBe(1);
    expect(del.eqCalls).toEqual(expect.arrayContaining([['id', Q_ID], ['status', 'draft']]));
    await app.close();

    const usedByLesson = await build(teacher, {
      questions: mockQuery({ data: row(), error: null }),
      lessons: mockQuery({ data: [{ id: LESSON_ID }], error: null }),
      exam_blueprints: mockQuery({ data: [], error: null }),
    });
    const res = await usedByLesson.inject({ method: 'DELETE', url: `/api/authoring/questions/${Q_ID}` });
    expect(res.statusCode).toBe(409);
    await usedByLesson.close();

    const usedByExam = await build(admin, {
      questions: mockQuery({ data: row({ status: 'published', usage: 'exam', lesson_id: null }), error: null }),
      lessons: mockQuery({ data: [], error: null }),
      exam_blueprints: mockQuery({ data: [{ id: 'bp' }], error: null }),
    });
    expect((await usedByExam.inject({ method: 'DELETE', url: `/api/authoring/questions/${Q_ID}` })).statusCode).toBe(409);
    await usedByExam.close();
  });
});
