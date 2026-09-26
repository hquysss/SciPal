import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { examRoutes } from '../routes/exam.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';
import { MAX_EXAM_ANSWERS } from '../routes/exam.js';

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

    // Public route (not 401); without a database it reports 503 instead of serving demo questions.
    expect(res.statusCode).toBe(503);
    expect(res.body).not.toContain('q-demo');
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

async function buildScoringApp(tables: Parameters<typeof mockSupabase>[0]) {
  const scoringApp = Fastify();
  scoringApp.decorate('supabase', mockSupabase(tables));
  scoringApp.addHook('onRequest', async (request) => {
    (request as typeof request & { user: { id: string } }).user = { id: 'student-1' };
  });
  await scoringApp.register(examRoutes);
  await scoringApp.ready();
  return scoringApp;
}

const dbQuestion = { id: 'q1', type: 'mc', data: { answer: 'a' }, subject_id: 'subject-1' };
const BLUEPRINT_ID = '22222222-2222-4222-8222-222222222222';

describe('POST /api/score/exam integrity', () => {
  it('counts a repeated question only once', async () => {
    const xpLog = mockQuery({ data: null, error: null });
    const scoringApp = await buildScoringApp({
      questions: mockQuery({ data: [dbQuestion], error: null }),
      exam_blueprints: mockQuery({ data: { id: BLUEPRINT_ID }, error: null }),
      xp_log: xpLog,
    });

    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: {
        blueprint_id: BLUEPRINT_ID,
        answers: Array.from({ length: 5 }, () => ({ question_id: 'q1', selected_option: 'a' })),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ correct_count: 1, total_questions: 1, xp_earned: 15, already_awarded: false });
    expect(xpLog.inserted).toEqual([
      { user_id: 'student-1', subject_id: 'subject-1', delta: 15, reason: `exam_complete:${BLUEPRINT_ID.toLowerCase()}` },
    ]);
    await scoringApp.close();
  });

  it('treats unique violation as already awarded', async () => {
    const scoringApp = await buildScoringApp({
      questions: mockQuery({ data: [dbQuestion], error: null }),
      exam_blueprints: mockQuery({ data: { id: BLUEPRINT_ID }, error: null }),
      xp_log: mockQuery({ data: null, error: { code: '23505', message: 'duplicate key' } }),
    });

    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: { blueprint_id: BLUEPRINT_ID, answers: [{ question_id: 'q1', selected_option: 'a' }] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ correct_count: 1, xp_earned: 0, already_awarded: true });
    await scoringApp.close();
  });

  it('does not award XP for a non-UUID blueprint id', async () => {
    const xpLog = mockQuery({ data: null, error: null });
    const scoringApp = await buildScoringApp({
      questions: mockQuery({ data: [dbQuestion], error: null }),
      xp_log: xpLog,
    });

    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: {
        blueprint_id: 'bp-1',
        answers: [{ question_id: 'q1', selected_option: 'a' }],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ correct_count: 1, xp_earned: 0, already_awarded: false });
    expect(xpLog.inserted).toEqual([]);
    await scoringApp.close();
  });

  it('does not award XP for a blueprint that does not exist', async () => {
    const xpLog = mockQuery({ data: null, error: null });
    const scoringApp = await buildScoringApp({
      questions: mockQuery({ data: [dbQuestion], error: null }),
      exam_blueprints: mockQuery({ data: null, error: null }),
      xp_log: xpLog,
    });

    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: {
        blueprint_id: BLUEPRINT_ID,
        answers: [{ question_id: 'q1', selected_option: 'a' }],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ xp_earned: 0, already_awarded: false });
    expect(xpLog.inserted).toEqual([]);
    await scoringApp.close();
  });

  it('rejects submissions without a blueprint_id', async () => {
    const scoringApp = await buildScoringApp({});
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: { answers: [{ question_id: 'q1', selected_option: 'a' }] },
    });
    expect(res.statusCode).toBe(400);
    await scoringApp.close();
  });

  it('rejects oversized answer arrays', async () => {
    const scoringApp = await buildScoringApp({});
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: {
        blueprint_id: 'bp-1',
        answers: Array.from({ length: MAX_EXAM_ANSWERS + 1 }, (_, i) => ({ question_id: `q${i}` })),
      },
    });
    expect(res.statusCode).toBe(400);
    await scoringApp.close();
  });
});
