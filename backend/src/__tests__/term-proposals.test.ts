import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { termRoutes } from '../routes/terms.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const TERM_ID = '66666666-6666-4666-8666-666666666666';
const SUBJECT_ID = '77777777-7777-4777-8777-777777777777';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables) as never);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  await app.register(termRoutes);
  await app.ready();
  return app;
}

const valid = {
  subject_id: SUBJECT_ID,
  term_en: '  photosynthesis ',
  term_vi: 'quang hợp',
  part_of_speech: 'noun',
  definition_en: 'How plants make food from light.',
  definition_vi: 'Quá trình cây tạo chất hữu cơ nhờ ánh sáng.',
  example_en: '',
  example_vi: '',
};

describe('writing glossary terms', () => {
  it('a teacher’s term waits for an admin', async () => {
    const insert = mockQuery({ data: { id: TERM_ID, status: 'pending' }, error: null });
    const app = await build(teacher, { terms: insert });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/terms', payload: valid });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({
      subject_id: SUBJECT_ID,
      term_en: 'photosynthesis',
      term_vi: 'quang hợp',
      status: 'pending',
      created_by: 'teacher-1',
      example_en: null,
      example_vi: null,
    });
    await app.close();
  });

  it('an admin’s term is published at once', async () => {
    const insert = mockQuery({ data: { id: TERM_ID, status: 'published' }, error: null });
    const app = await build(admin, { terms: insert });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/terms', payload: valid });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ status: 'published', created_by: 'admin-1', reviewed_by: 'admin-1' });
    await app.close();
  });

  it('only staff can write terms', async () => {
    const app = await build(student, { terms: mockQuery({ data: null, error: null }) });
    expect((await app.inject({ method: 'POST', url: '/api/authoring/terms', payload: valid })).statusCode).toBe(403);
    await app.close();
  });

  it('needs both languages of the term and its definition', async () => {
    const app = await build(teacher, { terms: mockQuery({ data: null, error: null }) });
    for (const field of ['term_en', 'term_vi', 'definition_en', 'definition_vi', 'subject_id']) {
      const res = await app.inject({ method: 'POST', url: '/api/authoring/terms', payload: { ...valid, [field]: ' ' } });
      expect(res.statusCode, field).toBe(400);
    }
    await app.close();
  });

  it('says so when the subject already has that term', async () => {
    const app = await build(teacher, { terms: mockQuery({ data: null, error: { code: '23505' } }) });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/terms', payload: valid });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toContain('đã có');
    await app.close();
  });

  it('a teacher lists only their own terms; an admin lists every pending one', async () => {
    const own = mockQuery({ data: [], error: null });
    let app = await build(teacher, { terms: own });
    expect((await app.inject({ method: 'GET', url: '/api/authoring/terms' })).statusCode).toBe(200);
    expect(own.eqCalls).toContainEqual(['created_by', 'teacher-1']);
    await app.close();

    const pending = mockQuery({ data: [], error: null });
    app = await build(admin, { terms: pending });
    expect((await app.inject({ method: 'GET', url: '/api/authoring/terms?status=pending' })).statusCode).toBe(200);
    expect(pending.eqCalls).toContainEqual(['status', 'pending']);
    expect(pending.eqCalls.some(([c]) => c === 'created_by')).toBe(false);
    await app.close();
  });

  it('an admin approves a pending term, once', async () => {
    const update = mockQuery({ data: { id: TERM_ID, status: 'published' }, error: null });
    let app = await build(admin, { terms: update });
    const res = await app.inject({ method: 'POST', url: `/api/admin/terms/${TERM_ID}/approve` });
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ status: 'published', reviewed_by: 'admin-1', review_note: null });
    expect(update.eqCalls).toContainEqual(['status', 'pending']);
    await app.close();

    app = await build(admin, { terms: [mockQuery({ data: null, error: null }), mockQuery({ data: { id: TERM_ID, status: 'published' }, error: null })] });
    expect((await app.inject({ method: 'POST', url: `/api/admin/terms/${TERM_ID}/approve` })).statusCode).toBe(409);
    await app.close();
  });

  it('turning a term down needs a reason', async () => {
    const update = mockQuery({ data: { id: TERM_ID, status: 'rejected' }, error: null });
    const app = await build(admin, { terms: update });
    expect((await app.inject({ method: 'POST', url: `/api/admin/terms/${TERM_ID}/reject`, payload: {} })).statusCode).toBe(400);
    const res = await app.inject({ method: 'POST', url: `/api/admin/terms/${TERM_ID}/reject`, payload: { note: 'Định nghĩa chưa đúng' } });
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ status: 'rejected', review_note: 'Định nghĩa chưa đúng' });
    await app.close();
  });

  it('teachers cannot review', async () => {
    const app = await build(teacher, { terms: mockQuery({ data: null, error: null }) });
    expect((await app.inject({ method: 'POST', url: `/api/admin/terms/${TERM_ID}/approve` })).statusCode).toBe(403);
    await app.close();
  });

  it('a teacher deletes only their own unpublished term', async () => {
    const del = mockQuery({ data: [{ id: TERM_ID }], error: null });
    const app = await build(teacher, { terms: del });
    const res = await app.inject({ method: 'DELETE', url: `/api/authoring/terms/${TERM_ID}` });
    expect(res.statusCode).toBe(204);
    expect(del.eqCalls).toContainEqual(['created_by', 'teacher-1']);
    expect(del.inCalls).toContainEqual(['status', ['pending', 'rejected']]);
    await app.close();
  });
});
