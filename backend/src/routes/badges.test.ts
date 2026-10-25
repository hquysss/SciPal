import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { badgeRoutes } from './badges.js';
import { fakeDb } from '../__tests__/fakeDb.js';
import { addDays } from '../streaks/vnDay.js';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const B1 = '55555555-5555-4555-8555-555555555555';
const B2 = '66666666-6666-4666-8666-666666666666';

function build(db: ReturnType<typeof fakeDb>, user: object | null = { id: ME }) {
  const app = Fastify({ logger: false });
  app.decorate('supabase', db as any);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  app.register(badgeRoutes);
  return app;
}

const badge = (id: string, slug: string, condition: object, over: object = {}) => ({
  id, slug, name_vi: slug, name_en: slug, description_vi: '', description_en: '', icon: '🏅', category: 'streak', tier: 'bronze', is_system: true, sort_order: 1, condition, ...over,
});

describe('GET /api/badges/:user_id', () => {
  const stats = (streak: number) => ({
    'study_days.select': [{ data: Array.from({ length: streak }, (_, i) => ({ day: addDays('2026-01-01', i) })) }],
    'exam_attempts.select': [{ data: [] }],
    'friendships.select': [{ count: 0 }],
  });

  it('awards the badges a student has earned on their own list, earned ones first', async () => {
    const list = [badge(B1, 'streak_30', { type: 'streak', min: 30 }), badge(B2, 'streak_3', { type: 'streak', min: 3 })];
    const db = fakeDb({
      'profiles.select': [{ data: { daily_goal_xp: 20 } }, { data: { id: ME } }],
      'badges.select': [{ data: list }, { data: list }],
      'user_badges.select': [{ data: [] }, { data: [{ badge_id: B2, earned_at: '2026-10-25T00:00:00Z', reason: null }] }],
      'user_badges.upsert': [{}],
      ...stats(5),
    });
    const res = await build(db).inject({ method: 'GET', url: '/api/badges/me' });
    expect(res.statusCode).toBe(200);
    expect(res.json().badges.map((b: any) => [b.slug, b.unlocked])).toEqual([['streak_3', true], ['streak_30', false]]);
    expect(res.json().badges[1].progress).toEqual({ current: 5, target: 30 });
    expect(res.json().badges[0].progress).toBeUndefined();
    expect(db.calls.find((c) => c.op === 'upsert')!.chain[0][1][0]).toEqual([{ user_id: ME, badge_id: B2 }]);
  });

  it('never awards from someone else\'s list and never awards a manual badge', async () => {
    const other = fakeDb({
      'profiles.select': [{ data: { id: OTHER } }],
      'badges.select': [{ data: [badge(B1, 'streak_3', { type: 'streak', min: 3 })] }],
      'user_badges.select': [{ data: [] }],
    });
    const res = await build(other).inject({ method: 'GET', url: `/api/badges/${OTHER}` });
    expect(res.json().badges[0].unlocked).toBe(false);
    expect(res.json().badges[0].progress).toBeUndefined();
    expect(other.calls.some((c) => c.op === 'upsert')).toBe(false);

    const honor = [badge(B1, 'honor_star_student', { type: 'manual' }, { is_system: false })];
    const manual = fakeDb({
      'profiles.select': [{ data: {} }, { data: { id: ME } }],
      'badges.select': [{ data: honor }, { data: honor }],
      'user_badges.select': [{ data: [] }, { data: [] }],
      ...stats(99),
    });
    await build(manual).inject({ method: 'GET', url: '/api/badges/me' });
    expect(manual.calls.some((c) => c.op === 'upsert')).toBe(false);
  });

  it('awards nothing when the numbers cannot be read', async () => {
    const one = [badge(B1, 'streak_3', { type: 'streak', min: 3 })];
    const db = fakeDb({
      'profiles.select': [{ data: {} }, { data: { id: ME } }],
      'badges.select': [{ data: one }, { data: one }],
      'user_badges.select': [{ data: [] }, { data: [] }],
      'study_days.select': [{ error: { message: 'down' } }],
      'exam_attempts.select': [{ data: [] }],
      'friendships.select': [{ count: 0 }],
    });
    const res = await build(db).inject({ method: 'GET', url: '/api/badges/me' });
    expect(res.json().badges[0].unlocked).toBe(false);
    expect(db.calls.some((c) => c.op === 'upsert')).toBe(false);
  });

  it('401 without a user, 404 for an unknown or malformed id', async () => {
    expect((await build(fakeDb({}), null).inject({ method: 'GET', url: '/api/badges/me' })).statusCode).toBe(401);
    expect((await build(fakeDb({}), {id: ME}).inject({ method: 'GET', url: '/api/badges/nope' })).statusCode).toBe(404);
    const missing = fakeDb({ 'profiles.select': [{ data: null }], 'badges.select': [{ data: [] }], 'user_badges.select': [{ data: [] }] });
    expect((await build(missing).inject({ method: 'GET', url: `/api/badges/${OTHER}` })).statusCode).toBe(404);
  });
});

describe('admin award and revoke', () => {
  const admin = { id: ME, app_metadata: { app_role: 'admin' } };
  const call = (db: ReturnType<typeof fakeDb>, url: string, payload: object, user: object = admin) => build(db, user).inject({ method: 'POST', url, payload });
  const found = (is_system: boolean) => ({ 'profiles.select': [{ data: { id: OTHER } }], 'badges.select': [{ data: { id: B1, is_system } }] });

  it('only an admin may', async () => {
    const res = await call(fakeDb({}), '/api/admin/badges/award', { user_id: OTHER, badge_id: B1, reason: 'x' }, { id: ME, app_metadata: { app_role: 'teacher' } });
    expect(res.statusCode).toBe(403);
  });

  it('awards a manual badge with the admin and the reason', async () => {
    const db = fakeDb({ ...found(false), 'user_badges.upsert': [{}] });
    const res = await call(db, '/api/admin/badges/award', { user_id: OTHER, badge_id: B1, reason: ' Giúp bạn học ' });
    expect(res.statusCode).toBe(201);
    expect(db.calls.find((c) => c.op === 'upsert')!.chain[0][1][0]).toEqual({ user_id: OTHER, badge_id: B1, awarded_by: ME, reason: 'Giúp bạn học' });
  });

  it('refuses an automatic badge, a missing reason and an unknown student', async () => {
    expect((await call(fakeDb(found(true)), '/api/admin/badges/award', { user_id: OTHER, badge_id: B1, reason: 'x' })).statusCode).toBe(400);
    expect((await call(fakeDb(found(false)), '/api/admin/badges/award', { user_id: OTHER, badge_id: B1, reason: '  ' })).statusCode).toBe(400);
    const none = fakeDb({ 'profiles.select': [{ data: null }], 'badges.select': [{ data: { id: B1, is_system: false } }] });
    expect((await call(none, '/api/admin/badges/award', { user_id: OTHER, badge_id: B1, reason: 'x' })).statusCode).toBe(404);
  });

  it('revokes a manual badge', async () => {
    const db = fakeDb({ ...found(false), 'user_badges.delete': [{}] });
    expect((await call(db, '/api/admin/badges/revoke', { user_id: OTHER, badge_id: B1 })).statusCode).toBe(200);
    expect(db.calls.some((c) => c.op === 'delete')).toBe(true);
  });
});
