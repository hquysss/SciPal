import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authoringRoutes } from '../routes/authoring.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_LESSON = '66666666-6666-4666-8666-666666666666';
const Q1 = '33333333-3333-4333-8333-333333333333';
const Q2 = '44444444-4444-4444-8444-444444444444';
const STAMP = '2026-09-26T00:00:00.000Z';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };

const mcData = {
  stem: { vi: 'Câu?', en: 'Question?' },
  options: [
    { id: 'a', text: { vi: 'A', en: 'A' } },
    { id: 'b', text: { vi: 'B', en: 'B' } },
  ],
  answer: 'a',
};
const question = (patch: Record<string, unknown> = {}) => ({
  id: Q1,
  usage: 'practice',
  subject_id: SUBJECT,
  lesson_id: LESSON_ID,
  created_by: 'teacher-1',
  status: 'draft',
  type: 'mc',
  difficulty: 1,
  data: mcData,
  ...patch,
});
const quiz = (id: string) => ({ type: 'quiz', question_id: id });
const theory = { type: 'theory', content: { vi: 'Lý thuyết', en: 'Theory' } };
const current = (patch: Record<string, unknown> = {}) => ({
  id: LESSON_ID,
  subject_id: SUBJECT,
  created_by: 'teacher-1',
  status: 'draft',
  updated_at: STAMP,
  blocks: [],
  ...patch,
});

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => {
    (req as any).user = user;
  });
  await app.register(authoringRoutes);
  await app.ready();
  return app;
}

async function patchBlocks(user: object, lesson: Record<string, unknown>, rows: unknown[], blocks: unknown[], extra: object = {}) {
  const write = mockQuery({ data: { id: LESSON_ID }, error: null });
  const app = await build(user, {
    lessons: [mockQuery({ data: lesson, error: null }), write],
    questions: mockQuery({ data: rows, error: null }),
  });
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/authoring/lessons/${LESSON_ID}`,
    payload: { expected_updated_at: STAMP, blocks, ...extra },
  });
  await app.close();
  return { res, written: write.updated.length > 0 };
}

describe('quiz references on lesson save', () => {
  it('accepts the author’s draft question attached to this lesson and a published one from another lesson', async () => {
    const { res, written } = await patchBlocks(teacher, current(), [question(), question({ id: Q2, lesson_id: OTHER_LESSON, created_by: 'teacher-2', status: 'published' })], [theory, quiz(Q1), quiz(Q2)]);
    expect(res.statusCode).toBe(200);
    expect(written).toBe(true);
  });

  it.each([
    ['an exam question', question({ usage: 'exam' })],
    ['another subject', question({ subject_id: '99999999-9999-4999-8999-999999999999' })],
    ['a draft attached to another lesson', question({ lesson_id: OTHER_LESSON })],
    ['a draft with no lesson', question({ lesson_id: null })],
  ])('refuses %s', async (_name, row) => {
    const { res, written } = await patchBlocks(teacher, current(), [row], [quiz(Q1)]);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: expect.stringMatching(/Câu hỏi 1/), error_en: expect.stringMatching(/Question 1/) });
    expect(written).toBe(false);
  });

  it('refuses a question id that does not exist', async () => {
    const { res, written } = await patchBlocks(teacher, current(), [], [quiz(Q1)]);
    expect(res.statusCode).toBe(400);
    expect(written).toBe(false);
  });

  it('refuses the same question twice without reading the bank', async () => {
    const write = mockQuery({ data: { id: LESSON_ID }, error: null });
    const app = await build(teacher, { lessons: [mockQuery({ data: current(), error: null }), write] });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/lessons/${LESSON_ID}`, payload: { expected_updated_at: STAMP, blocks: [quiz(Q1), quiz(Q1)] } });
    expect(res.statusCode).toBe(400);
    expect(write.updated).toHaveLength(0);
    await app.close();
  });

  it('lets a draft lesson keep a question whose English is still missing', async () => {
    const { res } = await patchBlocks(teacher, current(), [question({ data: { ...mcData, stem: { vi: 'Câu?', en: '' } } })], [quiz(Q1)]);
    expect(res.statusCode).toBe(200);
  });

  it('keeps a published lesson free of unpublished questions even when an admin omits status', async () => {
    const { res, written } = await patchBlocks(admin, current({ status: 'published' }), [question()], [quiz(Q1)]);
    expect(res.statusCode).toBe(400);
    expect(written).toBe(false);
  });

  it('lets an admin publish a lesson with its complete draft questions (the database publishes them)', async () => {
    const { res } = await patchBlocks(admin, current(), [question()], [quiz(Q1)], { status: 'published' });
    expect(res.statusCode).toBe(200);
  });

  it('checks the stored blocks when an admin publishes without sending blocks', async () => {
    const write = mockQuery({ data: { id: LESSON_ID }, error: null });
    const app = await build(admin, {
      lessons: [mockQuery({ data: current({ blocks: [quiz(Q1)] }), error: null }), write],
      questions: mockQuery({ data: [question({ usage: 'exam' })], error: null }),
    });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/lessons/${LESSON_ID}`, payload: { expected_updated_at: STAMP, status: 'published' } });
    expect(res.statusCode).toBe(400);
    expect(write.updated).toHaveLength(0);
    await app.close();
  });
});

describe('quiz references on submit and approval', () => {
  const submit = async (rows: unknown[]) => {
    const write = mockQuery({ data: { id: LESSON_ID, status: 'pending_review' }, error: null });
    const app = await build(teacher, {
      lessons: [mockQuery({ data: current(), error: null }), write],
      questions: mockQuery({ data: rows, error: null }),
    });
    const res = await app.inject({
      method: 'POST',
      url: `/api/authoring/lessons/${LESSON_ID}/submit`,
      payload: { title_vi: 'Bài', title_en: 'Lesson', expected_updated_at: STAMP, blocks: [theory, quiz(Q1)] },
    });
    await app.close();
    return { res, written: write.updated.length > 0 };
  };

  it('submits a lesson whose questions are complete', async () => {
    expect((await submit([question()])).res.statusCode).toBe(200);
  });

  it('points to the question that still needs English', async () => {
    const { res, written } = await submit([question({ data: { ...mcData, options: [mcData.options[0], { id: 'b', text: { vi: 'B', en: '' } }] } })]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/Câu hỏi 1.*tiếng Anh/);
    expect(written).toBe(false);
  });

  it('refuses to approve a lesson whose question became unusable', async () => {
    const write = mockQuery({ data: { id: LESSON_ID, status: 'published' }, error: null });
    const app = await build(admin, {
      lessons: [mockQuery({ data: current({ status: 'pending_review', blocks: [quiz(Q1)] }), error: null }), write],
      questions: mockQuery({ data: [], error: null }),
    });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/lessons/${LESSON_ID}/review`, payload: { decision: 'approve', expected_updated_at: STAMP } });
    expect(res.statusCode).toBe(400);
    expect(write.updated).toHaveLength(0);
    await app.close();
  });

  it('still lets an admin send such a lesson back', async () => {
    const write = mockQuery({ data: { id: LESSON_ID, status: 'rejected' }, error: null });
    const app = await build(admin, { lessons: [mockQuery({ data: current({ status: 'pending_review', blocks: [quiz(Q1)] }), error: null }), write] });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/lessons/${LESSON_ID}/review`, payload: { decision: 'reject', note: 'Sửa câu 1', expected_updated_at: STAMP } });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
