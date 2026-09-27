import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { practiceRoutes, checkPracticeAnswer } from '../routes/practice.js';
import { authPlugin } from '../plugins/auth.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const Q_MC = '33333333-3333-4333-8333-333333333333';
const Q_TF = '44444444-4444-4444-8444-444444444444';
const Q_SHORT = '55555555-5555-4555-8555-555555555555';
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };
const author = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };

const explanation = { vi: 'Vì 2 + 2 = 4.', en: 'Because 2 + 2 = 4.' };
const mc = { id: Q_MC, usage: 'practice', status: 'published', subject_id: SUBJECT, lesson_id: LESSON_ID, created_by: 'teacher-1', type: 'mc', difficulty: 1, data: { stem: { vi: '2 + 2?', en: '2 + 2?' }, options: [{ id: 'a', text: { vi: '3', en: '3' } }, { id: 'b', text: { vi: '4', en: '4' } }], answer: 'b', explanation } };
const tf = { ...mc, id: Q_TF, type: 'truefalse', data: { stem: { vi: 'Xét', en: 'Consider' }, items: [{ id: '1', text: { vi: 'A', en: 'A' }, correct: true }, { id: '2', text: { vi: 'B', en: 'B' }, correct: false }] } };
const short = { ...mc, id: Q_SHORT, type: 'short', data: { stem: { vi: 'Thủ đô?', en: 'Capital?' }, answer_key: 'Hà Nội', rubric: { vi: 'R', en: 'R' } } };
const publishedLesson = { id: LESSON_ID, subject_id: SUBJECT, status: 'published', created_by: 'teacher-1', blocks: [{ type: 'quiz', question_id: Q_TF }, { type: 'theory', content: { vi: 'x', en: 'x' } }, { type: 'quiz', question_id: Q_MC }, { type: 'quiz', question_id: Q_SHORT }] };

async function build(user: object | undefined, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  if (user) app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(practiceRoutes);
  await app.ready();
  return app;
}

const check = (app: Awaited<ReturnType<typeof build>>, question_id: string, response: unknown) =>
  app.inject({ method: 'POST', url: '/api/practice/check', payload: { question_id, response } });

/** A question row, plus the published lesson that uses it. */
const servable = (row: object) => ({ questions: mockQuery({ data: row, error: null }), lessons: mockQuery({ data: [{ id: LESSON_ID }], error: null }) });

describe('checkPracticeAnswer', () => {
  it('checks each question type without returning the expected answer', () => {
    expect(checkPracticeAnswer(mc, { selected_option: 'b' })).toEqual({ correct: true, explanation });
    expect(checkPracticeAnswer(mc, { selected_option: 'a' })).toEqual({ correct: false, explanation });
    expect(checkPracticeAnswer(tf, { items: [{ id: '1', selected: true }, { id: '2', selected: false }] })).toEqual({ correct: true, items: [{ id: '1', correct: true }, { id: '2', correct: true }] });
    expect(checkPracticeAnswer(short, { short_answer: '  hà   NỘI ' })).toEqual({ correct: true });
    expect(checkPracticeAnswer(short, { short_answer: 'Huế' })).toEqual({ correct: false });
  });

  it('marks unanswered true/false statements as not correct and the question as wrong', () => {
    expect(checkPracticeAnswer(tf, { items: [{ id: '1', selected: true }] })).toEqual({ correct: false, items: [{ id: '1', correct: true }, { id: '2', correct: false }] });
    expect(checkPracticeAnswer(tf, { items: [{ id: '1', selected: false }, { id: '2', selected: false }] })).toEqual({ correct: false, items: [{ id: '1', correct: false }, { id: '2', correct: true }] });
  });
});

describe('POST /api/practice/check', () => {
  it('checks a question of a published lesson for anyone, and never sends the key', async () => {
    for (const [row, response] of [[mc, { selected_option: 'a' }], [tf, { items: [{ id: '1', selected: false }] }], [short, { short_answer: 'Huế' }]] as const) {
      const app = await build(undefined, servable(row));
      const res = await check(app, row.id, response);
      expect(res.statusCode, row.type).toBe(200);
      expect(res.body, row.type).not.toMatch(/"answer"|answer_key|Hà Nội|rubric|"selected"/);
      if (row.type === 'mc') expect(res.body).not.toContain('"b"');
      await app.close();
    }
  });

  it('gives the same verdict on every retry and writes nothing', async () => {
    const app = await build(student, { questions: [mockQuery({ data: mc, error: null }), mockQuery({ data: mc, error: null })], lessons: [mockQuery({ data: [{ id: LESSON_ID }], error: null }), mockQuery({ data: [{ id: LESSON_ID }], error: null })] });
    const first = await check(app, Q_MC, { selected_option: 'b' });
    const second = await check(app, Q_MC, { selected_option: 'b' });
    expect(first.json()).toEqual(second.json());
    expect(first.json()).toMatchObject({ correct: true });
    await app.close();
  });

  it.each([
    ['an exam question', { ...mc, usage: 'exam' }, undefined],
    ['a draft question', { ...mc, status: 'draft' }, student],
    ['a question under review', { ...mc, status: 'pending_review' }, undefined],
  ])('refuses %s as unavailable', async (_name, row, user) => {
    const app = await build(user, servable(row));
    const res = await check(app, Q_MC, { selected_option: 'b' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ error: expect.any(String), error_en: expect.any(String) });
    await app.close();
  });

  it('refuses a published question that no published lesson uses', async () => {
    const app = await build(student, { questions: mockQuery({ data: mc, error: null }), lessons: mockQuery({ data: [], error: null }) });
    expect((await check(app, Q_MC, { selected_option: 'b' })).statusCode).toBe(404);
    await app.close();
  });

  it('lets the author and admins try their own draft questions', async () => {
    for (const user of [author, admin]) {
      const app = await build(user, { questions: mockQuery({ data: { ...mc, status: 'draft' }, error: null }) });
      expect((await check(app, Q_MC, { selected_option: 'b' })).statusCode).toBe(200);
      await app.close();
    }
  });

  it('refuses a missing question, bad ids, empty answers and answers of the wrong shape', async () => {
    const missing = await build(undefined, { questions: mockQuery({ data: null, error: null }) });
    expect((await check(missing, Q_MC, { selected_option: 'b' })).statusCode).toBe(404);
    await missing.close();

    const noDb = await build(undefined, {});
    expect((await check(noDb, 'not-a-uuid', { selected_option: 'b' })).statusCode).toBe(400);
    expect((await check(noDb, Q_MC, { selected_option: 'b', extra: 1 })).statusCode).toBe(400);
    expect((await check(noDb, Q_MC, 'b')).statusCode).toBe(400);
    await noDb.close();

    for (const [row, response] of [
      [mc, {}],
      [short, { short_answer: '   ' }],
      [tf, { items: [] }],
      [mc, { short_answer: 'b' }],
      [short, { selected_option: 'a' }],
      [tf, { items: [{ id: '9', selected: true }] }],
    ] as const) {
      const app = await build(undefined, servable(row));
      expect((await check(app, row.id, response)).statusCode, JSON.stringify(response)).toBe(400);
      await app.close();
    }
  });
});

describe('GET /api/practice/lessons/:lessonId/questions', () => {
  const get = (app: Awaited<ReturnType<typeof build>>) => app.inject({ method: 'GET', url: `/api/practice/lessons/${LESSON_ID}/questions` });

  it('serves the published lesson’s practice questions in block order without answers', async () => {
    const questions = mockQuery({ data: [mc, short, tf, { ...mc, id: '66666666-6666-4666-8666-666666666666' }], error: null });
    const app = await build(undefined, { lessons: mockQuery({ data: publishedLesson, error: null }), questions });
    const res = await get(app);
    expect(res.statusCode).toBe(200);
    expect(res.json().questions.map((q: { id: string }) => q.id)).toEqual([Q_TF, Q_MC, Q_SHORT]);
    expect(questions.eqCalls).toEqual(expect.arrayContaining([['usage', 'practice'], ['status', 'published'], ['subject_id', SUBJECT]]));
    expect(res.body).not.toMatch(/"answer"|answer_key|"correct"|explanation|rubric|created_by|usage/);
    await app.close();
  });

  it('hides an unpublished lesson from learners and shows it to its author and admins', async () => {
    const draft = { ...publishedLesson, status: 'draft' };
    const hidden = await build(student, { lessons: mockQuery({ data: draft, error: null }) });
    expect((await get(hidden)).statusCode).toBe(404);
    await hidden.close();

    for (const user of [author, admin]) {
      const questions = mockQuery({ data: [{ ...mc, status: 'draft' }], error: null });
      const app = await build(user, { lessons: mockQuery({ data: draft, error: null }), questions });
      const res = await get(app);
      expect(res.statusCode).toBe(200);
      expect(res.json().questions).toHaveLength(1);
      expect(questions.eqCalls).not.toContainEqual(['status', 'published']);
      await app.close();
    }
  });

  it('answers a non-UUID lesson id with 404 without reading the database', async () => {
    const app = await build(undefined, {});
    expect((await app.inject({ method: 'GET', url: '/api/practice/lessons/abc/questions' })).statusCode).toBe(404);
    await app.close();
  });
});

describe('practice is open to visitors', () => {
  it('lets anonymous visitors reach the practice routes', async () => {
    const app = Fastify();
    app.decorate('supabase', mockSupabase({ questions: mockQuery({ data: null, error: null }) }));
    await app.register(authPlugin);
    await app.register(practiceRoutes);
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/api/practice/check', payload: { question_id: Q_MC, response: { selected_option: 'b' } } });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
