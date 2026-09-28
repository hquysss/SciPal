import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { reorderTopics, topicAdminRoutes } from '../routes/topicAdmin.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const T1 = 'a0000000-0000-4000-8000-000000000001';
const T2 = 'a0000000-0000-4000-8000-000000000002';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const topic = (id: string, patch: Record<string, unknown> = {}) => ({
  id, subject_id: SUBJECT, slug: `g10-${id.slice(-1)}`, grade: 10, name_en: `Topic ${id.slice(-1)}`, name_vi: `Chủ đề ${id.slice(-1)}`, sort_order: Number(id.slice(-1)), ...patch,
});

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(topicAdminRoutes);
  await app.ready();
  return app;
}

describe('reorderTopics', () => {
  const rows = [{ id: 'a', sort_order: 0 }, { id: 'b', sort_order: 0 }, { id: 'c', sort_order: 5 }];
  it('swaps with the neighbour and numbers the list 0..n, changing only rows that move', () => {
    expect(reorderTopics(rows, 'c', 'up')).toEqual([{ id: 'c', sort_order: 1 }, { id: 'b', sort_order: 2 }]);
    expect(reorderTopics(rows, 'a', 'down')).toEqual([{ id: 'a', sort_order: 1 }, { id: 'c', sort_order: 2 }]);
  });
  it('does nothing at either end or for an unknown id', () => {
    expect(reorderTopics(rows, 'a', 'up')).toEqual([]);
    expect(reorderTopics([{ id: 'a', sort_order: 0 }, { id: 'b', sort_order: 1 }], 'b', 'down')).toEqual([]);
    expect(reorderTopics(rows, 'x', 'up')).toEqual([]);
  });
});

describe('topic admin routes', () => {
  it('are for admins only', async () => {
    const app = await build(teacher, {});
    for (const [method, url] of [
      ['GET', `/api/authoring/topics?subject_id=${SUBJECT}&grade=10`],
      ['PATCH', `/api/authoring/topics/${T1}`],
      ['DELETE', `/api/authoring/topics/${T1}`],
      ['POST', `/api/authoring/topics/${T1}/move`],
    ] as const) {
      expect((await app.inject({ method, url, payload: method === 'GET' || method === 'DELETE' ? undefined : {} })).statusCode).toBe(403);
    }
    await app.close();
  });

  it('lists a grade’s topics with their lesson counts', async () => {
    const topics = mockQuery({ data: [topic(T1), topic(T2)], error: null });
    const app = await build(admin, { topics, lessons: mockQuery({ data: [{ topic_id: T1 }, { topic_id: T1 }], error: null }) });
    const res = await app.inject({ method: 'GET', url: `/api/authoring/topics?subject_id=${SUBJECT}&grade=10` });
    expect(res.statusCode).toBe(200);
    expect(res.json().topics.map((t: { id: string; lesson_count: number }) => [t.id, t.lesson_count])).toEqual([[T1, 2], [T2, 0]]);
    expect(topics.orCalls).toEqual(['grade.eq.10,grade.is.null']);
    expect((await app.inject({ method: 'GET', url: `/api/authoring/topics?subject_id=x&grade=10` })).statusCode).toBe(400);
    await app.close();
  });

  it('renames a topic, refusing a name another topic of the grade has', async () => {
    const dup = await build(admin, { topics: [mockQuery({ data: topic(T1), error: null }), mockQuery({ data: [topic(T1), topic(T2)], error: null })] });
    expect((await dup.inject({ method: 'PATCH', url: `/api/authoring/topics/${T1}`, payload: { name_vi: ' chủ đề 2 ', name_en: 'New' } })).statusCode).toBe(409);
    await dup.close();

    const update = mockQuery({ data: topic(T1, { name_vi: 'Tên mới', name_en: 'New name' }), error: null });
    const app = await build(admin, { topics: [mockQuery({ data: topic(T1), error: null }), mockQuery({ data: [topic(T1), topic(T2)], error: null }), update] });
    const res = await app.inject({ method: 'PATCH', url: `/api/authoring/topics/${T1}`, payload: { name_vi: 'Tên mới', name_en: 'New name' } });
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toEqual({ name_vi: 'Tên mới', name_en: 'New name' });
    expect(res.json().topic.name_vi).toBe('Tên mới');
    await app.close();

    const blank = await build(admin, {});
    expect((await blank.inject({ method: 'PATCH', url: `/api/authoring/topics/${T1}`, payload: { name_vi: ' ', name_en: 'x' } })).statusCode).toBe(400);
    await blank.close();
  });

  it('deletes only a topic without lessons (deleting a topic would delete its lessons)', async () => {
    const busy = await build(admin, { topics: mockQuery({ data: topic(T1), error: null }), lessons: mockQuery({ data: [{ id: 'l1' }], error: null }) });
    expect((await busy.inject({ method: 'DELETE', url: `/api/authoring/topics/${T1}` })).statusCode).toBe(409);
    await busy.close();

    const del = mockQuery({ data: null, error: null });
    const app = await build(admin, { topics: [mockQuery({ data: topic(T1), error: null }), del], lessons: mockQuery({ data: [], error: null }) });
    expect((await app.inject({ method: 'DELETE', url: `/api/authoring/topics/${T1}` })).statusCode).toBe(204);
    expect(del.deleteCalls).toBe(1);
    await app.close();

    const missing = await build(admin, { topics: mockQuery({ data: null, error: null }) });
    expect((await missing.inject({ method: 'DELETE', url: `/api/authoring/topics/${T1}` })).statusCode).toBe(404);
    await missing.close();
  });

  it('moves a topic up by renumbering its grade', async () => {
    const u1 = mockQuery({ data: null, error: null });
    const u2 = mockQuery({ data: null, error: null });
    const app = await build(admin, { topics: [mockQuery({ data: topic(T2), error: null }), mockQuery({ data: [topic(T1), topic(T2)], error: null }), u1, u2] });
    const res = await app.inject({ method: 'POST', url: `/api/authoring/topics/${T2}/move`, payload: { direction: 'up' } });
    expect(res.statusCode).toBe(204);
    // T1 already has sort_order 1, so only T2 is written.
    expect(u1.updated).toEqual([{ sort_order: 0 }]);
    expect(u1.eqCalls).toEqual([['id', T2]]);
    expect(u2.updated).toEqual([]);
    expect((await app.inject({ method: 'POST', url: `/api/authoring/topics/${T2}/move`, payload: { direction: 'left' } })).statusCode).toBe(400);
    await app.close();
  });
});
