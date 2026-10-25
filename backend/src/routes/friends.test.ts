import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { friendRoutes, orderPair } from './friends.js';
import { fakeDb } from '../__tests__/fakeDb.js';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const THIRD = '33333333-3333-4333-8333-333333333333';
const ROW = '44444444-4444-4444-8444-444444444444';

function build(opts: { db?: ReturnType<typeof fakeDb>; user?: { id: string } | null }) {
  const app = Fastify({ logger: false });
  if (opts.db) app.decorate('supabase', opts.db as any);
  app.addHook('onRequest', async (req) => {
    if (opts.user !== null) (req as any).user = opts.user ?? { id: ME };
  });
  app.register(friendRoutes);
  return app;
}

describe('orderPair', () => {
  it('puts the smaller id first whichever way round it is given', () => {
    expect(orderPair('b', 'a')).toEqual(['a', 'b']);
    expect(orderPair('a', 'b')).toEqual(['a', 'b']);
  });
});

describe('GET /api/friends', () => {
  it('returns 401 without a user and 503 without supabase', async () => {
    expect((await build({ user: null }).inject({ method: 'GET', url: '/api/friends' })).statusCode).toBe(401);
    expect((await build({}).inject({ method: 'GET', url: '/api/friends' })).statusCode).toBe(503);
  });

  it('sorts rows into friends, incoming and outgoing, naming the other person', async () => {
    const [a1, b1] = orderPair(ME, OTHER);
    const [a2, b2] = orderPair(ME, THIRD);
    const FOURTH = '55555555-5555-4555-8555-555555555555';
    const [a3, b3] = orderPair(ME, FOURTH);
    const db = fakeDb({
      'friendships.select': [{
        data: [
          { id: 'f1', user_a: a1, user_b: b1, requested_by: OTHER, status: 'accepted' },
          { id: 'f2', user_a: a2, user_b: b2, requested_by: THIRD, status: 'pending' },
          { id: 'f3', user_a: a3, user_b: b3, requested_by: ME, status: 'pending' },
        ],
      }],
      'profiles.select': [{
        data: [
          { id: OTHER, display_name: 'An', avatar_url: null },
          { id: THIRD, display_name: null, avatar_url: 'x.png' },
          { id: FOURTH, display_name: 'Bình', avatar_url: null },
        ],
      }],
    });
    const res = await build({ db }).inject({ method: 'GET', url: '/api/friends' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      friends: [{ id: 'f1', user_id: OTHER, display_name: 'An', avatar_url: null }],
      incoming: [{ id: 'f2', user_id: THIRD, display_name: null, avatar_url: 'x.png' }],
      outgoing: [{ id: 'f3', user_id: FOURTH, display_name: 'Bình', avatar_url: null }],
    });
  });
});

describe('GET /api/friends/search', () => {
  it('rejects a query shorter than 2 characters', async () => {
    const res = await build({ db: fakeDb({}) }).inject({ method: 'GET', url: '/api/friends/search?q=a' });
    expect(res.statusCode).toBe(400);
  });

  it('escapes % and _ so they cannot match everyone, and caps results at 10', async () => {
    const db = fakeDb({ 'profiles.select': [{ data: [] }], 'friendships.select': [{ data: [] }] });
    await build({ db }).inject({ method: 'GET', url: `/api/friends/search?q=${encodeURIComponent('a%_b')}` });
    const profiles = db.calls.find((c) => c.table === 'profiles')!;
    expect(profiles.chain).toContainEqual(['ilike', ['display_name', '%a\\%\\_b%']]);
    expect(profiles.chain).toContainEqual(['limit', [10]]);
    expect(profiles.chain).toContainEqual(['neq', ['id', ME]]);
  });

  it('reports how each match relates to the caller', async () => {
    const [a1, b1] = orderPair(ME, OTHER);
    const [a2, b2] = orderPair(ME, THIRD);
    const db = fakeDb({
      'profiles.select': [{ data: [
        { id: OTHER, display_name: 'An', avatar_url: null },
        { id: THIRD, display_name: 'Anh', avatar_url: null },
      ] }],
      'friendships.select': [{ data: [
        { id: 'f1', user_a: a1, user_b: b1, requested_by: OTHER, status: 'pending' },
        { id: 'f2', user_a: a2, user_b: b2, requested_by: ME, status: 'pending' },
      ] }],
    });
    const res = await build({ db }).inject({ method: 'GET', url: '/api/friends/search?q=an' });
    expect(res.json().users).toEqual([
      { user_id: OTHER, display_name: 'An', avatar_url: null, relation: 'pending_in', friendship_id: 'f1' },
      { user_id: THIRD, display_name: 'Anh', avatar_url: null, relation: 'pending_out', friendship_id: 'f2' },
    ]);
  });
});

describe('POST /api/friends/request', () => {
  const post = (app: ReturnType<typeof build>, body: unknown) =>
    app.inject({ method: 'POST', url: '/api/friends/request', payload: body as object });

  it('rejects yourself and a malformed id', async () => {
    const app = build({ db: fakeDb({}) });
    expect((await post(app, { user_id: ME })).statusCode).toBe(400);
    expect((await post(app, { user_id: 'nope' })).statusCode).toBe(400);
  });

  it('returns 404 when the other account does not exist', async () => {
    const db = fakeDb({ 'profiles.select': [{ data: null }] });
    expect((await post(build({ db }), { user_id: OTHER })).statusCode).toBe(404);
  });

  it('returns 409 when a row already exists between the two', async () => {
    const [a, b] = orderPair(ME, OTHER);
    const db = fakeDb({
      'profiles.select': [{ data: { id: OTHER } }],
      'friendships.select': [{ data: { id: ROW, user_a: a, user_b: b, requested_by: ME, status: 'pending' } }],
    });
    expect((await post(build({ db }), { user_id: OTHER })).statusCode).toBe(409);
  });

  it('accepts instead of inserting when the other person already asked', async () => {
    const [a, b] = orderPair(ME, OTHER);
    const db = fakeDb({
      'profiles.select': [{ data: { id: OTHER } }],
      'friendships.select': [{ data: { id: ROW, user_a: a, user_b: b, requested_by: OTHER, status: 'pending' } }],
      'friendships.update': [{ data: [{ id: ROW }] }],
    });
    const res = await post(build({ db }), { user_id: OTHER });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: ROW, status: 'accepted', new_badges: [] });
    expect(db.calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('returns 429 once 20 requests are waiting', async () => {
    const db = fakeDb({
      'profiles.select': [{ data: { id: OTHER } }],
      'friendships.select': [{ data: null }, { count: 20 }],
    });
    expect((await post(build({ db }), { user_id: OTHER })).statusCode).toBe(429);
  });

  it('inserts an ordered pair requested by the caller', async () => {
    const db = fakeDb({
      'profiles.select': [{ data: { id: OTHER } }],
      'friendships.select': [{ data: null }, { count: 0 }],
      'friendships.insert': [{ data: { id: ROW } }],
    });
    const res = await post(build({ db }), { user_id: OTHER });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: ROW, status: 'pending' });
    const [a, b] = orderPair(ME, OTHER);
    expect(db.calls.find((c) => c.op === 'insert')!.chain[0]).toEqual(['insert', [{ user_a: a, user_b: b, requested_by: ME }]]);
  });

  it('turns a unique-key race into 409', async () => {
    const db = fakeDb({
      'profiles.select': [{ data: { id: OTHER } }],
      'friendships.select': [{ data: null }, { count: 0 }],
      'friendships.insert': [{ data: null, error: { code: '23505' } }],
    });
    expect((await post(build({ db }), { user_id: OTHER })).statusCode).toBe(409);
  });
});

describe('POST /api/friends/:id/accept and DELETE /api/friends/:id', () => {
  const [a, b] = orderPair(ME, OTHER);
  const row = (over: object = {}) => ({ id: ROW, user_a: a, user_b: b, requested_by: OTHER, status: 'pending', ...over });
  const accept = (db: ReturnType<typeof fakeDb>) => build({ db }).inject({ method: 'POST', url: `/api/friends/${ROW}/accept` });
  const remove = (db: ReturnType<typeof fakeDb>, as?: string) =>
    build({ db, user: as ? { id: as } : undefined }).inject({ method: 'DELETE', url: `/api/friends/${ROW}` });

  it('accept: 404 for a missing row or a non-member', async () => {
    expect((await accept(fakeDb({ 'friendships.select': [{ data: null }] }))).statusCode).toBe(404);
    expect((await accept(fakeDb({ 'friendships.select': [{ data: row({ user_a: OTHER, user_b: THIRD }) }] }))).statusCode).toBe(404);
  });

  it('accept: 403 when the caller sent the request themselves', async () => {
    expect((await accept(fakeDb({ 'friendships.select': [{ data: row({ requested_by: ME }) }] }))).statusCode).toBe(403);
  });

  it('accept: 409 when already friends', async () => {
    expect((await accept(fakeDb({ 'friendships.select': [{ data: row({ status: 'accepted' }) }] }))).statusCode).toBe(409);
  });

  it('accept: marks the pending row accepted', async () => {
    const db = fakeDb({ 'friendships.select': [{ data: row() }], 'friendships.update': [{ data: [{ id: ROW }] }] });
    const res = await accept(db);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: ROW, status: 'accepted', new_badges: [] });
    expect(db.calls.find((c) => c.op === 'update')!.chain).toContainEqual(['eq', ['status', 'pending']]);
  });

  it('delete: 404 for a non-member, 200 and a delete for a member', async () => {
    expect((await remove(fakeDb({ 'friendships.select': [{ data: row() }] }), THIRD)).statusCode).toBe(404);
    const db = fakeDb({ 'friendships.select': [{ data: row() }] });
    expect((await remove(db)).statusCode).toBe(200);
    expect(db.calls.find((c) => c.op === 'delete')!.chain).toContainEqual(['eq', ['id', ROW]]);
  });
});

describe('POST /api/friends/request and blocks', () => {
  it('refuses with 403 when either side blocked the other, without inserting', async () => {
    const db = fakeDb({
      'profiles.select': [{ data: { id: OTHER } }],
      'chat_blocks.select': [{ data: [{ blocker_id: OTHER }] }],
    });
    const res = await build({ db }).inject({ method: 'POST', url: '/api/friends/request', payload: { user_id: OTHER } });
    expect(res.statusCode).toBe(403);
    expect(db.calls.some((c) => c.op === 'insert')).toBe(false);
  });
});
