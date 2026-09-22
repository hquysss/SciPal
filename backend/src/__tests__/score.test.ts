import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { scoreRoutes } from '../routes/score.js';
import { surveyRoutes } from '../routes/survey.js';

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

  it('POST /api/survey is accessible anonymously', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/survey',
      payload: { type: 'demand', payload: { subject: 'informatics', grade: 11 } },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true });
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
