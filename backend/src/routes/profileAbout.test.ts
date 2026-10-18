import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { profileRoutes } from './profile.js';
import { fakeDb } from '../__tests__/fakeDb.js';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const FS = '44444444-4444-4444-8444-444444444444';

function build(db: ReturnType<typeof fakeDb>, user: { id: string } | null = { id: ME }) {
  const app = Fastify({ logger: false });
  app.decorate('supabase', db as any);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  app.register(profileRoutes);
  return app;
}

const about = (db: ReturnType<typeof fakeDb>, payload: object) => build(db).inject({ method: 'PATCH', url: '/api/profile/about', payload });
const valid = { grade: 11, school: ' THPT A ', bio: '', show_school: true, show_bio: false };

describe('PATCH /api/profile/about', () => {
  it('needs a user', async () => {
    const res = await build(fakeDb({}), null).inject({ method: 'PATCH', url: '/api/profile/about', payload: valid });
    expect(res.statusCode).toBe(401);
  });

  it('saves trimmed values, with an empty bio stored as null', async () => {
    const db = fakeDb({ 'profiles.update': [{}] });
    expect((await about(db, valid)).statusCode).toBe(200);
    expect(db.calls.find((c) => c.op === 'update')!.chain[0][1]).toEqual([{ grade: 11, school: 'THPT A', bio: null, show_school: true, show_bio: false }]);
  });

  it('rejects a bad grade, an overlong school or bio, and missing switches', async () => {
    const db = fakeDb({});
    for (const bad of [{ grade: 9 }, { school: 'x'.repeat(101) }, { bio: 'x'.repeat(251) }, { show_bio: 'yes' }]) {
      expect((await about(db, { ...valid, ...bad })).statusCode).toBe(400);
    }
    expect(db.calls.some((c) => c.op === 'update')).toBe(false);
  });
});

describe('GET /api/profile/:user_id', () => {
  const row = (over: object = {}) => ({
    data: { id: OTHER, display_name: 'Bình', avatar_url: null, cover_url: null, role: 'student', grade: 10, school: 'THPT B', bio: 'Xin chào', show_school: false, show_bio: true, ...over },
  });
  const get = (db: ReturnType<typeof fakeDb>, id = OTHER) => build(db).inject({ method: 'GET', url: `/api/profile/${id}` });
  const others = (pair: object | null, blocks: object[] = []) => ({
    'friendships.select': [{ data: pair }], 'chat_blocks.select': [{ data: blocks }],
    'streaks.select': [{ data: [{ current_streak: 3, longest_streak: 5 }, { current_streak: 1, longest_streak: 9 }] }],
  });

  it('hides a school the owner hid, shows the bio, and reports the friend relation and best streaks', async () => {
    const db = fakeDb({ 'profiles.select': [row()], ...others({ id: FS, requested_by: ME, status: 'accepted' }) });
    const res = await get(db);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      school: null, bio: 'Xin chào', is_me: false, relation: 'friend', friendship_id: FS, streak: { current: 3, best: 9 }, show_school: null,
    });
  });

  it('relation: pending direction and block', async () => {
    const out = fakeDb({ 'profiles.select': [row()], ...others({ id: FS, requested_by: ME, status: 'pending' }) });
    expect((await get(out)).json().relation).toBe('pending_out');
    const incoming = fakeDb({ 'profiles.select': [row()], ...others({ id: FS, requested_by: OTHER, status: 'pending' }) });
    expect((await get(incoming)).json().relation).toBe('pending_in');
    const blocked = fakeDb({ 'profiles.select': [row()], ...others(null, [{ blocker_id: OTHER }]) });
    expect((await get(blocked)).json().relation).toBe('blocked');
  });

  it('"me" returns your own hidden fields and the switches', async () => {
    const db = fakeDb({ 'profiles.select': [row({ id: ME })], 'streaks.select': [{ data: [] }] });
    expect((await get(db, 'me')).json()).toMatchObject({ is_me: true, relation: 'me', school: 'THPT B', show_school: false, streak: { current: 0, best: 0 } });
  });

  it('adds the all-time XP rank, and leaves it null when the lookup fails or the person has no XP', async () => {
    const db = fakeDb({ 'profiles.select': [row()], ...others(null) });
    (db as any).rpc = async (fn: string, args: object) => {
      expect([fn, args]).toEqual(['xp_rank_of', { p_user: OTHER }]);
      return { data: [{ rank: '3', xp: '120', week_rank: '1' }], error: null };
    };
    expect((await get(db)).json().rank).toEqual({ position: 3, xp: 120, week: 1 });
    const none = fakeDb({ 'profiles.select': [row()], ...others(null) });
    (none as any).rpc = async () => ({ data: [], error: null });
    expect((await get(none)).json().rank).toBeNull();
    const broken = fakeDb({ 'profiles.select': [row()], ...others(null) });
    (broken as any).rpc = async () => ({ data: null, error: { message: 'missing function' } });
    const res = await get(broken);
    expect(res.statusCode).toBe(200);
    expect(res.json().rank).toBeNull();
  });

  it('404 for an unknown or malformed id', async () => {
    expect((await get(fakeDb({ 'profiles.select': [{ data: null }] }))).statusCode).toBe(404);
    expect((await get(fakeDb({}), 'nope')).statusCode).toBe(404);
  });
});
