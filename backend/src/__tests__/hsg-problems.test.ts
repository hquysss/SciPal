import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { hsgProblemRoutes } from '../routes/hsgProblems.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const subject = { id: 'sub-1', slug: 'informatics', name_vi: 'Tin học', name_en: 'Informatics', accent_color: '#0ea5e9', archived_at: null };
const problem = (id: string, order?: number) => ({
  id,
  type: 'code',
  difficulty: 2,
  data: {
    track: 'hsg',
    ...(order !== undefined ? { order } : {}),
    stem: { vi: `Bài ${id}. Đề`, en: `Problem ${id}. Text` },
    input_spec: { vi: 'n', en: 'n' },
    output_spec: { vi: 'k', en: 'k' },
    time_limit_ms: 1000,
    memory_limit_mb: 256,
    explanation: { vi: 'SECRET-EXPLANATION', en: 'SECRET-EXPLANATION' },
    tests: [
      { input: '30\n', expected: '6\n', sample: true, points: 1 },
      { input: '1000\n', expected: 'HIDDEN-EXPECTED-7\n', sample: false, points: 1 },
    ],
  },
});

async function build(tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  await app.register(hsgProblemRoutes).ready();
  return app;
}

describe('GET /api/exam/hsg/problems', () => {
  it('lists published hsg programming problems of the subject without hidden tests or explanations', async () => {
    const questions = mockQuery({ data: [problem('b', 2), problem('a', 1)], error: null });
    const app = await build({ subjects: mockQuery({ data: subject, error: null }), questions });
    const res = await app.inject({ method: 'GET', url: '/api/exam/hsg/problems?subject=informatics' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.subject).toEqual({ slug: 'informatics', name_vi: 'Tin học', name_en: 'Informatics', accent_color: '#0ea5e9' });
    expect(body.questions.map((q: { id: string }) => q.id)).toEqual(['a', 'b']);
    expect(body.questions[0].data.samples).toEqual([{ input: '30\n', expected: '6\n' }]);
    expect(res.body).not.toContain('HIDDEN-EXPECTED-7');
    expect(res.body).not.toContain('SECRET-EXPLANATION');
    expect(questions.eqCalls).toEqual(
      expect.arrayContaining([['type', 'code'], ['usage', 'practice'], ['status', 'published'], ['data->>track', 'hsg'], ['subject_id', 'sub-1']]),
    );
  });

  it('needs a subject and hides an archived one', async () => {
    const app = await build({ subjects: mockQuery({ data: { ...subject, archived_at: '2026-01-01' }, error: null }), questions: mockQuery({ data: [], error: null }) });
    expect((await app.inject({ method: 'GET', url: '/api/exam/hsg/problems' })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: '/api/exam/hsg/problems?subject=informatics' })).statusCode).toBe(404);
  });
});
