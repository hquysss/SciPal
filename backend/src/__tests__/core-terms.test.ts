import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { termRoutes } from '../routes/terms.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const SUBJECT = '33333333-3333-4333-8333-333333333333';
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };

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
const mark = (app: Awaited<ReturnType<typeof build>>, payload: object) =>
  app.inject({ method: 'POST', url: '/api/admin/terms/core', payload: payload as Record<string, unknown> });

describe('marking core terms', () => {
  it('is for admins only', async () => {
    for (const user of [null, teacher]) {
      const app = await build(user, { terms: mockQuery({ data: [], error: null }) });
      expect((await mark(app, { term_ids: [A], core: true })).statusCode).toBe(403);
      await app.close();
    }
  });

  it('sets the flag on the listed published terms and says how many changed', async () => {
    const terms = mockQuery({ data: [{ id: A }, { id: B }], error: null });
    const app = await build(admin, { terms });
    const res = await mark(app, { term_ids: [A, B], core: true });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 2 });
    expect(terms.updated[0]).toEqual({ core: true });
    expect(terms.inCalls).toEqual([['id', [A, B]]]);
    expect(terms.eqCalls).toContainEqual(['status', 'published']);
    await app.close();
  });

  it('sets the flag on every published term of a subject', async () => {
    const terms = mockQuery({ data: [{ id: A }], error: null });
    const app = await build(admin, { terms });
    const res = await mark(app, { subject_id: SUBJECT, core: false });
    expect(res.json()).toEqual({ updated: 1 });
    expect(terms.updated[0]).toEqual({ core: false });
    expect(terms.eqCalls).toEqual(expect.arrayContaining([['subject_id', SUBJECT], ['status', 'published']]));
    await app.close();
  });

  it('refuses a bad request: no target, both targets, too many ids, a bad id, no flag', async () => {
    const app = await build(admin, { terms: mockQuery({ data: [], error: null }) });
    const many = Array.from({ length: 501 }, () => A);
    for (const payload of [
      { core: true },
      { term_ids: [A], subject_id: SUBJECT, core: true },
      { term_ids: many, core: true },
      { term_ids: [], core: true },
      { term_ids: ['x'], core: true },
      { term_ids: [A] },
      { term_ids: [A], core: 'yes' },
    ]) {
      expect((await mark(app, payload)).statusCode, JSON.stringify(payload).slice(0, 40)).toBe(400);
    }
    await app.close();
  });

  it('reports a failed save', async () => {
    const app = await build(admin, { terms: mockQuery({ data: null, error: { message: 'x' } }) });
    expect((await mark(app, { term_ids: [A], core: true })).statusCode).toBe(500);
    await app.close();
  });
});
