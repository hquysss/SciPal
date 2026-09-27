import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { examRoutes } from '../routes/exam.js';
import { examImportRoutes, type ExamImportPackage } from '../routes/examImport.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

// Practice questions (lessons) and exam questions never mix: exams serve and score only exam
// rows, and a content import sorts each question into one pool.

const BLUEPRINT_ID = '11111111-1111-4111-8111-111111111111';
const IMPORT_ID = '55555555-5555-4555-8555-555555555555';
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const bi = (vi: string) => ({ vi, en: `${vi} (en)` });

async function examApp(tables: Record<string, MockBuilder | MockBuilder[]>, user?: object) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  if (user) app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(examRoutes);
  await app.ready();
  return app;
}

describe('exams use exam questions only', () => {
  const listed = { id: BLUEPRINT_ID, name: 'Đề', sections: [], question_ids: ['q1', 'q2'], duration_minutes: 30, subjects: null };
  const pooled = { id: BLUEPRINT_ID, name: 'Đề', sections: [{ count: 2 }], subject_id: 's1', subjects: null };
  const row = { id: 'q1', subject_id: 's1', type: 'mc', difficulty: 1, data: { stem: bi('x'), options: [], answer: 'a' } };

  it.each([['an exam that lists its questions', listed], ['a subject-pool exam', pooled]])('serves %s from published exam rows', async (_name, blueprint) => {
    const questions = mockQuery({ data: [row], error: null });
    const app = await examApp({ exam_blueprints: mockQuery({ data: blueprint, error: null }), questions });
    expect((await app.inject({ method: 'GET', url: `/api/exam/${BLUEPRINT_ID}/questions` })).statusCode).toBe(200);
    expect(questions.eqCalls).toEqual(expect.arrayContaining([['usage', 'exam'], ['status', 'published']]));
    await app.close();
  });

  it('scores only against exam rows, so a practice id listed by a blueprint counts for nothing', async () => {
    const questions = mockQuery({ data: [row], error: null });
    const app = await examApp({ exam_blueprints: mockQuery({ data: listed, error: null }), questions, xp_log: mockQuery({ data: null, error: null }) }, { id: 'student-1' });
    const res = await app.inject({ method: 'POST', url: '/api/score/exam', payload: { blueprint_id: BLUEPRINT_ID, answers: [{ question_id: 'q2', selected_option: 'a' }] } });
    expect(res.statusCode).toBe(200);
    expect(questions.eqCalls).toEqual(expect.arrayContaining([['usage', 'exam'], ['status', 'published']]));
    // q2 was not returned as an exam row: the exam has one question and the answer to q2 is ignored.
    expect(res.json()).toMatchObject({ total_questions: 1, correct_count: 0 });
    await app.close();
  });

  it('still serves an exam before the usage column exists', async () => {
    const questions = [
      mockQuery({ data: null, error: { code: '42703', message: 'column questions.usage does not exist' } }),
      mockQuery({ data: [row], error: null }),
    ];
    const app = await examApp({ exam_blueprints: mockQuery({ data: listed, error: null }), questions });
    const res = await app.inject({ method: 'GET', url: `/api/exam/${BLUEPRINT_ID}/questions` });
    expect(res.statusCode).toBe(200);
    expect(res.json().questions).toHaveLength(1);
    await app.close();
  });
});

// ── Content import ────────────────────────────────────────────────────────────

const mc = (key: string, difficulty = 1) => ({
  key,
  subject_slug: 'informatics',
  type: 'mc' as const,
  difficulty,
  stem: bi(`Câu ${key}`),
  options: [{ id: 'A', text: bi('Một') }, { id: 'B', text: bi('Hai') }],
  answer: 'A',
});
const blueprint = (count: number) => ({
  code: 'de-1',
  subject_slug: 'informatics',
  grade: 11,
  title: bi('Đề ôn tập'),
  duration_minutes: 45,
  sections: [{ type: 'mc' as const, difficulty: 1, count }],
});
const lesson = (keys: string[], title = 'Tìm kiếm nhị phân') => ({
  subject_slug: 'informatics',
  grade: 11,
  topic: bi('Tìm kiếm'),
  title: bi(title),
  blocks: [{ type: 'theory' as const, content: bi('Nội dung') }, ...keys.map((key) => ({ type: 'quiz_ref' as const, key }))],
});

/** Insert builders that record the order in which tables are written. */
function importTables(log: string[], fail?: string) {
  const writer = (table: string) => {
    const b = mockQuery({ data: null, error: fail === table ? { code: 'XX000', message: 'boom' } : null });
    const insert = b.insert;
    b.insert = (rows) => {
      log.push(table);
      return insert(rows);
    };
    return b;
  };
  const undo = { topics: mockQuery({ data: null, error: null }), lessons: mockQuery({ data: null, error: null }), questions: mockQuery({ data: null, error: null }) };
  const inserts = { topics: writer('topics'), lessons: writer('lessons'), questions: writer('questions'), exam_blueprints: writer('exam_blueprints') };
  const tables = {
    subjects: mockQuery({ data: [{ id: 'subject-1', slug: 'informatics' }], error: null }),
    subject_grade_catalog: mockQuery({ data: [{ subject_id: 'subject-1', grade: 11 }], error: null }),
    topics: [mockQuery({ data: [], error: null }), inserts.topics, undo.topics],
    lessons: [mockQuery({ data: [], error: null }), inserts.lessons, undo.lessons],
    questions: [inserts.questions, undo.questions],
    exam_blueprints: [inserts.exam_blueprints],
  };
  return { tables, inserts, undo };
}

async function importApp(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(examImportRoutes);
  await app.ready();
  return app;
}

const send = (app: Awaited<ReturnType<typeof importApp>>, payload: ExamImportPackage) =>
  app.inject({ method: 'POST', url: '/api/authoring/content-import', payload });

describe('content import sorts questions into pools', () => {
  it('makes lesson questions practice drafts of their lesson and the rest exam questions, writing lessons before questions', async () => {
    const log: string[] = [];
    const { tables, inserts } = importTables(log);
    const app = await importApp(teacher, tables);
    const res = await send(app, { lessons: [lesson(['q1'])], questions: [mc('q1'), mc('q2')], blueprints: [blueprint(1)] });
    expect(res.statusCode).toBe(201);
    expect(log).toEqual(['topics', 'lessons', 'questions', 'exam_blueprints']);

    const [lessonRow] = inserts.lessons.inserted[0] as Array<{ id: string; blocks: Array<{ question_id?: string }> }>;
    const questions = inserts.questions.inserted[0] as Array<Record<string, unknown>>;
    const practice = questions.find((q) => q.usage === 'practice')!;
    const exam = questions.find((q) => q.usage === 'exam')!;
    expect(practice).toMatchObject({ lesson_id: lessonRow!.id, status: 'draft', created_by: 'teacher-1' });
    expect(exam).toMatchObject({ lesson_id: null, status: 'pending_review' });
    expect(lessonRow!.blocks[1]!.question_id).toBe(practice.id);
    const [exam1] = inserts.exam_blueprints.inserted[0] as Array<{ question_ids: string[] }>;
    expect(exam1!.question_ids).toEqual([exam.id]);
    await app.close();
  });

  it('publishes practice questions with an admin’s published lessons', async () => {
    const { tables, inserts } = importTables([]);
    const app = await importApp(admin, tables);
    const res = await send(app, { publish: true, lessons: [lesson(['q1'])], questions: [mc('q1')], blueprints: [] });
    expect(res.statusCode).toBe(201);
    const [question] = inserts.questions.inserted[0] as Array<Record<string, unknown>>;
    expect(question).toMatchObject({ usage: 'practice', status: 'published' });
    await app.close();
  });

  it('never draws a lesson question into an exam', async () => {
    const { tables, inserts } = importTables([]);
    const app = await importApp(teacher, tables);
    const res = await send(app, { lessons: [lesson(['q1'])], questions: [mc('q1'), mc('q2')], blueprints: [blueprint(2)] });
    expect(res.statusCode).toBe(400);
    expect(inserts.lessons.inserted).toHaveLength(0);
    await app.close();
  });

  it.each([
    ['one question in two lessons', [lesson(['q1']), lesson(['q1'], 'Bài khác')]],
    ['one question twice in a lesson', [lesson(['q1', 'q1'])]],
  ])('refuses %s', async (_name, lessons) => {
    const { tables, inserts } = importTables([]);
    const app = await importApp(teacher, tables);
    const res = await send(app, { lessons, questions: [mc('q1')], blueprints: [] });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/q1/);
    expect(inserts.topics.inserted).toHaveLength(0);
    await app.close();
  });

  it('removes questions, lessons and topics, in that order, when the exams cannot be saved', async () => {
    const { tables, undo } = importTables([], 'exam_blueprints');
    const app = await importApp(teacher, tables);
    const res = await send(app, { lessons: [lesson(['q1'])], questions: [mc('q1'), mc('q2')], blueprints: [blueprint(1)] });
    expect(res.statusCode).toBe(500);
    expect(undo.questions.deleteCalls).toBe(1);
    expect(undo.lessons.deleteCalls).toBe(1);
    expect(undo.topics.deleteCalls).toBe(1);
    await app.close();
  });
});

describe('reviewing an import touches exam questions only', () => {
  it('approves and rejects only exam rows of the batch', async () => {
    const questions = mockQuery({ data: [{ id: 'q1' }], error: null });
    const app = await importApp(admin, { questions, exam_blueprints: mockQuery({ data: [{ id: 'b1' }], error: null }) });
    expect((await app.inject({ method: 'POST', url: `/api/authoring/exam-imports/${IMPORT_ID}/approve` })).statusCode).toBe(200);
    expect(questions.eqCalls).toContainEqual(['usage', 'exam']);
    await app.close();

    const rejected = mockQuery({ data: null, error: null });
    const app2 = await importApp(admin, { questions: rejected, exam_blueprints: mockQuery({ data: null, error: null }) });
    expect((await app2.inject({ method: 'DELETE', url: `/api/authoring/exam-imports/${IMPORT_ID}` })).statusCode).toBe(204);
    expect(rejected.eqCalls).toContainEqual(['usage', 'exam']);
    await app2.close();
  });

  it('lists only exam questions in the review queue', async () => {
    const questions = mockQuery({ data: [], error: null });
    const app = await importApp(admin, { questions, exam_blueprints: mockQuery({ data: [], error: null }) });
    expect((await app.inject({ method: 'GET', url: '/api/authoring/exam-imports' })).statusCode).toBe(200);
    expect(questions.eqCalls).toContainEqual(['usage', 'exam']);
    await app.close();
  });
});
