import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { authoringRoutes } from '../routes/authoring.js';

describe('Authoring Routes', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(authPlugin);
    await app.register(authoringRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('PATCH /api/authoring/lessons/:id returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/authoring/lessons/test-lesson-id',
      payload: {
        title_vi: 'Lý thuyết thuật toán mới',
        published: true,
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
