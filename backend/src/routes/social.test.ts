import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { socialRoutes } from './social.js';
import { fakeDb } from '../__tests__/fakeDb.js';
import { addDays, vnDay } from '../streaks/vnDay.js';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const CH = '44444444-4444-4444-8444-444444444444';

function build(db?: ReturnType<typeof fakeDb>, user: { id: string } | null = { id: ME }) {
  const app = Fastify({ logger: false });
  if (db) app.decorate('supabase', db as any);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  app.register(socialRoutes);
  return app;
}

const row = (over: object = {}) => ({
  id: CH, challenger: OTHER, opponent: ME, status: 'pending', starts_on: null, ends_on: null, winner: null, created_at: new Date().toISOString(), ...over,
});

describe('/api/me/privacy', () => {
  it('needs a user and takes only a boolean', async () => {
    expect((await build(fakeDb({}), null).inject({ method: 'GET', url: '/api/me/privacy' })).statusCode).toBe(401);
    for (const body of [{}, { leaderboard_public: 'yes' }, { leaderboard_public: 1 }]) {
      expect((await build(fakeDb({})).inject({ method: 'PATCH', url: '/api/me/privacy', payload: body })).statusCode).toBe(400);
    }
  });

  it('saves the switch on the caller only', async () => {
    const db = fakeDb({ 'profiles.update': [{}] });
    const res = await build(db).inject({ method: 'PATCH', url: '/api/me/privacy', payload: { leaderboard_public: true } });
    expect(res.json()).toEqual({ leaderboard_public: true });
    expect(db.calls[0]!.chain).toEqual([['update', [{ leaderboard_public: true }]], ['eq', ['id', ME]]]);
  });

  it('reads false when nothing is set', async () => {
    const res = await build(fakeDb({ 'profiles.select': [{ data: null }] })).inject({ method: 'GET', url: '/api/me/privacy' });
    expect(res.json()).toEqual({ leaderboard_public: false });
  });
});

describe('POST /api/challenges', () => {
  const send = (db: ReturnType<typeof fakeDb>, opponent: string = OTHER) => build(db).inject({ method: 'POST', url: '/api/challenges', payload: { opponent } });

  it('rejects yourself and a bad id', async () => {
    expect((await send(fakeDb({}), ME)).statusCode).toBe(400);
    expect((await send(fakeDb({}), 'x')).statusCode).toBe(400);
  });

  it('returns 403 when the two are not accepted friends', async () => {
    const db = fakeDb({ 'friendships.select': [{ data: null }] });
    expect((await send(db)).statusCode).toBe(403);
    expect(db.calls[0]!.chain).toContainEqual(['eq', ['status', 'accepted']]);
  });

  it('returns 409 when the sender already runs 3 challenges', async () => {
    const db = fakeDb({ 'friendships.select': [{ data: { id: 'f' } }], 'challenges.select': [{ count: 3 }] });
    expect((await send(db)).statusCode).toBe(409);
    expect(db.calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('returns 409 when the pair already has an open challenge', async () => {
    const db = fakeDb({
      'friendships.select': [{ data: { id: 'f' } }],
      'challenges.select': [{ count: 0 }],
      'challenges.insert': [{ error: { code: '23505' } }],
    });
    expect((await send(db)).statusCode).toBe(409);
  });

  it('creates the challenge and tells the opponent', async () => {
    const db = fakeDb({
      'friendships.select': [{ data: { id: 'f' } }],
      'challenges.select': [{ count: 2 }],
      'challenges.insert': [{ data: { id: CH } }],
      'profiles.select': [{ data: { display_name: 'An' } }],
      'notifications.insert': [{}],
    });
    const res = await send(db);
    expect(res.statusCode).toBe(201);
    expect(db.calls.find((c) => c.op === 'insert' && c.table === 'challenges')!.chain[0]).toEqual(['insert', [{ challenger: ME, opponent: OTHER }]]);
    const notice = db.calls.find((c) => c.table === 'notifications')!.chain[0]![1][0] as Array<{ user_id: string; title_vi: string }>;
    expect(notice.map((n) => n.user_id)).toEqual([OTHER]);
    expect(notice[0]!.title_vi).toContain('An thách đấu');
  });
});

describe('answering a challenge', () => {
  it('only the opponent answers, and only while pending', async () => {
    const accept = (r: object) => build(fakeDb({ 'challenges.select': [{ data: r }] })).inject({ method: 'POST', url: `/api/challenges/${CH}/accept` });
    expect((await accept(row({ challenger: ME, opponent: OTHER }))).statusCode).toBe(403);
    expect((await accept(row({ status: 'active' }))).statusCode).toBe(409);
    expect((await accept(row({ challenger: OTHER, opponent: '33333333-3333-4333-8333-333333333333' }))).statusCode).toBe(404);
  });

  it('accepting starts tomorrow (Vietnam day) and tells the challenger', async () => {
    const db = fakeDb({
      'challenges.select': [{ data: row() }, { count: 0 }, { count: 1 }],
      'challenges.update': [{ data: [{ id: CH }] }],
      'profiles.select': [{ data: { display_name: 'Bình' } }],
      'notifications.insert': [{}],
    });
    const res = await build(db).inject({ method: 'POST', url: `/api/challenges/${CH}/accept` });
    const starts = addDays(vnDay(new Date()), 1);
    expect(res.json()).toEqual({ id: CH, status: 'active', starts_on: starts, ends_on: addDays(starts, 6) });
    const update = db.calls.find((c) => c.op === 'update')!.chain;
    expect(update).toContainEqual(['eq', ['status', 'pending']]);
    expect((db.calls.find((c) => c.table === 'notifications')!.chain[0]![1][0] as Array<{ user_id: string }>)[0]!.user_id).toBe(OTHER);
  });

  it('refuses to accept when either side already runs 3', async () => {
    const db = fakeDb({ 'challenges.select': [{ data: row() }, { count: 3 }, { count: 0 }] });
    expect((await build(db).inject({ method: 'POST', url: `/api/challenges/${CH}/accept` })).statusCode).toBe(409);
    expect(db.calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('declining marks it declined', async () => {
    const db = fakeDb({ 'challenges.select': [{ data: row() }], 'challenges.update': [{}] });
    const res = await build(db).inject({ method: 'POST', url: `/api/challenges/${CH}/decline` });
    expect(res.json()).toEqual({ id: CH, status: 'declined' });
  });
});

describe('GET /api/challenges', () => {
  const today = vnDay(new Date());
  const ended = { starts_on: addDays(today, -8), ends_on: addDays(today, -2) };
  const days = [
    { user_id: ME, day: addDays(today, -5), xp: 40, freeze: false },
    { user_id: OTHER, day: addDays(today, -5), xp: 25, freeze: false },
    { user_id: OTHER, day: addDays(today, -1), xp: 100, freeze: false },
  ];
  const list = (settled: object) => fakeDb({
    'challenges.select': [{ data: [row({ status: 'active', ...ended })] }, { count: 1 }, { count: 0 }],
    'profiles.select': [{ data: [{ id: OTHER, display_name: 'Bình', avatar_url: null }] }],
    'study_days.select': [{ data: days }],
    'challenges.update': [settled],
    'notifications.insert': [{}],
  });

  it('settles a finished challenge from the study days inside its window', async () => {
    const db = list({ data: [{ id: CH }] });
    const res = await build(db).inject({ method: 'GET', url: '/api/challenges' });
    const [c] = res.json().challenges;
    expect(c).toMatchObject({ status: 'done', winner: 'me', my_xp: 40, their_xp: 25, incoming: true, other: { display_name: 'Bình' } });
    const update = db.calls.find((x) => x.op === 'update')!.chain;
    expect(update[0]).toEqual(['update', [{ status: 'done', winner: ME }]]);
    expect(update).toContainEqual(['eq', ['status', 'active']]);
    expect(db.calls.filter((x) => x.table === 'notifications')).toHaveLength(1);
  });

  it('awards and notifies only when this request did the settling', async () => {
    const db = list({ data: [] });
    await build(db).inject({ method: 'GET', url: '/api/challenges' });
    expect(db.calls.some((x) => x.table === 'notifications')).toBe(false);
    expect(db.calls.some((x) => x.table === 'user_badges')).toBe(false);
  });

  it('records a tie as no winner', async () => {
    const tie = fakeDb({
      'challenges.select': [{ data: [row({ status: 'active', ...ended })] }],
      'profiles.select': [{ data: [] }],
      'study_days.select': [{ data: [] }],
      'challenges.update': [{ data: [{ id: CH }] }],
    });
    const res = await build(tie).inject({ method: 'GET', url: '/api/challenges' });
    expect(res.json().challenges[0]).toMatchObject({ status: 'done', winner: null, my_xp: 0, their_xp: 0 });
    expect(tie.calls.find((x) => x.op === 'update')!.chain[0]).toEqual(['update', [{ status: 'done', winner: null }]]);
  });
});

describe('cancelled and lapsed invitations', () => {
  const old = new Date(Date.now() - 8 * 86_400_000).toISOString();

  it('only the sender cancels, and only while pending', async () => {
    const cancel = (r: object, db?: object) => build(fakeDb({ 'challenges.select': [{ data: r }], 'challenges.update': [{}], ...db })).inject({ method: 'POST', url: `/api/challenges/${CH}/cancel` });
    expect((await cancel(row())).statusCode).toBe(403);
    expect((await cancel(row({ challenger: ME, opponent: OTHER, status: 'active' }))).statusCode).toBe(409);
    const res = await cancel(row({ challenger: ME, opponent: OTHER }));
    expect(res.json()).toEqual({ id: CH, status: 'declined' });
  });

  it('refuses to accept an invitation older than 7 days', async () => {
    const db = fakeDb({ 'challenges.select': [{ data: row({ created_at: old }) }] });
    expect((await build(db).inject({ method: 'POST', url: `/api/challenges/${CH}/accept` })).statusCode).toBe(409);
    expect(db.calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('retires lapsed invitations from the list', async () => {
    const db = fakeDb({
      'challenges.select': [{ data: [row({ created_at: old }), row({ id: 'fresh' })] }],
      'challenges.update': [{}],
      'profiles.select': [{ data: [] }],
    });
    const res = await build(db).inject({ method: 'GET', url: '/api/challenges' });
    expect(res.json().challenges.map((c: { id: string }) => c.id)).toEqual(['fresh']);
    const update = db.calls.find((c) => c.op === 'update')!.chain;
    expect(update).toContainEqual(['update', [{ status: 'declined' }]]);
    expect(update).toContainEqual(['in', ['id', [CH]]]);
    expect(update).toContainEqual(['eq', ['status', 'pending']]);
  });

  it('a new challenge replaces a lapsed one for the same pair', async () => {
    const db = fakeDb({
      'friendships.select': [{ data: { id: 'f' } }],
      'challenges.select': [{ count: 0 }],
      'challenges.insert': [{ error: { code: '23505' } }, { data: { id: CH } }],
      'challenges.update': [{ data: [{ id: 'old' }] }],
      'profiles.select': [{ data: { display_name: 'An' } }],
      'notifications.insert': [{}],
    });
    const res = await build(db).inject({ method: 'POST', url: '/api/challenges', payload: { opponent: OTHER } });
    expect(res.statusCode).toBe(201);
    const update = db.calls.find((c) => c.op === 'update')!.chain;
    expect(update).toContainEqual(['eq', ['status', 'pending']]);
    expect(update.some(([name]) => name === 'lt')).toBe(true);
  });
});
