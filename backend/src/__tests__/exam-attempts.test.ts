import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { examRoutes } from '../routes/exam.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const BP = '22222222-2222-4222-8222-222222222222';
const A1 = '44444444-4444-4444-8444-444444444444';
const student = { id: 'student-1', app_metadata: {} };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const refused = (message: string, code = 'P0001') => mockQuery({ data: null, error: { code, message } });
const hold = (remaining: number) => ok({ operation_id: A1, state: 'reserved', kind: 'monthly', remaining, resets_at: '2026-09-30T17:00:00+00:00' });
const question = { id: 'q1', type: 'mc', data: { answer: 'a' }, subject_id: 'subject-1' };
const started = { id: A1, user_id: 'student-1', blueprint_id: BP, metered: true, status: 'started', score: null, correct_count: null, total_questions: null, xp_earned: null };

async function build(tables: Record<string, MockBuilder | MockBuilder[]>, user: object | null = student) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { if (user) (req as any).user = user; });
  await app.register(examRoutes);
  await app.ready();
  return app;
}
const start = (app: Awaited<ReturnType<typeof build>>, body: Record<string, unknown> = {}) =>
  app.inject({ method: 'POST', url: `/api/exam/${BP}/attempts`, payload: body });
const submit = (app: Awaited<ReturnType<typeof build>>, attempt = A1) =>
  app.inject({ method: 'POST', url: '/api/score/exam', payload: { blueprint_id: BP, attempt_id: attempt, answers: [{ question_id: 'q1', selected_option: 'a' }] } });
const names = () => rpcCalls.map(([name, args]) => [name, (args as { p_outcome?: string }).p_outcome].filter(Boolean).join(':'));

beforeEach(() => { rpcCalls.length = 0; });

describe('starting a graded exam attempt', () => {
  it('needs a signed-in account even though exam paths are public', async () => {
    const app = await build({}, null);
    const res = await start(app);
    expect(res.statusCode).toBe(401);
    expect(res.json().error_en).toEqual(expect.any(String));
    await app.close();
  });

  it('holds one monthly attempt for a student and stores the attempt', async () => {
    const insert = ok();
    const app = await build({ exam_blueprints: ok({ id: BP }), exam_attempts: [ok(null), insert], 'rpc:billing_reserve_quota': hold(2) });
    const res = await start(app, { attempt_id: A1 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ attempt_id: A1, status: 'started', remaining: 2, period: 'month' });
    expect(insert.inserted[0]).toMatchObject({ id: A1, user_id: 'student-1', blueprint_id: BP, metered: true });
    expect(rpcCalls[0]).toEqual(['billing_reserve_quota', expect.objectContaining({ p_user_id: 'student-1', p_metric: 'graded_exam_attempts', p_operation_id: A1, p_units: 1 })]);
    await app.close();
  });

  it('answers 404 for an exam whose subject is archived, without holding an attempt', async () => {
    const insert = ok();
    const app = await build({
      exam_blueprints: ok({ id: BP, subjects: { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', archived_at: '2026-10-05T01:00:00.000Z' } }),
      exam_attempts: [ok(null), insert],
      'rpc:billing_reserve_quota': hold(2),
    });
    const res = await start(app, { attempt_id: A1 });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Không tìm thấy đề thi.', error_en: 'Exam not found.' });
    expect(rpcCalls).toHaveLength(0);
    expect(insert.inserted).toHaveLength(0);
    await app.close();
  });

  it('resumes the same attempt after a reload without holding another', async () => {
    const app = await build({ exam_blueprints: ok({ id: BP }), exam_attempts: ok(started) });
    const res = await start(app, { attempt_id: A1 });
    expect(res.json()).toEqual({ attempt_id: A1, status: 'started', remaining: null, period: null });
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('refuses the fourth attempt of the month with the limit and the reset time', async () => {
    const app = await build({
      exam_blueprints: ok({ id: BP }),
      exam_attempts: ok(null),
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([{ metric: 'graded_exam_attempts', kind: 'monthly', quota_limit: 3, used: 3, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-09-30T17:00:00+00:00' }]),
    });
    const res = await start(app);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: 'QUOTA_EXCEEDED', limit: 3, resetsAt: '2026-09-30T17:00:00.000Z' });
    expect(res.json().error).toContain('3 lượt thi');
    await app.close();
  });

  it('does not meter teachers and does not start when the quota cannot be checked', async () => {
    const insert = ok();
    const teacherApp = await build({ exam_blueprints: ok({ id: BP }), exam_attempts: [ok(null), insert] }, teacher);
    const res = await start(teacherApp);
    expect(res.statusCode).toBe(200);
    expect(res.json().remaining).toBeNull();
    expect(insert.inserted[0]).toMatchObject({ metered: false });
    expect(rpcCalls).toHaveLength(0);
    await teacherApp.close();

    const down = await build({ exam_blueprints: ok({ id: BP }), exam_attempts: ok(null), 'rpc:billing_reserve_quota': refused('connection lost', '08006') });
    expect((await start(down)).statusCode).toBe(503);
    await down.close();
  });

  it('gives the attempt back when it cannot be stored, and 404s an unknown exam', async () => {
    const app = await build({
      exam_blueprints: ok({ id: BP }),
      exam_attempts: [ok(null), mockQuery({ data: null, error: { message: 'db down' } })],
      'rpc:billing_reserve_quota': hold(2),
      'rpc:billing_settle_quota': ok(true),
    });
    expect((await start(app)).statusCode).toBe(500);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
    await app.close();
    const missing = await build({ exam_attempts: ok(null), exam_blueprints: ok(null) });
    expect((await start(missing)).statusCode).toBe(404);
    await missing.close();
  });
});

describe('submitting a graded exam attempt', () => {
  it('scores, stores the result once and counts the attempt', async () => {
    const update = ok([{ id: A1 }]);
    const app = await build({
      exam_attempts: [ok(started), update],
      exam_blueprints: ok({ id: BP }),
      questions: ok([question]),
      xp_log: ok(),
      'rpc:billing_settle_quota': ok(true),
    });
    const res = await submit(app);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ score: 10, correct_count: 1, total_questions: 1, xp_earned: 15 });
    expect(update.updated[0]).toMatchObject({ status: 'submitted', score: 10, correct_count: 1, total_questions: 1, xp_earned: 15 });
    expect(update.eqCalls).toEqual(expect.arrayContaining([['id', A1], ['status', 'started']]));
    expect(names()).toEqual(['billing_settle_quota:commit']);
    await app.close();
  });

  it('answers the stored result for a second submit: no new score, no XP, no charge', async () => {
    const xp = ok();
    const app = await build({
      exam_attempts: ok({ ...started, status: 'submitted', score: 8, correct_count: 4, total_questions: 5, xp_earned: 60 }),
      xp_log: xp,
    });
    const res = await submit(app);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ score: 8, max_score: 10, correct_count: 4, total_questions: 5, xp_earned: 60, estimated: false, sections: [], already_awarded: true, already_submitted: true });
    expect(xp.inserted).toHaveLength(0);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('returns the other result when two submits race', async () => {
    const app = await build({
      exam_attempts: [ok(started), ok([]), ok({ ...started, status: 'submitted', score: 10, correct_count: 1, total_questions: 1, xp_earned: 15 })],
      exam_blueprints: ok({ id: BP }),
      questions: ok([question]),
      xp_log: mockQuery({ data: null, error: { code: '23505', message: 'duplicate' } }),
    });
    const res = await submit(app);
    expect(res.json()).toMatchObject({ score: 10, already_submitted: true });
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('refuses an attempt that is not the caller’s or is for another exam, and a missing attempt id', async () => {
    const app = await build({ exam_attempts: ok(null) });
    expect((await submit(app)).statusCode).toBe(404);
    await app.close();
    const other = await build({ exam_attempts: ok({ ...started, blueprint_id: '33333333-3333-4333-8333-333333333333' }) });
    expect((await submit(other)).statusCode).toBe(404);
    await other.close();
    const none = await build({});
    const res = await none.inject({ method: 'POST', url: '/api/score/exam', payload: { blueprint_id: BP, answers: [] } });
    expect(res.statusCode).toBe(400);
    await none.close();
  });
});

describe('graded exams counted per day', () => {
  it('says "today" when the plan counts attempts per day', async () => {
    const daily = ok({ operation_id: A1, state: 'reserved', kind: 'daily', remaining: 1, resets_at: '2026-09-29T17:00:00+00:00' });
    const app = await build({ exam_blueprints: ok({ id: BP }), exam_attempts: [ok(null), ok()], 'rpc:billing_reserve_quota': daily });
    expect((await start(app)).json()).toMatchObject({ remaining: 1, period: 'day' });
    await app.close();

    const full = await build({
      exam_blueprints: ok({ id: BP }),
      exam_attempts: ok(null),
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([{ metric: 'graded_exam_attempts', kind: 'daily', quota_limit: 2, used: 2, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-09-29T17:00:00+00:00' }]),
    });
    const res = await start(full);
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toContain('2 lượt thi chấm điểm hôm nay');
    expect(res.json().error_en).toContain('today');
    expect(res.json().period).toBe('day');
    await full.close();
  });
});
