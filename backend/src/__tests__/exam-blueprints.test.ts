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
      subject_name_en: 'Informatics', subject_name_vi: 'Tin học', question_count: 15, name_en: null, duration_minutes: null, format: 'generic', layout: null,
    }]);
    expect(res.body).not.toContain('sections');
    await app.close();
  });

  it('keeps the format but never sends the layout or a passage in the list', async () => {
    const layoutRow = {
      ...row, format: 'thptqg', question_ids: ['11111111-1111-4111-8111-111111111111'],
      layout: [{
        key: 'mc', title: { vi: 'Phần I', en: 'Part I' }, kind: 'mc', count: 1, max_points: 10,
        groups: [{ passage: { vi: 'ĐOẠN-VĂN-BÍ-MẬT', en: 'SECRET-PASSAGE' }, question_ids: ['11111111-1111-4111-8111-111111111111'] }],
      }],
    };
    const app = await buildApp({ exam_blueprints: mockQuery({ data: [layoutRow], error: null }) });
    const res = await app.inject({ method: 'GET', url: '/api/exam/blueprints' });
    expect(res.json().blueprints[0]).toMatchObject({ format: 'thptqg', layout: null });
    expect(res.body).not.toContain('ĐOẠN-VĂN-BÍ-MẬT');
    expect(res.body).not.toContain('SECRET-PASSAGE');
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

describe('exams of an archived subject', () => {
  const archived = { ...row, id: '33333333-3333-4333-8333-333333333333', subjects: { ...row.subjects, archived_at: '2026-10-05T01:00:00.000Z' } };
  const live = { ...row, subjects: { ...row.subjects, archived_at: null } };

  it('leaves them out of the public list, reading archived_at with the subject', async () => {
    const list = mockQuery({ data: [archived, live], error: null });
    const app = await buildApp({ exam_blueprints: list });
    const res = await app.inject({ method: 'GET', url: '/api/exam/blueprints' });
    expect(res.statusCode).toBe(200);
    expect(res.json().blueprints.map((b: { id: string }) => b.id)).toEqual([BP]);
    expect(res.json().blueprints[0]).not.toHaveProperty('archived_at');
    expect(String(list.selectArgs[0]?.[0])).toContain('archived_at');
    await app.close();
  });

  it('answers 404 for their questions, as for a missing exam', async () => {
    const app = await buildApp({ exam_blueprints: mockQuery({ data: archived, error: null }), questions: mockQuery({ data: [], error: null }) });
    const res = await app.inject({ method: 'GET', url: `/api/exam/${archived.id}/questions` });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Không tìm thấy đề thi.' });
    await app.close();
  });

  it('still lists every exam on a database without subjects.archived_at (42703)', async () => {
    const missing = mockQuery({ data: null, error: { code: '42703', message: 'column subjects_1.archived_at does not exist' } });
    const legacy = mockQuery({ data: [row], error: null });
    const app = await buildApp({ exam_blueprints: [missing, legacy] });
    const res = await app.inject({ method: 'GET', url: '/api/exam/blueprints' });
    expect(res.statusCode).toBe(200);
    expect(res.json().blueprints.map((b: { id: string }) => b.id)).toEqual([BP]);
    expect(String(legacy.selectArgs[0]?.[0])).not.toContain('archived_at');
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
      exam_blueprints: mockQuery({ data: { id: BP }, error: null }),
      exam_attempts: [mockQuery({ data: { id: '44444444-4444-4444-8444-444444444444', user_id: 'student-1', blueprint_id: BP, metered: false, status: 'started', score: null, correct_count: null, total_questions: null, xp_earned: null }, error: null }), mockQuery({ data: [{ id: '44444444-4444-4444-8444-444444444444' }], error: null })],
    }));
    app.addHook('onRequest', async (request) => { (request as any).user = { id: 'student-1' }; });
    await app.register(examRoutes);
    await app.ready();
    const res = await app.inject({
      method: 'POST', url: '/api/score/exam',
      payload: { blueprint_id: BP, attempt_id: '44444444-4444-4444-8444-444444444444', answers: [{ question_id: 'q-demo-1', selected_option: 'opt-b' }] },
    });
    expect(res.json()).toMatchObject({ correct_count: 0 });
    await app.close();
  });
});
