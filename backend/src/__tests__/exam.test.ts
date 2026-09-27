import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { examRoutes } from '../routes/exam.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';
import { MAX_EXAM_ANSWERS, isCorrectAnswer } from '../routes/exam.js';

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

it('reports the exam service unavailable, with no XP, when there is no database', async () => {
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

  expect(res.statusCode).toBe(503);
  expect(res.json()).not.toHaveProperty('xp_earned');
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

  it('rejects a non-UUID blueprint id as not found, without XP', async () => {
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

    expect(res.statusCode).toBe(404);
    expect(xpLog.inserted).toEqual([]);
    await scoringApp.close();
  });

  it('rejects a blueprint that does not exist, without XP', async () => {
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

    expect(res.statusCode).toBe(404);
    expect(xpLog.inserted).toEqual([]);
    await scoringApp.close();
  });

  it('counts unanswered exam questions as wrong', async () => {
    const scoringApp = await buildScoringApp({
      questions: mockQuery({ data: [dbQuestion, { ...dbQuestion, id: 'q2' }], error: null }),
      exam_blueprints: mockQuery({ data: { id: BLUEPRINT_ID }, error: null }),
      xp_log: mockQuery({ data: null, error: null }),
    });

    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: { blueprint_id: BLUEPRINT_ID, answers: [{ question_id: 'q1', selected_option: 'a' }] },
    });

    expect(res.json()).toMatchObject({ score: 5, correct_count: 1, total_questions: 2 });
    await scoringApp.close();
  });

  it('ignores answers to questions outside the exam', async () => {
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
        answers: [
          { question_id: 'q1', selected_option: 'b' },
          ...Array.from({ length: 50 }, (_, i) => ({ question_id: `other-${i}`, selected_option: 'a' })),
        ],
      },
    });

    expect(res.json()).toMatchObject({ score: 0, correct_count: 0, total_questions: 1, xp_earned: 0 });
    expect(xpLog.inserted).toEqual([]);
    await scoringApp.close();
  });

  it('draws the exam from the blueprint subject', async () => {
    const questions = mockQuery({ data: [dbQuestion], error: null });
    const scoringApp = await buildScoringApp({
      questions,
      exam_blueprints: mockQuery({
        data: { id: BLUEPRINT_ID, name: 'Đề 1', grade: 11, subject_id: 'subject-1', sections: [{ count: 1 }], subjects: null },
        error: null,
      }),
    });

    const res = await scoringApp.inject({ method: 'GET', url: `/api/exam/${BLUEPRINT_ID}/questions` });

    expect(res.statusCode).toBe(200);
    expect(questions.eqCalls).toContainEqual(['subject_id', 'subject-1']);
    expect(res.body).not.toContain('"answer"');
    await scoringApp.close();
  });

  it('answers a non-UUID blueprint id with 404 instead of a database error', async () => {
    const scoringApp = await buildScoringApp({});
    const res = await scoringApp.inject({ method: 'GET', url: '/api/exam/not-a-uuid/questions' });
    expect(res.statusCode).toBe(404);
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

describe('isCorrectAnswer', () => {
  it('checks short answers ignoring case, spacing and blank input', () => {
    const q = { type: 'short', data: { answer: 'Thuật toán' } };
    expect(isCorrectAnswer(q, { question_id: 'q', short_answer: '  thuật   TOÁN ' })).toBe(true);
    expect(isCorrectAnswer(q, { question_id: 'q', short_answer: 'thuật' })).toBe(false);
    expect(isCorrectAnswer({ type: 'short', data: { answer: '' } }, { question_id: 'q', short_answer: ' ' })).toBe(false);
  });

  it('needs every true/false item right and never passes an empty key', () => {
    const q = { type: 'truefalse', data: { items: [{ id: 'a', correct: true }, { id: 'b', correct: false }] } };
    expect(isCorrectAnswer(q, { question_id: 'q', items: [{ id: 'a', selected: true }, { id: 'b', selected: false }] })).toBe(true);
    expect(isCorrectAnswer(q, { question_id: 'q', items: [{ id: 'a', selected: true }] })).toBe(false);
    expect(isCorrectAnswer({ type: 'truefalse', data: { items: [] } }, { question_id: 'q', items: [] })).toBe(false);
  });
});

describe('imported exams', () => {
  it('serves exactly the listed questions in order and hides explanations', async () => {
    const app = Fastify();
    app.decorate('supabase', mockSupabase({
      exam_blueprints: mockQuery({
        data: { id: BLUEPRINT_ID, name: 'Đề', sections: [], question_ids: ['q2', 'q1'], duration_minutes: 30, subjects: null },
        error: null,
      }),
      questions: mockQuery({
        data: [
          { id: 'q1', subject_id: 's', type: 'mc', difficulty: 1, data: { stem: 'x', answer: 'a', explanation: 'vì a' } },
          { id: 'q2', subject_id: 's', type: 'short', difficulty: 2, data: { stem: 'y', answer: '42', rubric: 'r' } },
        ],
        error: null,
      }),
    }));
    await app.register(examRoutes);
    await app.ready();
    const res = await app.inject({ method: 'GET', url: `/api/exam/${BLUEPRINT_ID}/questions` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.questions.map((q: { id: string }) => q.id)).toEqual(['q2', 'q1']);
    expect(body.blueprint).toMatchObject({ question_count: 2, duration_minutes: 30 });
    expect(res.body).not.toMatch(/answer|explanation|rubric/);
    await app.close();
  });
});

describe('exams waiting for review', () => {
  it('stay out of the exam room until an admin publishes them', async () => {
    const app = Fastify();
    app.decorate('supabase', mockSupabase({
      exam_blueprints: [
        mockQuery({ data: [{ id: 'a', name: 'Công khai', sections: [], subjects: null }, { id: 'b', name: 'Chờ duyệt', status: 'pending_review', sections: [], subjects: null }], error: null }),
        mockQuery({ data: { id: BLUEPRINT_ID, name: 'Chờ duyệt', status: 'pending_review', sections: [], subjects: null }, error: null }),
      ],
    }));
    await app.register(examRoutes);
    await app.ready();
    const list = await app.inject({ method: 'GET', url: '/api/exam/blueprints' });
    expect(list.json().blueprints.map((b: { name: string }) => b.name)).toEqual(['Công khai']);
    expect((await app.inject({ method: 'GET', url: `/api/exam/${BLUEPRINT_ID}/questions` })).statusCode).toBe(404);
    await app.close();
  });

  it('draws the subject pool from published questions, and still works before the migration', async () => {
    const blueprint = { id: BLUEPRINT_ID, name: 'Đề', sections: [{ count: 1 }], subject_id: 's1', subjects: null };
    const filtered = mockQuery({ data: [{ id: 'q1', subject_id: 's1', type: 'mc', difficulty: 1, data: {} }], error: null });
    const app = Fastify();
    app.decorate('supabase', mockSupabase({ exam_blueprints: mockQuery({ data: blueprint, error: null }), questions: filtered }));
    await app.register(examRoutes);
    await app.ready();
    expect((await app.inject({ method: 'GET', url: `/api/exam/${BLUEPRINT_ID}/questions` })).statusCode).toBe(200);
    expect(filtered.eqCalls).toContainEqual(['status', 'published']);
    await app.close();

    const legacy = Fastify();
    legacy.decorate('supabase', mockSupabase({
      exam_blueprints: mockQuery({ data: blueprint, error: null }),
      questions: [
        mockQuery({ data: null, error: { code: '42703', message: 'column questions.status does not exist' } }),
        mockQuery({ data: [{ id: 'q1', subject_id: 's1', type: 'mc', difficulty: 1, data: {} }], error: null }),
      ],
    }));
    await legacy.register(examRoutes);
    await legacy.ready();
    const res = await legacy.inject({ method: 'GET', url: `/api/exam/${BLUEPRINT_ID}/questions` });
    expect(res.statusCode).toBe(200);
    expect(res.json().questions).toHaveLength(1);
    await legacy.close();
  });
});
