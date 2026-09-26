// backend/src/__tests__/exam-blueprints.test.ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { examRoutes } from '../routes/exam.js';
import { countBlueprintQuestions } from '../exam/blueprintSummary.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const BP = '22222222-2222-4222-8222-222222222222';
const row = {
  id: BP, name: 'Tin học 11 — Giữa kì', grade: 11, subject_id: 's1',
  sections: [{ count: 10, type: 'mc' }, { count: 5 }, { note: 'x' }],
  subjects: { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học' },
};

async function buildApp(tables: Parameters<typeof mockSupabase>[0] | null) {
  const app = Fastify();
  if (tables) app.decorate('supabase', mockSupabase(tables));
  await app.register(examRoutes);
  await app.ready();
  return app;
}

describe('countBlueprintQuestions', () => {
  it('sums section counts and ignores malformed entries', () => {
    expect(countBlueprintQuestions(row.sections)).toBe(15);
    expect(countBlueprintQuestions([{ count: -1 }, { count: 2.5 }, null])).toBe(0);
    expect(countBlueprintQuestions({ count: 3 })).toBe(0);
  });
});

describe('GET /api/exam/blueprints', () => {
  it('lists summaries without sections', async () => {
    const app = await buildApp({ exam_blueprints: mockQuery({ data: [row], error: null }) });
    const res = await app.inject({ method: 'GET', url: '/api/exam/blueprints' });
    expect(res.statusCode).toBe(200);
    expect(res.json().blueprints).toEqual([{
      id: BP, name: 'Tin học 11 — Giữa kì', grade: 11, subject_id: 's1', subject_slug: 'informatics',
      subject_name_en: 'Informatics', subject_name_vi: 'Tin học', question_count: 15,
    }]);
    expect(res.body).not.toContain('sections');
    await app.close();
  });

  it('returns an empty list when there are no exams', async () => {
    const app = await buildApp({ exam_blueprints: mockQuery({ data: [], error: null }) });
    const res = await app.inject({ method: 'GET', url: '/api/exam/blueprints' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ blueprints: [] });
    await app.close();
  });

  it('reports database errors as 500', async () => {
    const app = await buildApp({ exam_blueprints: mockQuery({ data: null, error: { message: 'down' } }) });
    expect((await app.inject({ method: 'GET', url: '/api/exam/blueprints' })).statusCode).toBe(500);
    await app.close();
  });
});

describe('exam routes without demo content', () => {
  it('404s for an unknown blueprint and never serves demo questions', async () => {
    const app = await buildApp({
      exam_blueprints: mockQuery({ data: null, error: null }),
      questions: mockQuery({ data: [], error: null }),
    });
    const res = await app.inject({ method: 'GET', url: `/api/exam/${BP}/questions` });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('q-demo');
    await app.close();
  });

  it('503s when no database is configured', async () => {
    const app = await buildApp(null);
    expect((await app.inject({ method: 'GET', url: `/api/exam/${BP}/questions` })).statusCode).toBe(503);
    await app.close();
  });

  it('does not score demo question ids as correct', async () => {
    const app = Fastify();
    app.decorate('supabase', mockSupabase({
      questions: mockQuery({ data: [], error: null }),
      exam_blueprints: mockQuery({ data: null, error: null }),
    }));
    app.addHook('onRequest', async (request) => { (request as any).user = { id: 'student-1' }; });
    await app.register(examRoutes);
    await app.ready();
    const res = await app.inject({
      method: 'POST', url: '/api/score/exam',
      payload: { blueprint_id: BP, answers: [{ question_id: 'q-demo-1', selected_option: 'opt-b' }] },
    });
    expect(res.json()).toMatchObject({ correct_count: 0 });
    await app.close();
  });
});
