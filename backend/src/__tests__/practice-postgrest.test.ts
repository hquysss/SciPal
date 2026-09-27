import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { practiceRoutes } from '../routes/practice.js';
import { questionRoutes } from '../routes/questions.js';

// The mock builder never serializes filters. These tests use the real supabase-js client with a
// stub fetch, so they see the exact PostgREST request (a jsonb `cs.` filter must be JSON).

const Q = '33333333-3333-4333-8333-333333333333';
const row = {
  id: Q,
  usage: 'practice',
  status: 'published',
  subject_id: '11111111-1111-4111-8111-111111111111',
  lesson_id: '22222222-2222-4222-8222-222222222222',
  created_by: 'teacher-1',
  created_at: '',
  grade: null,
  type: 'mc',
  difficulty: 1,
  data: { stem: { vi: 'C', en: 'Q' }, options: [{ id: 'a', text: { vi: 'A', en: 'A' } }, { id: 'b', text: { vi: 'B', en: 'B' } }], answer: 'a' },
};

function realClient(rows: Record<string, unknown>) {
  const urls: string[] = [];
  const client = createClient('https://proj.supabase.co', 'service-key', {
    global: {
      fetch: async (input, init) => {
        const url = decodeURIComponent(String(input));
        urls.push(`${init?.method ?? 'GET'} ${url}`);
        const table = new URL(String(input)).pathname.split('/').pop()!;
        const body = rows[table] ?? [];
        const single = String((init?.headers as Record<string, string> | Headers | undefined) instanceof Headers ? (init!.headers as Headers).get('Accept') : (init?.headers as Record<string, string> | undefined)?.Accept ?? '').includes('object');
        return new Response(JSON.stringify(single && Array.isArray(body) ? body[0] ?? null : body), { status: 200, headers: { 'content-type': 'application/json' } });
      },
    },
  });
  return { client, urls };
}

async function build(routes: typeof practiceRoutes, client: ReturnType<typeof createClient>, user?: object) {
  const app = Fastify();
  app.decorate('supabase', client);
  if (user) app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(routes);
  await app.ready();
  return app;
}

describe('jsonb containment filters reach PostgREST as JSON', () => {
  it('finds the published lesson of a practice question when a learner checks it', async () => {
    const { client, urls } = realClient({ questions: [row], lessons: [{ id: row.lesson_id }] });
    const app = await build(practiceRoutes, client);
    const res = await app.inject({ method: 'POST', url: '/api/practice/check', payload: { question_id: Q, response: { selected_option: 'a' } } });
    expect(res.statusCode).toBe(200);
    const lessonQuery = urls.find((u) => u.includes('/rest/v1/lessons'))!;
    expect(lessonQuery).toContain(`blocks=cs.[{"type":"quiz","question_id":"${Q}"}]`);
    await app.close();
  });

  it('checks lessons using a question before deleting it', async () => {
    const { client, urls } = realClient({ questions: [{ ...row, status: 'draft' }], lessons: [], exam_blueprints: [] });
    const app = await build(questionRoutes, client, { id: 'teacher-1', app_metadata: { app_role: 'teacher' } });
    await app.inject({ method: 'DELETE', url: `/api/authoring/questions/${Q}` });
    const lessonQuery = urls.find((u) => u.includes('/rest/v1/lessons'))!;
    expect(lessonQuery).toContain(`blocks=cs.[{"type":"quiz","question_id":"${Q}"}]`);
    expect(urls.find((u) => u.includes('/rest/v1/exam_blueprints'))).toContain(`question_ids=cs.{${Q}}`);
    await app.close();
  });
});
