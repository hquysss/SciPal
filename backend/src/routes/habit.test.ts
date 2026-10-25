import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '../__tests__/fakeDb.js';
import { habitRoutes } from './habit.js';

function build(db: ReturnType<typeof fakeDb>, user: object | null = { id: 'u1' }) {
  const app = Fastify({ logger: false });
  app.decorate('supabase', db as any);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  app.register(habitRoutes);
  return app;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-25T05:00:00Z')); // 12:00 in Vietnam
});
afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/me/habit', () => {
  it('needs a signed-in learner', async () => {
    const res = await build(fakeDb({}), null).inject({ method: 'GET', url: '/api/me/habit' });
    expect(res.statusCode).toBe(401);
  });

  it('answers the streak across subjects, today XP, goal and freezes', async () => {
    const db = fakeDb({
      'study_days.select': [{ data: [
        { day: '2026-09-01', xp: 10, freeze: false },
        { day: '2026-10-23', xp: 30, freeze: false },
        { day: '2026-10-24', xp: 0, freeze: true },
        { day: '2026-10-25', xp: 25, freeze: false },
      ] }],
      'profiles.select': [{ data: { daily_goal_xp: 50, streak_freezes: 1 } }],
    });
    const res = await build(db).inject({ method: 'GET', url: '/api/me/habit' });
    expect(res.json()).toMatchObject({ today: '2026-10-25', streak: 3, longest: 3, today_xp: 25, goal_xp: 50, freezes: 1 });
    expect(res.json().days.map((d: { day: string }) => d.day)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25']);
  });

  it('fails without guessing when a read fails', async () => {
    const db = fakeDb({ 'study_days.select': [{ error: { message: 'down' } }], 'profiles.select': [{ data: null }] });
    expect((await build(db).inject({ method: 'GET', url: '/api/me/habit' })).statusCode).toBe(500);
  });
});

describe('PATCH /api/me/habit', () => {
  it('saves 20, 50 or 100', async () => {
    const db = fakeDb({ 'profiles.update': [{ data: null }] });
    const res = await build(db).inject({ method: 'PATCH', url: '/api/me/habit', payload: { goal_xp: 50 } });
    expect(res.statusCode).toBe(200);
    expect(db.calls[0]!.chain).toContainEqual(['update', [{ daily_goal_xp: 50 }]]);
    expect(db.calls[0]!.chain).toContainEqual(['eq', ['id', 'u1']]);
  });

  it('refuses any other goal', async () => {
    for (const goal_xp of [30, '50', null]) {
      const res = await build(fakeDb({})).inject({ method: 'PATCH', url: '/api/me/habit', payload: { goal_xp } });
      expect(res.statusCode).toBe(400);
    }
  });
});
