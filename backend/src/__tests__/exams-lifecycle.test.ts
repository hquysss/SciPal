import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { examRoutesAuthoring } from '../routes/exams.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const EXAM = 'e0000000-0000-4000-8000-00000000000e';
const id = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-000000000000`;
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const exam = (patch: Record<string, unknown> = {}) => ({
  id: EXAM, name: 'Đề 1', name_en: 'Exam 1', subject_id: SUBJECT, grade: 10, duration_minutes: 45, status: 'draft',
  question_ids: [id(1)], sections: [], review_note: null, updated_at: '2026-09-27T10:00:00Z',
  created_by: 'teacher-1', import_id: null, subjects: null, ...patch,
});
const question = { id: id(1), usage: 'exam', subject_id: SUBJECT, status: 'draft', created_by: 'teacher-1', type: 'short', difficulty: 1, data: { stem: { vi: 'C?', en: 'Q?' }, answer_key: '4' } };

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(examRoutesAuthoring);
  await app.ready();
  return app;
}
const draw = (payload: object, pools: string[][]) =>
  build(teacher, { questions: pools.map((ids) => mockQuery({ data: ids.map((i) => ({ id: i })), error: null })) }).then((app) =>
    app.inject({ method: 'POST', url: '/api/authoring/exams/draw', payload }).finally(() => app.close()),
  );

describe('random draw', () => {
  it('returns what the pool has and reports the shortfall', async () => {
    const res = await draw({ subject_id: SUBJECT, counts: [{ type: 'mc', difficulty: 1, n: 5 }] }, [[id(1), id(2), id(3)]]);
    expect(res.statusCode).toBe(200);
    expect([...res.json().question_ids].sort()).toEqual([id(1), id(2), id(3)]);
    expect(res.json().shortfalls).toEqual([{ type: 'mc', difficulty: 1, wanted: 5, got: 3 }]);
  });

  it('never returns an excluded id or the same id twice', async () => {
    const res = await draw(
      { subject_id: SUBJECT, exclude_ids: [id(1)], counts: [{ type: 'mc', difficulty: 1, n: 2 }, { type: 'mc', difficulty: 1, n: 2 }] },
      [[id(1), id(2), id(3)], [id(2), id(3), id(4)]],
    );
    const ids = res.json().question_ids as string[];
    expect(ids).not.toContain(id(1));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(3);
  });

  it('refuses too many rows or questions', async () => {
    const rows = Array.from({ length: 10 }, () => ({ type: 'mc', difficulty: 1, n: 1 }));
    expect((await draw({ subject_id: SUBJECT, counts: rows }, [])).statusCode).toBe(400);
    expect((await draw({ subject_id: SUBJECT, counts: [{ type: 'mc', difficulty: 1, n: 201 }] }, [])).statusCode).toBe(400);
  });
});

describe('exam review', () => {
  it('submits a teacher’s draft only when it has questions', async () => {
    const empty = await build(teacher, { exam_blueprints: mockQuery({ data: exam({ question_ids: [] }), error: null }) });
    expect((await empty.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/submit` })).statusCode).toBe(400);
    await empty.close();

    const update = mockQuery({ data: exam({ status: 'pending_review' }), error: null });
    const app = await build(teacher, { exam_blueprints: [mockQuery({ data: exam(), error: null }), update], questions: mockQuery({ data: [question], error: null }) });
    const res = await app.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/submit` });
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toEqual({ status: 'pending_review', review_note: null });
    expect(update.eqCalls).toEqual(expect.arrayContaining([['status', 'draft']]));
    await app.close();
  });

  it('lets only an admin approve or send back, with a note', async () => {
    const app = await build(teacher, { exam_blueprints: mockQuery({ data: exam({ status: 'pending_review' }), error: null }) });
    expect((await app.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/approve` })).statusCode).toBe(403);
    await app.close();

    const noNote = await build(admin, { exam_blueprints: mockQuery({ data: exam({ status: 'pending_review' }), error: null }) });
    expect((await noNote.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/reject`, payload: {} })).statusCode).toBe(400);
    await noNote.close();

    const update = mockQuery({ data: exam({ status: 'draft' }), error: null });
    const rej = await build(admin, { exam_blueprints: [mockQuery({ data: exam({ status: 'pending_review' }), error: null }), update] });
    expect((await rej.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/reject`, payload: { note: 'Thêm câu khó' } })).statusCode).toBe(200);
    expect(update.updated[0]).toEqual({ status: 'draft', review_note: 'Thêm câu khó' });
    await rej.close();
  });

  it('approves into published, and leaves imported exams to the import queue', async () => {
    const update = mockQuery({ data: exam({ status: 'published' }), error: null });
    const app = await build(admin, { exam_blueprints: [mockQuery({ data: exam({ status: 'pending_review' }), error: null }), update], questions: mockQuery({ data: [question], error: null }) });
    expect((await app.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/approve` })).statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ status: 'published' });
    await app.close();

    const imported = await build(admin, { exam_blueprints: mockQuery({ data: exam({ status: 'pending_review', import_id: id(9) }), error: null }) });
    expect((await imported.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/approve` })).statusCode).toBe(409);
    await imported.close();
  });

  it('publishes only an admin’s own draft; a teacher’s draft goes through review', async () => {
    const app = await build(admin, { exam_blueprints: mockQuery({ data: exam({ status: 'draft' }), error: null }), questions: mockQuery({ data: [question], error: null }) });
    expect((await app.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/approve` })).statusCode).toBe(409);
    await app.close();

    const update = mockQuery({ data: exam({ status: 'published', created_by: 'admin-1' }), error: null });
    const own = await build(admin, { exam_blueprints: [mockQuery({ data: exam({ status: 'draft', created_by: 'admin-1' }), error: null }), update], questions: mockQuery({ data: [{ ...question, created_by: 'admin-1' }], error: null }) });
    expect((await own.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/approve` })).statusCode).toBe(200);
    await own.close();
  });

  it('refuses with 409 to delete an exam students have taken', async () => {
    const app = await build(admin, { exam_blueprints: [mockQuery({ data: exam({ status: 'published' }), error: null }), mockQuery({ data: null, error: { code: '23503', message: 'fk' } })] });
    const res = await app.inject({ method: 'DELETE', url: `/api/authoring/exams/${EXAM}` });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/bài làm/);
    await app.close();
  });

  it('answers 409 when the exam moved on meanwhile', async () => {
    const app = await build(admin, { exam_blueprints: [mockQuery({ data: exam({ status: 'pending_review' }), error: null }), mockQuery({ data: null, error: null })], questions: mockQuery({ data: [question], error: null }) });
    expect((await app.inject({ method: 'POST', url: `/api/authoring/exams/${EXAM}/approve` })).statusCode).toBe(409);
    await app.close();
  });
});
