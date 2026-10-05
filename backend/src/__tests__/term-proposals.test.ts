import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { termRoutes } from '../routes/terms.js';
import { SUBJECT_ARCHIVED } from '../subjects/archived.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const TERM_ID = '66666666-6666-4666-8666-666666666666';
const SUBJECT_ID = '77777777-7777-4777-8777-777777777777';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  // Writing a term checks that its subject is not archived; tests use a live subject unless they say otherwise.
  app.decorate('supabase', mockSupabase({ subjects: mockQuery({ data: [{ id: SUBJECT_ID, archived_at: null }], error: null }), ...tables }) as never);
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

describe('terms of an archived subject', () => {
  const ARCHIVED_ID = '88888888-8888-4888-8888-888888888888';
  const gone = { id: ARCHIVED_ID, archived_at: '2026-10-05T01:00:00.000Z' };

  it('refuses a new term with the bilingual 400 and saves nothing', async () => {
    const insert = mockQuery({ data: { id: TERM_ID }, error: null });
    const subjects = mockQuery({ data: gone, error: null });
    const app = await build(admin, { subjects, terms: insert });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/terms', payload: { ...valid, subject_id: ARCHIVED_ID } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(SUBJECT_ARCHIVED);
    expect(subjects.eqCalls).toContainEqual(['id', ARCHIVED_ID]);
    expect(insert.inserted).toHaveLength(0);
    await app.close();
  });

  it('refuses only the batch rows of an archived subject', async () => {
    const saved = mockQuery({ data: { id: TERM_ID }, error: null });
    const subjects = mockQuery({ data: [gone, { id: SUBJECT_ID, archived_at: null }], error: null });
    const app = await build(teacher, { subjects, terms: [saved] });
    const res = await app.inject({
      method: 'POST',
      url: '/api/authoring/terms/batch',
      payload: { terms: [{ ...valid, subject_id: ARCHIVED_ID }, valid] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ saved: 1, results: [{ index: 0, ok: false, ...SUBJECT_ARCHIVED }, { index: 1, ok: true, id: TERM_ID }] });
    expect(saved.inserted).toHaveLength(1);
    expect(saved.inserted[0]).toMatchObject({ subject_id: SUBJECT_ID });
    await app.close();
  });
});

describe('adding many glossary terms at once', () => {
  it('saves the good rows and reports the bad, duplicate and taken ones', async () => {
    const saved = mockQuery({ data: { id: TERM_ID }, error: null });
    const taken = mockQuery({ data: null, error: { code: '23505' } });
    const app = await build(teacher, { terms: [saved, taken] });
    const res = await app.inject({
      method: 'POST',
      url: '/api/authoring/terms/batch',
      payload: { terms: [valid, { ...valid, term_vi: ' ' }, { ...valid, term_en: 'PHOTOSYNTHESIS' }, { ...valid, term_en: 'osmosis' }] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.saved).toBe(1);
    expect(body.results.map((r: { ok: boolean }) => r.ok)).toEqual([true, false, false, false]);
    expect(body.results[2].error).toContain('Trùng');
    expect(body.results[3].error).toContain('đã có');
    expect(saved.inserted[0]).toMatchObject({ status: 'pending', created_by: 'teacher-1' });
    await app.close();
  });

  it('refuses an empty or oversized batch, and non-staff', async () => {
    const app = await build(teacher, { terms: mockQuery({ data: null, error: null }) });
    expect((await app.inject({ method: 'POST', url: '/api/authoring/terms/batch', payload: { terms: [] } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/authoring/terms/batch', payload: { terms: Array(201).fill(valid) } })).statusCode).toBe(400);
    await app.close();
    const other = await build(student, { terms: mockQuery({ data: null, error: null }) });
    expect((await other.inject({ method: 'POST', url: '/api/authoring/terms/batch', payload: { terms: [valid] } })).statusCode).toBe(403);
    await other.close();
  });
});
