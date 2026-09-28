import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { adminTutorRoutes } from '../routes/adminTutor.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const C1 = 'c0000000-0000-4000-8000-000000000001';
const C2 = 'c0000000-0000-4000-8000-000000000002';
const L1 = 'b0000000-0000-4000-8000-000000000001';

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(adminTutorRoutes);
  await app.ready();
  return app;
}

const row = (id: string, user: string, updated: string, lesson: string | null = null, count = 4) => ({
  id, user_id: user, title: `Hỏi ${id.slice(-1)}`, lesson_id: lesson, created_at: updated, updated_at: updated, tutor_messages: [{ count }],
});

describe('admin tutor conversations', () => {
  it('are for admins only', async () => {
    const app = await build(teacher, {});
    for (const url of ['/api/admin/tutor/conversations', `/api/admin/tutor/conversations/${C1}`]) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(403);
      expect(res.json().error_en).toEqual(expect.any(String));
    }
    await app.close();
  });

  it('lists the newest first with the student, the lesson and the message count, 30 at a time', async () => {
    const list = ok([row(C1, 's1', '2026-09-28T10:00:00Z', L1, 6), row(C2, 's2', '2026-09-27T10:00:00Z')]);
    const app = await build(admin, {
      tutor_conversations: list,
      profiles: ok([{ id: 's1', display_name: 'An' }, { id: 's2', display_name: null }]),
      lessons: ok([{ id: L1, title_vi: 'Vòng lặp', title_en: 'Loops' }]),
    });
    const res = await app.inject({ method: 'GET', url: '/api/admin/tutor/conversations' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      conversations: [
        { id: C1, title: 'Hỏi 1', student: { id: 's1', name: 'An' }, lesson: { id: L1, title_vi: 'Vòng lặp', title_en: 'Loops' }, messages: 6, created_at: '2026-09-28T10:00:00Z', updated_at: '2026-09-28T10:00:00Z' },
        { id: C2, title: 'Hỏi 2', student: { id: 's2', name: null }, lesson: null, messages: 4, created_at: '2026-09-27T10:00:00Z', updated_at: '2026-09-27T10:00:00Z' },
      ],
      next: null,
    });
    await app.close();
  });

  it('gives a cursor when there are more, and reads from it', async () => {
    const rows = Array.from({ length: 31 }, (_, i) => row(`c0000000-0000-4000-8000-${String(i).padStart(12, '0')}`, 's1', `2026-09-${String(28 - (i % 20)).padStart(2, '0')}T00:00:00Z`));
    const first = ok(rows);
    const app = await build(admin, { tutor_conversations: [first, ok([])], profiles: ok([]), lessons: ok([]) });
    const res = await app.inject({ method: 'GET', url: '/api/admin/tutor/conversations' });
    expect(res.json().conversations).toHaveLength(30);
    expect(res.json().next).toBe(rows[29].updated_at);
    const second = await app.inject({ method: 'GET', url: `/api/admin/tutor/conversations?before=${encodeURIComponent(rows[29].updated_at)}&from=2026-09-01&to=2026-09-30` });
    expect(second.statusCode).toBe(200);
    await app.close();
  });

  it('filters by student name and by dates', async () => {
    const people = ok([{ id: 's1' }]);
    const list = ok([]);
    const app = await build(admin, { profiles: people, tutor_conversations: list });
    const res = await app.inject({ method: 'GET', url: '/api/admin/tutor/conversations?q=%20An%25_%20&from=2026-09-01&to=2026-09-30' });
    expect(res.statusCode).toBe(200);
    expect(people.ilikeCalls[0]).toEqual(['display_name', '%An\\%\\_%']);
    expect(list.inCalls[0]).toEqual(['user_id', ['s1']]);
    expect(list.gteCalls[0]).toEqual(['updated_at', '2026-08-31T17:00:00.000Z']);
    expect(list.ltCalls[0]).toEqual(['updated_at', '2026-09-30T17:00:00.000Z']);
    await app.close();
  });

  it('answers an empty list when no student matches the name, and 400 for bad dates', async () => {
    const app = await build(admin, { profiles: ok([]) });
    const res = await app.inject({ method: 'GET', url: '/api/admin/tutor/conversations?q=Zed' });
    expect(res.json()).toEqual({ conversations: [], next: null });
    expect((await app.inject({ method: 'GET', url: '/api/admin/tutor/conversations?from=yesterday' })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/api/admin/tutor/conversations?before=nope' })).statusCode).toBe(400);
    await app.close();
  });

  it('opens one conversation with every message in order', async () => {
    const messages = ok([
      { id: 'm1', role: 'user', content: 'Vòng lặp là gì?', created_at: '1' },
      { id: 'm2', role: 'assistant', content: 'Em thử nghĩ…', created_at: '2' },
    ]);
    const app = await build(admin, {
      tutor_conversations: ok(row(C1, 's1', 't', L1)),
      tutor_messages: messages,
      profiles: ok({ id: 's1', display_name: 'An' }),
      lessons: ok({ id: L1, title_vi: 'Vòng lặp', title_en: 'Loops' }),
    });
    const res = await app.inject({ method: 'GET', url: `/api/admin/tutor/conversations/${C1}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      conversation: { id: C1, title: 'Hỏi 1', student: { id: 's1', name: 'An' }, lesson: { title_vi: 'Vòng lặp' } },
      messages: [{ role: 'user', content: 'Vòng lặp là gì?' }, { role: 'assistant', content: 'Em thử nghĩ…' }],
    });
    expect(messages.eqCalls).toEqual([['conversation_id', C1]]);
    await app.close();
  });

  it('answers 404 for an unknown or malformed id', async () => {
    const app = await build(admin, { tutor_conversations: ok(null) });
    expect((await app.inject({ method: 'GET', url: `/api/admin/tutor/conversations/${C2}` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/admin/tutor/conversations/not-a-uuid' })).statusCode).toBe(404);
    await app.close();
  });
});
