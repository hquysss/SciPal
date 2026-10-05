import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { adminSubjectRoutes, sortAdminSubjects, type AdminSubject } from '../routes/adminSubjects.js';
import { SUBJECT_ARCHIVED } from '../subjects/archived.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'a0000000-0000-4000-8000-000000000002', app_metadata: { app_role: 'teacher' } };
const student = { id: 'a0000000-0000-4000-8000-000000000003', app_metadata: { app_role: 'student' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const fail = () => mockQuery({ data: null, error: { code: 'XX000', message: 'db down' } });

const INFO = '11111111-1111-4111-8111-111111111111';
const MATH = '22222222-2222-4222-8222-222222222222';
const ART = '33333333-3333-4333-8333-333333333333';
const UNKNOWN = '99999999-9999-4999-8999-999999999999';

const subjectRow = (id: string, slug: string, sort_order: number, archived_at: string | null = null) => ({
  id, slug, name_en: slug.toUpperCase(), name_vi: `${slug} vi`, icon: 'book', sort_order, archived_at,
});

function sample(id: string, sort_order: number, published: number, draft: number, archived = false): AdminSubject {
  return {
    id, slug: id, name_en: id, name_vi: id, icon: 'book', sort_order,
    archived_at: archived ? '2026-10-05T01:00:00.000Z' : null,
    counts: { topics: 0, lessons_published: published, lessons_draft: draft, questions: 0, classes: 0 },
  };
}

async function build(user: object | null, t: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(t));
  app.addHook('onRequest', async (req) => { (req as any).user = user ?? undefined; });
  await app.register(adminSubjectRoutes);
  await app.ready();
  return app;
}

const listTables = () => ({
  subjects: ok([subjectRow(ART, 'art', 1), subjectRow(MATH, 'math', 2), subjectRow(INFO, 'info', 3, '2026-10-05T01:00:00.000Z')]),
  lessons: ok([
    { subject_id: MATH, status: 'published' },
    { subject_id: MATH, status: 'published' },
    { subject_id: MATH, status: 'draft' },
    { subject_id: ART, status: 'draft' },
    { subject_id: ART, status: 'rejected' },
    { subject_id: INFO, status: 'published' },
  ]),
  topics: ok([{ subject_id: MATH }, { subject_id: MATH }, { subject_id: ART }]),
  questions: ok([{ subject_id: MATH }, { subject_id: INFO }, { subject_id: INFO }, { subject_id: INFO }]),
  class_rooms: ok([{ subject_id: MATH }]),
});

const emptyCounts = () => ({ lessons: ok([]), topics: ok([]), questions: ok([]), class_rooms: ok([]) });

describe('sortAdminSubjects', () => {
  it('puts published-lesson subjects first, then draft-only or empty ones, then archived ones', () => {
    const sorted = sortAdminSubjects([
      sample('empty', 1, 0, 0),
      sample('draft', 2, 0, 3),
      sample('live', 3, 2, 0),
      sample('gone', 0, 5, 0, true),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(['live', 'empty', 'draft', 'gone']);
  });

  it('keeps sort_order inside each group and does not mutate its input', () => {
    const input = [
      sample('live-b', 5, 1, 0), sample('plain-b', 4, 0, 0), sample('gone-b', 9, 0, 0, true),
      sample('live-a', 2, 1, 0), sample('plain-a', 1, 0, 1), sample('gone-a', 3, 4, 0, true),
    ];
    const copy = input.map((s) => s.id);
    expect(sortAdminSubjects(input).map((s) => s.id)).toEqual(['live-a', 'live-b', 'plain-a', 'plain-b', 'gone-a', 'gone-b']);
    expect(input.map((s) => s.id)).toEqual(copy);
  });
});

describe('admin only', () => {
  it.each([['no user', null], ['a teacher', teacher], ['a student', student]])('answers 403 to %s', async (_label, user) => {
    const app = await build(user, listTables());
    for (const [method, url] of [['GET', '/api/admin/subjects'], ['POST', `/api/admin/subjects/${MATH}/archive`], ['POST', `/api/admin/subjects/${MATH}/restore`]] as const) {
      const res = await app.inject({ method, url });
      expect(res.statusCode).toBe(403);
      expect(res.json()).toMatchObject({ code: 'FORBIDDEN', error: expect.any(String), error_en: expect.any(String) });
    }
    await app.close();
  });
});

describe('GET /api/admin/subjects', () => {
  it('lists every subject with counts aggregated from lessons, topics, questions and classes, in spec order', async () => {
    const app = await build(admin, listTables());
    const res = await app.inject({ method: 'GET', url: '/api/admin/subjects' });
    expect(res.statusCode).toBe(200);
    const { subjects } = res.json() as { subjects: AdminSubject[] };
    expect(subjects.map((s) => s.slug)).toEqual(['math', 'art', 'info']);
    expect(subjects[0]).toEqual({
      id: MATH, slug: 'math', name_en: 'MATH', name_vi: 'math vi', icon: 'book', sort_order: 2, archived_at: null,
      counts: { topics: 2, lessons_published: 2, lessons_draft: 1, questions: 1, classes: 1 },
    });
    expect(subjects[1].counts).toEqual({ topics: 1, lessons_published: 0, lessons_draft: 1, questions: 0, classes: 0 });
    expect(subjects[2]).toMatchObject({ archived_at: '2026-10-05T01:00:00.000Z', counts: { lessons_published: 1, questions: 3 } });
    await app.close();
  });

  it('answers 500 with a bilingual error when a read fails', async () => {
    const app = await build(admin, { ...listTables(), questions: fail() });
    const res = await app.inject({ method: 'GET', url: '/api/admin/subjects' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ error: expect.any(String), error_en: expect.any(String) });
    await app.close();
  });
});

describe('POST /api/admin/subjects/:id/archive', () => {
  it('sets archived_at to an ISO time and returns the subject', async () => {
    const update = ok(null);
    const app = await build(admin, {
      subjects: [ok({ id: MATH, archived_at: null }), update, ok(subjectRow(MATH, 'math', 2, '2026-10-05T03:00:00.000Z'))],
      ...emptyCounts(),
      lessons: ok([{ subject_id: MATH, status: 'published' }]),
    });
    const res = await app.inject({ method: 'POST', url: `/api/admin/subjects/${MATH}/archive` });
    expect(res.statusCode).toBe(200);
    expect(res.json().subject).toMatchObject({ id: MATH, archived_at: '2026-10-05T03:00:00.000Z', counts: { lessons_published: 1 } });
    const written = update.updated[0] as { archived_at: string };
    expect(new Date(written.archived_at).toISOString()).toBe(written.archived_at);
    expect(update.eqCalls).toContainEqual(['id', MATH]);
    expect(update.isCalls).toContainEqual(['archived_at', null]);
    await app.close();
  });

  it('is idempotent: archiving an archived subject keeps its first timestamp and writes nothing', async () => {
    const first = '2026-10-04T01:00:00.000Z';
    const reread = ok(subjectRow(MATH, 'math', 2, first));
    const app = await build(admin, {
      subjects: [ok({ id: MATH, archived_at: first }), reread],
      ...emptyCounts(),
    });
    const res = await app.inject({ method: 'POST', url: `/api/admin/subjects/${MATH}/archive` });
    expect(res.statusCode).toBe(200);
    expect(res.json().subject.archived_at).toBe(first);
    expect(reread.updated).toEqual([]);
    await app.close();
  });

  it('answers 404 for an unknown uuid and 400 for a malformed id', async () => {
    const app = await build(admin, { subjects: [ok(null)] });
    const unknown = await app.inject({ method: 'POST', url: `/api/admin/subjects/${UNKNOWN}/archive` });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json()).toMatchObject({ error: expect.any(String), error_en: expect.any(String) });
    const bad = await app.inject({ method: 'POST', url: '/api/admin/subjects/not-a-uuid/archive' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject({ error: expect.any(String), error_en: expect.any(String) });
    await app.close();
  });

  it('answers 500 with a bilingual error when the read or the write fails', async () => {
    const readFail = await build(admin, { subjects: [fail()] });
    const r1 = await readFail.inject({ method: 'POST', url: `/api/admin/subjects/${MATH}/archive` });
    expect(r1.statusCode).toBe(500);
    expect(r1.json()).toMatchObject({ error: expect.any(String), error_en: expect.any(String) });
    await readFail.close();

    const writeFail = await build(admin, { subjects: [ok({ id: MATH, archived_at: null }), fail()] });
    const r2 = await writeFail.inject({ method: 'POST', url: `/api/admin/subjects/${MATH}/archive` });
    expect(r2.statusCode).toBe(500);
    expect(r2.json()).toMatchObject({ error: expect.any(String), error_en: expect.any(String) });
    await writeFail.close();
  });
});

describe('POST /api/admin/subjects/:id/restore', () => {
  it('clears archived_at and returns the subject', async () => {
    const update = ok(null);
    const app = await build(admin, {
      subjects: [ok({ id: MATH, archived_at: '2026-10-04T01:00:00.000Z' }), update, ok(subjectRow(MATH, 'math', 2, null))],
      ...emptyCounts(),
    });
    const res = await app.inject({ method: 'POST', url: `/api/admin/subjects/${MATH}/restore` });
    expect(res.statusCode).toBe(200);
    expect(res.json().subject).toMatchObject({ id: MATH, archived_at: null });
    expect(update.updated).toEqual([{ archived_at: null }]);
    expect(update.eqCalls).toContainEqual(['id', MATH]);
    await app.close();
  });

  it('is a no-op for a subject that is not archived', async () => {
    const reread = ok(subjectRow(MATH, 'math', 2, null));
    const app = await build(admin, {
      subjects: [ok({ id: MATH, archived_at: null }), reread],
      ...emptyCounts(),
    });
    const res = await app.inject({ method: 'POST', url: `/api/admin/subjects/${MATH}/restore` });
    expect(res.statusCode).toBe(200);
    expect(reread.updated).toEqual([]);
    await app.close();
  });

  it('answers 404 for an unknown uuid, 400 for a malformed id and 500 when the write fails', async () => {
    const app = await build(admin, { subjects: [ok(null)] });
    expect((await app.inject({ method: 'POST', url: `/api/admin/subjects/${UNKNOWN}/restore` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: '/api/admin/subjects/123/restore' })).statusCode).toBe(400);
    await app.close();

    const writeFail = await build(admin, { subjects: [ok({ id: MATH, archived_at: '2026-10-04T01:00:00.000Z' }), fail()] });
    const res = await writeFail.inject({ method: 'POST', url: `/api/admin/subjects/${MATH}/restore` });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ error: expect.any(String), error_en: expect.any(String) });
    await writeFail.close();
  });
});

describe('SUBJECT_ARCHIVED', () => {
  it('is the bilingual refusal used when creating content in an archived subject', () => {
    expect(SUBJECT_ARCHIVED).toEqual({ error: 'Môn học này đã bị xóa.', error_en: 'This subject was removed.' });
  });
});
