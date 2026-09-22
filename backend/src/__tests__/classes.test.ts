import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import crypto from 'crypto';
import { authPlugin } from '../plugins/auth.js';
import { classRoutes } from '../routes/classes.js';

describe('Class Routes & Invite Code Generation', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(authPlugin);
    await app.register(classRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('generates cryptographically secure 6-character hex invite code', () => {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    expect(code).toMatch(/^[0-9A-F]{6}$/);
  });

  it('POST /api/classes returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/classes',
      payload: { name: '10A1', subject_id: 'informatics' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/classes/join returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/classes/join',
      payload: { invite_code: 'A1B2C3' },
    });
    expect(res.statusCode).toBe(401);
  });
});
