import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { tutorRoutes } from '../routes/tutor.js';
import { vietnamDayStart } from '../tutor/limits.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const C1 = 'c0000000-0000-4000-8000-000000000001';
const student = { id: 'student-1', app_metadata: {} };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', { chat: async function* () {} });
  app.addHook('onRequest', async (req) => { if (user) (req as any).user = user; });
  await app.register(tutorRoutes);
  await app.ready();
  return app;
}


describe('vietnamDayStart', () => {
  it('is 00:00 in Vietnam as a UTC instant', () => {
    // 16:30Z on the 28th is 23:30 on the 28th in Vietnam → the day began at 17:00Z on the 27th.
    expect(vietnamDayStart(new Date('2026-09-28T16:30:00Z')).toISOString()).toBe('2026-09-27T17:00:00.000Z');
    // 17:30Z on the 28th is 00:30 on the 29th in Vietnam → the day began at 17:00Z on the 28th.
    expect(vietnamDayStart(new Date('2026-09-28T17:30:00Z')).toISOString()).toBe('2026-09-28T17:00:00.000Z');
  });
});

describe('conversation routes', () => {
  it('lists only the caller’s conversations, newest first', async () => {
    const q = mockQuery({ data: [{ id: C1, title: 'Vòng lặp', lesson_id: null, updated_at: 't' }], error: null });
    const app = await build(student, { tutor_conversations: q });
    const res = await app.inject({ method: 'GET', url: '/api/tutor/conversations' });
    expect(res.statusCode).toBe(200);
    expect(res.json().conversations).toHaveLength(1);
    expect(q.eqCalls).toContainEqual(['user_id', 'student-1']);
    expect(q.rangeCalls).toEqual([[0, 49]]);
    await app.close();
  });

  it('reads a conversation with its messages, 404 for someone else’s', async () => {
    const other = await build(student, { tutor_conversations: mockQuery({ data: null, error: null }) });
    expect((await other.inject({ method: 'GET', url: `/api/tutor/conversations/${C1}` })).statusCode).toBe(404);
    await other.close();

    const conv = mockQuery({ data: { id: C1, title: 't', lesson_id: null, updated_at: 't' }, error: null });
    const msgs = mockQuery({ data: [{ id: 'm1', role: 'user', content: 'Hỏi', created_at: 't' }], error: null });
    const app = await build(student, { tutor_conversations: conv, tutor_messages: msgs });
    const res = await app.inject({ method: 'GET', url: `/api/tutor/conversations/${C1}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().messages[0].content).toBe('Hỏi');
    expect(conv.eqCalls).toEqual(expect.arrayContaining([['id', C1], ['user_id', 'student-1']]));
    expect((await app.inject({ method: 'GET', url: '/api/tutor/conversations/not-a-uuid' })).statusCode).toBe(404);
    await app.close();
  });

  it('deletes only the caller’s conversation', async () => {
    const del = mockQuery({ data: [{ id: C1 }], error: null });
    const app = await build(student, { tutor_conversations: del });
    expect((await app.inject({ method: 'DELETE', url: `/api/tutor/conversations/${C1}` })).statusCode).toBe(204);
    expect(del.deleteCalls).toBe(1);
    expect(del.eqCalls).toEqual(expect.arrayContaining([['id', C1], ['user_id', 'student-1']]));
    await app.close();

    const none = await build(student, { tutor_conversations: mockQuery({ data: [], error: null }) });
    expect((await none.inject({ method: 'DELETE', url: `/api/tutor/conversations/${C1}` })).statusCode).toBe(404);
    await none.close();
  });

  it('needs a signed-in user', async () => {
    const app = await build(null, {});
    expect((await app.inject({ method: 'GET', url: '/api/tutor/conversations' })).statusCode).toBe(401);
    await app.close();
  });
});
