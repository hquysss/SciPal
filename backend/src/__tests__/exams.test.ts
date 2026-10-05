import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { examRoutesAuthoring } from '../routes/exams.js';
import { SUBJECT_ARCHIVED } from '../subjects/archived.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const EXAM = 'e0000000-0000-4000-8000-00000000000e';
const Q = '33333333-3333-4333-8333-333333333333';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const other = { id: 'teacher-2', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };
const STAMP = '2026-09-27T10:00:00.000000+00:00';

const exam = (patch: Record<string, unknown> = {}) => ({
  id: EXAM, name: 'Đề 1', name_en: 'Exam 1', subject_id: SUBJECT, grade: 10, duration_minutes: 45, status: 'draft',
  question_ids: [Q], sections: [{ type: 'mc', difficulty: 1, count: 1 }], review_note: null, updated_at: STAMP,
  created_by: 'teacher-1', import_id: null, subjects: { name_vi: 'Tin học' }, ...patch,
});
const question = (patch: Record<string, unknown> = {}) => ({
  id: Q, usage: 'exam', subject_id: SUBJECT, status: 'published', created_by: 'teacher-2', type: 'mc', difficulty: 1,
  data: { stem: { vi: 'Câu?', en: 'Q?' }, options: [{ id: 'a', text: { vi: 'A', en: 'A' } }, { id: 'b', text: { vi: 'B', en: 'B' } }], answer: 'a' },
  ...patch,
});
const createBody = { name: 'Đề 1', name_en: '', subject_id: SUBJECT, grade: 10, duration_minutes: 45, question_ids: [Q] };

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  // Creating an exam checks that its subject is not archived; tests use a live subject unless they say otherwise.
  app.decorate('supabase', mockSupabase({ subjects: mockQuery({ data: { id: SUBJECT, archived_at: null }, error: null }), ...tables }));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(examRoutesAuthoring);
  await app.ready();
  return app;
}

describe('exam authoring routes', () => {
  it('refuses students everywhere', async () => {
    const app = await build(student, {});
    for (const [method, url] of [['GET', '/api/authoring/exams'], ['POST', '/api/authoring/exams'], ['GET', `/api/authoring/exams/${EXAM}`], ['PATCH', `/api/authoring/exams/${EXAM}`], ['DELETE', `/api/authoring/exams/${EXAM}`]] as const) {
      expect((await app.inject({ method, url })).statusCode, url).toBe(403);
    }
    await app.close();
  });

  it('lists a teacher’s own exams, and filters by status on request', async () => {
    const list = mockQuery({ data: [exam()], error: null });
    const app = await build(teacher, { exam_blueprints: list });
    const res = await app.inject({ method: 'GET', url: '/api/authoring/exams?status=pending_review' });
    expect(res.statusCode).toBe(200);
    expect(res.json().exams[0]).toMatchObject({ id: EXAM, question_count: 1, subject_name_vi: 'Tin học', mine: true, imported: false });
    expect(list.eqCalls).toEqual(expect.arrayContaining([['created_by', 'teacher-1'], ['status', 'pending_review']]));
    expect((await app.inject({ method: 'GET', url: '/api/authoring/exams?status=gone' })).statusCode).toBe(400);
    await app.close();
  });

  it('creates a draft with sections from its questions; only an admin may publish at once', async () => {
    const insert = mockQuery({ data: exam(), error: null });
    const app = await build(teacher, { questions: mockQuery({ data: [question()], error: null }), exam_blueprints: insert });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exams', payload: { ...createBody, publish: true } });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ status: 'draft', created_by: 'teacher-1', sections: [{ type: 'mc', difficulty: 1, count: 1 }], question_ids: [Q] });
    await app.close();

    const adminInsert = mockQuery({ data: exam({ status: 'published' }), error: null });
    const adminApp = await build(admin, { questions: mockQuery({ data: [question()], error: null }), exam_blueprints: adminInsert });
    const noEnglish = await adminApp.inject({ method: 'POST', url: '/api/authoring/exams', payload: { ...createBody, publish: true } });
    expect(noEnglish.statusCode).toBe(400);
    await adminApp.close();
    const adminApp2 = await build(admin, { questions: mockQuery({ data: [question()], error: null }), exam_blueprints: adminInsert });
    expect((await adminApp2.inject({ method: 'POST', url: '/api/authoring/exams', payload: { ...createBody, name_en: 'Exam 1', publish: true } })).statusCode).toBe(201);
    expect(adminInsert.inserted[0]).toMatchObject({ status: 'published' });
    await adminApp2.close();
  });

  it('answers a duplicate name with 409, not 500', async () => {
    const app = await build(teacher, {
      questions: mockQuery({ data: [question()], error: null }),
      exam_blueprints: mockQuery({ data: null, error: { code: '23505', message: 'duplicate' } }),
    });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exams', payload: createBody });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'Đã có đề thi tên này.', error_en: 'An exam with this name already exists.' });
    await app.close();
  });

  it('refuses a save made from a stale copy', async () => {
    const update = mockQuery({ data: null, error: null });
    const app = await build(teacher, { exam_blueprints: [mockQuery({ data: exam(), error: null }), update], questions: mockQuery({ data: [question()], error: null }) });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/exams/${EXAM}`, payload: { duration_minutes: 60, expected_updated_at: '2026-09-27T09:00:00Z' } });
    expect(res.statusCode).toBe(409);
    expect(update.eqCalls).toEqual(expect.arrayContaining([['updated_at', '2026-09-27T09:00:00Z']]));
    await app.close();
  });

  it('keeps a teacher out of exams under review or published, and away from others’ exams', async () => {
    for (const status of ['pending_review', 'published']) {
      const app = await build(teacher, { exam_blueprints: mockQuery({ data: exam({ status }), error: null }) });
      expect((await app.inject({ method: 'PATCH', url: `/api/authoring/exams/${EXAM}`, payload: { duration_minutes: 60, expected_updated_at: STAMP } })).statusCode, status).toBe(409);
      await app.close();
    }
    const app = await build(other, { exam_blueprints: mockQuery({ data: exam(), error: null }) });
    expect((await app.inject({ method: 'DELETE', url: `/api/authoring/exams/${EXAM}` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/authoring/exams/${EXAM}` })).statusCode).toBe(404);
    await app.close();
  });

  it('lets an admin fix the details of an older exam that draws from the subject pool', async () => {
    const legacy = exam({ status: 'published', question_ids: null, sections: [{ type: 'mc', difficulty: 1, count: 20 }] });
    const write = mockQuery({ data: { ...legacy, duration_minutes: 60 }, error: null });
    const app = await build(admin, { exam_blueprints: [mockQuery({ data: legacy, error: null }), write] });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/exams/${EXAM}`, payload: { duration_minutes: 60, expected_updated_at: STAMP } });
    expect(res.statusCode).toBe(200);
    expect(write.updated[0]).toEqual({ duration_minutes: 60 });
    await app.close();
  });

  it('refuses to move an exam to another subject', async () => {
    const app = await build(teacher, { exam_blueprints: mockQuery({ data: exam(), error: null }) });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/exams/${EXAM}`, payload: { subject_id: '99999999-9999-4999-8999-999999999999', expected_updated_at: STAMP } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('lets an admin delete a published exam', async () => {
    const del = mockQuery({ data: null, error: null });
    const app = await build(admin, { exam_blueprints: [mockQuery({ data: exam({ status: 'published' }), error: null }), del] });
    expect((await app.inject({ method: 'DELETE', url: `/api/authoring/exams/${EXAM}` })).statusCode).toBe(204);
    expect(del.deleteCalls).toBe(1);
    await app.close();
  });
});

describe('exams in an archived subject', () => {
  const GONE = '2026-10-05T01:00:00.000Z';

  it('refuses to create one with the bilingual 400', async () => {
    const subjects = mockQuery({ data: { id: SUBJECT, archived_at: GONE }, error: null });
    const insert = mockQuery({ data: exam(), error: null });
    const app = await build(admin, { subjects, questions: mockQuery({ data: [question()], error: null }), exam_blueprints: insert });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exams', payload: { ...createBody, name_en: 'Exam 1', publish: true } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(SUBJECT_ARCHIVED);
    expect(subjects.eqCalls).toContainEqual(['id', SUBJECT]);
    expect(insert.inserted).toHaveLength(0);
    await app.close();
  });

  it('refuses to edit one with the bilingual 400, reading archived_at with the exam', async () => {
    const read = mockQuery({ data: exam({ subjects: { name_vi: 'Tin học', archived_at: GONE } }), error: null });
    const update = mockQuery({ data: exam(), error: null });
    const app = await build(teacher, { exam_blueprints: [read, update] });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/exams/${EXAM}`, payload: { duration_minutes: 60, expected_updated_at: STAMP } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(SUBJECT_ARCHIVED);
    expect(String(read.selectArgs[0]?.[0])).toContain('archived_at');
    expect(update.updated).toHaveLength(0);
    await app.close();
  });
});

describe('structured exams (format and layout)', () => {
  const Q2 = '44444444-4444-4444-8444-444444444444';
  const section = (key: string, kind: 'mc' | 'truefalse', ids: string[]) => ({
    key, title: { vi: `Phần ${key}`, en: `Part ${key}` }, kind, count: ids.length, max_points: 5, groups: [{ question_ids: ids }],
  });
  const layout = (a: string[], b: string[]) => [section('I', 'mc', a), section('II', 'truefalse', b)];
  const structured = (patch: Record<string, unknown> = {}) => exam({ format: 'thptqg', layout: layout([Q], [Q2]), question_ids: [Q, Q2], ...patch });
  const tfData = { stem: { vi: 'Đúng sai?', en: 'True or false?' }, items: [{ id: 'a', text: { vi: 'A', en: 'A' }, correct: true }] };
  const questions = [question(), question({ id: Q2, type: 'truefalse', data: tfData })];

  it('stores the flattened layout as question_ids and ignores the client list', async () => {
    const insert = mockQuery({ data: structured(), error: null });
    const app = await build(teacher, { questions: mockQuery({ data: questions, error: null }), exam_blueprints: insert });
    const body = { ...createBody, question_ids: ['55555555-5555-4555-8555-555555555555'], format: 'thptqg', layout: layout([Q], [Q2]) };
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exams', payload: body });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ format: 'thptqg', layout: layout([Q], [Q2]), question_ids: [Q, Q2] });
    expect(res.json().exam).toMatchObject({ format: 'thptqg', layout: layout([Q], [Q2]), question_ids: [Q, Q2] });
    await app.close();
  });

  it('saves a generic exam with format generic and no layout', async () => {
    const insert = mockQuery({ data: exam(), error: null });
    const app = await build(teacher, { questions: mockQuery({ data: [question()], error: null }), exam_blueprints: insert });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exams', payload: createBody });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ format: 'generic', layout: null, question_ids: [Q] });
    expect(res.json().exam).toMatchObject({ format: 'generic', layout: null });
    await app.close();
  });

  it('refuses a structured exam without a layout', async () => {
    const app = await build(teacher, {});
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exams', payload: { ...createBody, format: 'thptqg' } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('shows format and layout in the detail, and reads old rows as generic', async () => {
    const app = await build(teacher, { exam_blueprints: mockQuery({ data: structured(), error: null }) });
    expect((await app.inject({ method: 'GET', url: `/api/authoring/exams/${EXAM}` })).json().exam).toMatchObject({ format: 'thptqg', layout: layout([Q], [Q2]) });
    await app.close();
    const old = await build(teacher, { exam_blueprints: mockQuery({ data: exam(), error: null }) });
    expect((await old.inject({ method: 'GET', url: `/api/authoring/exams/${EXAM}` })).json().exam).toMatchObject({ format: 'generic', layout: null });
    await old.close();
  });

  it('rewrites question_ids from a patched layout', async () => {
    const write = mockQuery({ data: structured(), error: null });
    const app = await build(teacher, { exam_blueprints: [mockQuery({ data: structured(), error: null }), write], questions: mockQuery({ data: questions, error: null }) });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/exams/${EXAM}`, payload: { layout: layout([Q], [Q2]), question_ids: [], expected_updated_at: STAMP } });
    expect(res.statusCode).toBe(200);
    expect(write.updated[0]).toMatchObject({ layout: layout([Q], [Q2]), question_ids: [Q, Q2] });
    await app.close();
  });

  it('refuses a patch that leaves a structured exam without a layout', async () => {
    const app = await build(teacher, { exam_blueprints: mockQuery({ data: structured(), error: null }) });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/exams/${EXAM}`, payload: { layout: null, expected_updated_at: STAMP } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  const submit = async (row: Record<string, unknown>, rows: unknown[]) => {
    const update = mockQuery({ data: { ...row, status: 'pending_review' }, error: null });
    const app = await build(teacher, { exam_blueprints: [mockQuery({ data: row, error: null }), update], questions: mockQuery({ data: rows, error: null }) });
    const res = await app.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/submit` });
    await app.close();
    return { res, update };
  };

  it('submits a structured exam whose sections are filled with the right types', async () => {
    const { res, update } = await submit(structured(), questions);
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toEqual({ status: 'pending_review', review_note: null });
  });

  it('refuses to submit when a section has no question', async () => {
    const { res, update } = await submit(structured({ layout: layout([Q], []), question_ids: [Q] }), [question()]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('Phần II');
    expect(res.json().error_en).toContain('Part II');
    expect(update.updated).toHaveLength(0);
  });

  it('refuses to submit when a question’s type differs from its section', async () => {
    const { res } = await submit(structured(), [question(), question({ id: Q2, type: 'mc' })]);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/Câu 2/);
    expect(res.json().error_en).toMatch(/Question 2/);
  });

  it('refuses to publish a structured exam on creation when a section is empty', async () => {
    const app = await build(admin, { questions: mockQuery({ data: [question()], error: null }), exam_blueprints: mockQuery({ data: structured(), error: null }) });
    const body = { ...createBody, name_en: 'Exam 1', format: 'thptqg', layout: layout([Q], []), publish: true };
    expect((await app.inject({ method: 'POST', url: '/api/authoring/exams', payload: body })).statusCode).toBe(400);
    await app.close();
  });
});

