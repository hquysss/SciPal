import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { termRoutes } from '../routes/terms.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
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

/** A user_terms builder that remembers the options its upsert was called with. */
function savedTable() {
  const table = mockQuery({ data: null, error: null });
  const options: unknown[] = [];
  const upsert = table.upsert;
  table.upsert = (row, opts) => {
    options.push(opts);
    return upsert(row, opts);
  };
  return { table, options };
}

describe('my word list', () => {
  it('needs a signed-in user', async () => {
    const app = await build(null, { terms: mockQuery({ data: [], error: null }), user_terms: mockQuery({ data: null, error: null }) });
    expect((await app.inject({ method: 'POST', url: '/api/me/terms', payload: { term_ids: [A] } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'DELETE', url: `/api/me/terms/${A}` })).statusCode).toBe(401);
    await app.close();
  });

  it('saves only published terms of live subjects', async () => {
    const terms = mockQuery({ data: [{ id: A, subjects: { archived_at: null } }], error: null });
    const { table } = savedTable();
    const app = await build(student, { terms, user_terms: table });
    const res = await app.inject({ method: 'POST', url: '/api/me/terms', payload: { term_ids: [A, B] } });
    expect(res.statusCode).toBe(200);
    expect(res.json().saved).toEqual([A]);
    expect(terms.eqCalls).toContainEqual(['status', 'published']);
    expect(table.inserted[0]).toEqual([{ user_id: 'student-1', term_id: A }]);
    await app.close();
  });

  it('drops terms of an archived subject', async () => {
    const terms = mockQuery({ data: [{ id: A, subjects: { archived_at: '2026-10-01' } }], error: null });
    const { table } = savedTable();
    const app = await build(student, { terms, user_terms: table });
    const res = await app.inject({ method: 'POST', url: '/api/me/terms', payload: { term_ids: [A] } });
    expect(res.json().saved).toEqual([]);
    expect(table.inserted).toHaveLength(0);
    await app.close();
  });

  it('saving twice is fine', async () => {
    const { table, options } = savedTable();
    const app = await build(student, { terms: mockQuery({ data: [{ id: A, subjects: { archived_at: null } }], error: null }), user_terms: table });
    const res = await app.inject({ method: 'POST', url: '/api/me/terms', payload: { term_ids: [A] } });
    expect(res.statusCode).toBe(200);
    expect(options[0]).toMatchObject({ onConflict: 'user_id,term_id', ignoreDuplicates: true });
    await app.close();
  });

  it('rejects a bad list', async () => {
    const app = await build(student, { terms: mockQuery({ data: [], error: null }), user_terms: mockQuery({ data: null, error: null }) });
    for (const term_ids of [[], Array.from({ length: 201 }, () => A), [A, 'x'], 'nope']) {
      const res = await app.inject({ method: 'POST', url: '/api/me/terms', payload: { term_ids } });
      expect(res.statusCode, JSON.stringify(term_ids).slice(0, 20)).toBe(400);
    }
    await app.close();
  });

  it("deletes only the caller's row", async () => {
    const table = mockQuery({ data: null, error: null });
    const app = await build(student, { user_terms: table });
    const res = await app.inject({ method: 'DELETE', url: `/api/me/terms/${A}` });
    expect(res.statusCode).toBe(204);
    expect(table.deleteCalls).toBe(1);
    expect(table.eqCalls).toEqual([
      ['user_id', 'student-1'],
      ['term_id', A],
    ]);
    await app.close();
  });

  it('grading a card needs a signed-in user and a known grade', async () => {
    const table = mockQuery({ data: null, error: null });
    let app = await build(null, { user_terms: table });
    expect((await app.inject({ method: 'POST', url: `/api/me/terms/${A}/review`, payload: { grade: 'good' } })).statusCode).toBe(401);
    await app.close();
    app = await build(student, { user_terms: table });
    expect((await app.inject({ method: 'POST', url: `/api/me/terms/${A}/review`, payload: { grade: 'easy' } })).statusCode).toBe(400);
    await app.close();
  });

  it('a card that is not in my list is 404', async () => {
    const app = await build(student, { user_terms: mockQuery({ data: null, error: null }) });
    expect((await app.inject({ method: 'POST', url: `/api/me/terms/${A}/review`, payload: { grade: 'good' } })).statusCode).toBe(404);
    await app.close();
  });

  const card = { interval_days: 0, ease: 2.5, reps: 0, lapses: 0, due_at: '2026-01-01T00:00:00Z', terms: { subject_id: 'sub-1' } };

  it('grading a due card schedules it on the server and earns 2 XP', async () => {
    const read = mockQuery({ data: card, error: null });
    const write = mockQuery({ data: [{ term_id: A }], error: null });
    const today = mockQuery({ data: null, error: null, count: 0 });
    const log = mockQuery({ data: null, error: null });
    const streakWrite = mockQuery({ data: null, error: null });
    const app = await build(student, { user_terms: [read, write], xp_log: [today, log], streaks: [mockQuery({ data: null, error: null }), streakWrite] });
    const res = await app.inject({ method: 'POST', url: `/api/me/terms/${A}/review`, payload: { grade: 'good' } });
    expect(res.statusCode).toBe(200);
    expect(Date.parse(res.json().due_at) - Date.now()).toBeGreaterThan(86_000_000);
    expect(res.json().xp_earned).toBe(2);
    expect(read.eqCalls).toEqual([['user_id', 'student-1'], ['term_id', A]]);
    expect(write.updated[0]).toMatchObject({ interval_days: 1, reps: 1, ease: 2.5, lapses: 0 });
    expect(write.eqCalls).toEqual([['user_id', 'student-1'], ['term_id', A]]);
    expect(write.lteCalls[0]?.[0]).toBe('due_at');
    expect(log.inserted[0]).toEqual({ user_id: 'student-1', subject_id: 'sub-1', delta: 2, reason: 'word_review' });
    expect(res.json().new_streak).toBe(1);
    expect(streakWrite.inserted[0]).toMatchObject({ user_id: 'student-1', subject_id: 'sub-1', current_streak: 1 });
    await app.close();
  });

  it('"again" earns no XP', async () => {
    const log = mockQuery({ data: null, error: null });
    const app = await build(student, {
      user_terms: [mockQuery({ data: card, error: null }), mockQuery({ data: [{ term_id: A }], error: null })],
      xp_log: [mockQuery({ data: null, error: null, count: 0 }), log],
      streaks: [mockQuery({ data: null, error: null }), mockQuery({ data: null, error: null })],
    });
    const res = await app.inject({ method: 'POST', url: `/api/me/terms/${A}/review`, payload: { grade: 'again' } });
    expect(res.json().xp_earned).toBe(0);
    expect(res.json().new_streak).toBe(1);
    expect(log.inserted).toHaveLength(0);
    await app.close();
  });

  it('stops giving XP at 40 a day', async () => {
    const log = mockQuery({ data: null, error: null });
    const app = await build(student, {
      user_terms: [mockQuery({ data: card, error: null }), mockQuery({ data: [{ term_id: A }], error: null })],
      xp_log: [mockQuery({ data: null, error: null, count: 20 }), log],
      streaks: [mockQuery({ data: null, error: null }), mockQuery({ data: null, error: null })],
    });
    const res = await app.inject({ method: 'POST', url: `/api/me/terms/${A}/review`, payload: { grade: 'good' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().xp_earned).toBe(0);
    expect(log.inserted).toHaveLength(0);
    await app.close();
  });

  it('a card that is not due (or was just graded) is refused', async () => {
    const log = mockQuery({ data: null, error: null });
    const app = await build(student, {
      user_terms: [mockQuery({ data: card, error: null }), mockQuery({ data: [], error: null })],
      xp_log: [mockQuery({ data: null, error: null, count: 0 }), log],
    });
    const res = await app.inject({ method: 'POST', url: `/api/me/terms/${A}/review`, payload: { grade: 'good' } });
    expect(res.statusCode).toBe(409);
    expect(log.inserted).toHaveLength(0);
    await app.close();
  });
});
