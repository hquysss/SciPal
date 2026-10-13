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
});
