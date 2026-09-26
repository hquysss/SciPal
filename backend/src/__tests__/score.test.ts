import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { scoreRoutes } from '../routes/score.js';
import { surveyRoutes } from '../routes/survey.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

describe('Score and Survey Routes', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(authPlugin);
    await app.register(scoreRoutes);
    await app.register(surveyRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('POST /api/score/lesson returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/score/lesson',
      payload: { lesson_id: 'lesson-1', answers: [] },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/survey returns 400 when missing payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/survey',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

it('does not claim XP when lesson progress cannot be persisted', async () => {
  const app = Fastify();
  app.addHook('onRequest', async (request) => {
    (request as typeof request & { user: { id: string } }).user = {
      id: '00000000-0000-0000-0000-000000000001',
    };
  });
  await app.register(scoreRoutes);
  await app.ready();

  const res = await app.inject({
    method: 'POST',
    url: '/api/score/lesson',
    payload: { lesson_id: '00000000-0000-0000-0000-000000000002', answers: [] },
  });

  expect(res.statusCode).toBe(503);
  expect(res.json()).not.toHaveProperty('xp_earned');
  await app.close();
});

it('does not grant XP twice for an already completed lesson', async () => {
  const app = Fastify();
  let xpWrites = 0;
  const query = (data: unknown) => ({
    select() { return this; },
    eq() { return this; },
    async maybeSingle() { return { data, error: null }; },
  });
  app.decorate('supabase', {
    from(table: string) {
      if (table === 'lessons') return query({ subject_id: 'subject-1' });
      if (table === 'progress') return query({ id: 'progress-1' });
      xpWrites += 1;
      return query(null);
    },
  } as unknown as SupabaseClient);
  app.addHook('onRequest', async (request) => {
    (request as typeof request & { user: { id: string } }).user = {
      id: '00000000-0000-0000-0000-000000000001',
    };
  });
  await app.register(scoreRoutes);
  await app.ready();

  const res = await app.inject({
    method: 'POST',
    url: '/api/score/lesson',
    payload: { lesson_id: '00000000-0000-0000-0000-000000000002', answers: [] },
  });

  expect(res.statusCode).toBe(200);
  expect(res.json().xp_earned).toBe(0);
  expect(xpWrites).toBe(0);
  await app.close();
});

it('only scores lessons whose status is published', async () => {
  const lessons = mockQuery({ data: null, error: null });
  const app = Fastify();
  app.decorate('supabase', mockSupabase({ lessons }));
  app.addHook('onRequest', async (request) => {
    (request as typeof request & { user: { id: string } }).user = { id: '00000000-0000-0000-0000-000000000001' };
  });
  await app.register(scoreRoutes);
  await app.ready();
  const res = await app.inject({ method: 'POST', url: '/api/score/lesson', payload: { lesson_id: 'lesson-1', answers: [] } });
  expect(res.statusCode).toBe(404);
  expect(lessons.eqCalls).toContainEqual(['status', 'published']);
  await app.close();
});
