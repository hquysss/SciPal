import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';

describe('authPlugin', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(authPlugin);
    app.get('/protected', async () => ({ ok: true }));
    app.get('/health', async () => ({ status: 'ok' }));
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
});
