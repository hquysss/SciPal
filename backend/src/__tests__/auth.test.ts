import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';

describe('authPlugin', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(authPlugin);
    app.get('/protected', async () => ({ ok: true }));
    app.get('/health', async () => ({ status: 'ok' }));
    app.post('/api/survey', async (request) => ({ user: (request as any).user ?? null }));
    await app.ready();
  });

  afterAll(() => app.close());

  it('GET /health is accessible without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });

  it('returns 401 when Authorization header is missing on protected route', async () => {
    const res = await app.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for a malformed token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { Authorization: 'Bearer not-a-jwt' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('lets a public path through with an invalid token, without a user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/survey',
      headers: { Authorization: 'Bearer expired-or-garbage' },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: null });
  });

  it('opens only the plan catalog of billing to visitors', async () => {
    const billing = Fastify();
    await billing.register(authPlugin);
    billing.get('/api/billing/plans', async () => ({ ok: true }));
    billing.get('/api/billing/me', async () => ({ ok: true }));
    billing.post('/api/billing/webhooks/payos', async () => ({ ok: true }));
    billing.post('/api/billing/webhooks/momo', async () => ({ ok: true }));
    billing.get('/api/internal/billing/renewals/run', async () => ({ ok: true }));
    billing.post('/api/billing/renewal/cancel', async () => ({ ok: true }));
    billing.post('/api/billing/checkout', async () => ({ ok: true }));
    await billing.ready();
    expect((await billing.inject({ method: 'GET', url: '/api/billing/plans' })).statusCode).toBe(200);
    expect((await billing.inject({ method: 'GET', url: '/api/billing/me' })).statusCode).toBe(401);
    expect((await billing.inject({ method: 'POST', url: '/api/billing/webhooks/payos', payload: {} })).statusCode).toBe(200);
    expect((await billing.inject({ method: 'POST', url: '/api/billing/webhooks/momo', payload: {} })).statusCode).toBe(200);
    expect((await billing.inject({ method: 'GET', url: '/api/internal/billing/renewals/run' })).statusCode).toBe(200);
    expect((await billing.inject({ method: 'POST', url: '/api/billing/renewal/cancel', payload: {} })).statusCode).toBe(401);
    expect((await billing.inject({ method: 'POST', url: '/api/billing/checkout', payload: {} })).statusCode).toBe(401);
    await billing.close();
  });

  it('closes the exam and practice routes to visitors, and leaves the other public ones open', async () => {
    const api = Fastify();
    await api.register(authPlugin);
    const closed: Array<['get' | 'post', string]> = [
      ['get', '/api/exam/blueprints'],
      ['get', '/api/exam/:blueprintId/questions'],
      ['get', '/api/exam/hsg/problems'],
      ['get', '/api/exam/attempts/:attemptId/offline'],
      ['get', '/api/practice/lessons/:lessonId/questions'],
      ['get', '/api/practice/lessons/:lessonId/offline'],
      ['post', '/api/practice/check'],
      ['post', '/api/practice/sync'],
      ['post', '/api/score/exam'],
    ];
    const open: Array<['get' | 'post', string]> = [
      ['post', '/api/dictionary/lookup'],
      ['get', '/api/lessons/:id/video'],
      ['get', '/api/billing/plans'],
      ['post', '/api/survey/website'],
      ['post', '/api/problem-reports'],
      ['get', '/health'],
    ];
    for (const [method, path] of [...closed, ...open]) api[method](path, async () => ({ ok: true }));
    await api.ready();
    const call = (method: 'get' | 'post', path: string) => api.inject({ method: method.toUpperCase() as 'GET' | 'POST', url: path.replace(/:w+/g, 'x'), ...(method === 'post' ? { payload: {} } : {}) });
    for (const [method, path] of closed) expect((await call(method, path)).statusCode, path).toBe(401);
    for (const [method, path] of open) expect((await call(method, path)).statusCode, path).toBe(200);
    await api.close();
  });
});
