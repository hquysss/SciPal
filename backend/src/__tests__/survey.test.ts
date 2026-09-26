import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { surveyRoutes } from '../routes/survey.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

async function buildSurveyApp(opts: { surveys?: MockBuilder; userId?: string }) {
  const app = Fastify();
  if (opts.surveys) app.decorate('supabase', mockSupabase({ surveys: opts.surveys }));
  app.addHook('onRequest', async (request) => {
    if (opts.userId) (request as typeof request & { user: { id: string } }).user = { id: opts.userId };
  });
  await app.register(surveyRoutes);
  await app.ready();
  return app;
}

const validBody = { type: 'demand', payload: { subjects: ['math'], grade: 10 } };

describe('POST /api/survey', () => {
  it('stores an anonymous survey with a null user_id', async () => {
    const surveys = mockQuery({ data: null, error: null });
    const app = await buildSurveyApp({ surveys });
    const res = await app.inject({ method: 'POST', url: '/api/survey', payload: validBody });
    expect(res.statusCode).toBe(201);
    expect(surveys.inserted).toEqual([{ user_id: null, ...validBody }]);
    await app.close();
  });

  it('attributes the survey to the signed-in user', async () => {
    const surveys = mockQuery({ data: null, error: null });
    const app = await buildSurveyApp({ surveys, userId: 'student-1' });
    await app.inject({ method: 'POST', url: '/api/survey', payload: validBody });
    expect(surveys.inserted).toEqual([{ user_id: 'student-1', ...validBody }]);
    await app.close();
  });

  it('reports failure when the insert fails', async () => {
    const app = await buildSurveyApp({
      surveys: mockQuery({ data: null, error: { code: '42501', message: 'denied' } }),
    });
    const res = await app.inject({ method: 'POST', url: '/api/survey', payload: validBody });
    expect(res.statusCode).toBe(503);
    await app.close();
  });

  it('reports failure when storage is not configured', async () => {
    const app = await buildSurveyApp({});
    const res = await app.inject({ method: 'POST', url: '/api/survey', payload: validBody });
    expect(res.statusCode).toBe(503);
    await app.close();
  });

  it('rejects unknown survey types', async () => {
    const app = await buildSurveyApp({ surveys: mockQuery({ data: null, error: null }) });
    const res = await app.inject({ method: 'POST', url: '/api/survey', payload: { type: 'spam', payload: {} } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects oversized payloads', async () => {
    const app = await buildSurveyApp({ surveys: mockQuery({ data: null, error: null }) });
    const res = await app.inject({
      method: 'POST',
      url: '/api/survey',
      payload: { type: 'feature_request', payload: { text: 'x'.repeat(5000) } },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
