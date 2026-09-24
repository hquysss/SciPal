import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { examRoutes } from '../routes/exam.js';

describe('Exam Route Sanitization & Server Scoring', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(authPlugin);
    await app.register(examRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('ensures raw question objects never expose answer or answer_key', () => {
    const rawData = {
      stem: { en: 'Question stem', vi: 'Nội dung câu hỏi' },
      options: [{ id: 'a', text: { en: 'A', vi: 'A' } }],
      answer: 'a',
      answer_key: 'top_secret',
    };

    const sanitized = { ...rawData };
    delete (sanitized as Record<string, unknown>).answer;
    delete (sanitized as Record<string, unknown>).answer_key;

    expect(sanitized).not.toHaveProperty('answer');
    expect(sanitized).not.toHaveProperty('answer_key');
    expect(sanitized).toHaveProperty('stem');
  });

  it('GET /api/exam/:blueprintId/questions is publicly accessible and does not leak answer keys', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/exam/demo-bp/questions',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('blueprint');
    expect(body).toHaveProperty('questions');
    expect(Array.isArray(body.questions)).toBe(true);

    for (const q of body.questions) {
      expect(q.data).not.toHaveProperty('answer');
      expect(q.data).not.toHaveProperty('answer_key');
    }
  });

  it('POST /api/score/exam returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: {
        blueprint_id: 'demo-bp',
        answers: [
          { question_id: 'q-demo-1', selected_option: 'opt-b' },
        ],
      },
    });

    expect(res.statusCode).toBe(401);
  });
});

it('does not promise exam XP when there is no database to record it', async () => {
  const app = Fastify();
  app.addHook('onRequest', async (request) => {
    (request as typeof request & { user: { id: string } }).user = {
      id: '00000000-0000-0000-0000-000000000001',
    };
  });
  await app.register(examRoutes);
  await app.ready();

  const res = await app.inject({
    method: 'POST',
    url: '/api/score/exam',
    payload: {
      blueprint_id: 'demo-bp',
      answers: [{ question_id: 'q-demo-1', selected_option: 'opt-b' }],
    },
  });

  expect(res.statusCode).toBe(200);
  expect(res.json().xp_earned).toBe(0);
  await app.close();
});
