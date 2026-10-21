import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { clampFinishedAt, examRoutes } from '../routes/exam.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const BP = '22222222-2222-4222-8222-222222222222';
const A1 = '44444444-4444-4444-8444-444444444444';
const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const question = { id: 'q1', type: 'mc', difficulty: 1, data: { stem: { vi: 'Câu?', en: 'Q?' }, options: [{ id: 'a' }, { id: 'b' }], answer: 'a', explanation: { vi: 'Vì.', en: 'Because.' } }, subject_id: 'subject-1' };
const started = { id: A1, user_id: 'student-1', blueprint_id: BP, metered: true, status: 'started', score: null, correct_count: null, total_questions: null, xp_earned: null, created_at: '2026-10-19T08:00:00.000Z' };

async function build(tables: Record<string, MockBuilder | MockBuilder[]>, user: object | null = student) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { if (user) (req as any).user = user; });
  await app.register(examRoutes);
  await app.ready();
  return app;
}
const pack = (app: Awaited<ReturnType<typeof build>>, id = BP) => app.inject({ method: 'GET', url: `/api/exam/${id}/offline` });

describe('GET /api/exam/:blueprintId/offline', () => {
  it('needs a session', async () => {
    const app = await build({}, null);
    expect((await pack(app)).statusCode).toBe(401);
    await app.close();
  });

  it('sends the exam with what grades it, the questions without it, and no-store', async () => {
    const app = await build({ exam_blueprints: ok({ id: BP }), questions: ok([question]) });
    const res = await pack(app);
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const body = res.json();
    expect(body.blueprint).toMatchObject({ id: BP });
    expect(body.questions[0].data).not.toHaveProperty('answer');
    expect(body.questions[0].data).not.toHaveProperty('explanation');
    expect(body.keys.q1).toEqual({ type: 'mc', data: question.data });
    expect(body).not.toHaveProperty('attempt_id');
    await app.close();
  });

  it('starts no attempt and touches no quota: saving an exam is free', async () => {
    rpcCalls.length = 0;
    // No exam_attempts table in the mock: reading or writing one would throw.
    const app = await build({ exam_blueprints: ok({ id: BP }), questions: ok([question]) });
    expect((await pack(app)).statusCode).toBe(200);
    expect(rpcCalls).toEqual([]);
    await app.close();
  });

  it('answers 404 for an exam that is not there or not the caller’s to see', async () => {
    const app = await build({ exam_blueprints: ok(null) });
    expect((await pack(app)).statusCode).toBe(404);
    await app.close();
  });

  it('is gone from the old per-attempt address', async () => {
    const app = await build({}, student);
    const res = await app.inject({ method: 'GET', url: `/api/exam/attempts/${A1}/offline` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe('clampFinishedAt', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  const created = '2026-10-19T08:00:00.000Z';
  it('keeps the time the device submitted', () => {
    expect(clampFinishedAt('2026-10-19T09:00:00.000Z', created, now).toISOString()).toBe('2026-10-19T09:00:00.000Z');
  });
  it('uses the server time when none was sent, it cannot be read, or it is in the future', () => {
    expect(clampFinishedAt(undefined, created, now)).toEqual(now);
    expect(clampFinishedAt('yesterday', created, now)).toEqual(now);
    expect(clampFinishedAt('2026-10-20T10:10:00.000Z', created, now)).toEqual(now);
  });
  it('never dates a submission before its attempt started', () => {
    expect(clampFinishedAt('2026-10-01T00:00:00.000Z', created, now).toISOString()).toBe(created);
  });
});

describe('submitting with the time it was finished offline', () => {
  it("stores yesterday's offline submission as yesterday, XP included", async () => {
    const update = ok([{ id: A1 }]);
    const xp = ok();
    const app = await build({
      exam_attempts: [ok(started), update],
      exam_blueprints: ok({ id: BP }),
      questions: ok([question]),
      xp_log: xp,
      'rpc:billing_settle_quota': ok(true),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: { blueprint_id: BP, attempt_id: A1, answers: [{ question_id: 'q1', selected_option: 'a' }], finished_at: '2026-10-19T09:30:00.000Z' },
    });
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ submitted_at: '2026-10-19T09:30:00.000Z' });
    expect(xp.inserted[0]).toMatchObject({ created_at: '2026-10-19T09:30:00.000Z' });
    await app.close();
  });
});
