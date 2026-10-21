import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { clampStartedAt, examRoutes } from '../routes/exam.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

// An exam saved without starting an attempt: the attempt is opened by the submission itself.

const BP = '22222222-2222-4222-8222-222222222222';
const A1 = '44444444-4444-4444-8444-444444444444';
const student = { id: 'student-1', app_metadata: {} };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const refused = (message: string, code = 'P0001') => mockQuery({ data: null, error: { code, message } });
const hold = (remaining: number) => ok({ operation_id: A1, state: 'reserved', kind: 'monthly', remaining, resets_at: '2026-09-30T17:00:00+00:00' });
const question = { id: 'q1', type: 'mc', data: { answer: 'a' }, subject_id: 'subject-1' };
const answers = [{ question_id: 'q1', selected_option: 'a' }];
const names = () => rpcCalls.map(([name, args]) => [name, (args as { p_outcome?: string }).p_outcome].filter(Boolean).join(':'));

async function build(tables: Record<string, MockBuilder | MockBuilder[]>, user: object | null = student) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { if (user) (req as any).user = user; });
  await app.register(examRoutes);
  await app.ready();
  return app;
}
const submit = (app: Awaited<ReturnType<typeof build>>, extra: Record<string, unknown> = {}) =>
  app.inject({ method: 'POST', url: '/api/score/exam', payload: { blueprint_id: BP, attempt_id: A1, answers, ...extra } });

beforeEach(() => { rpcCalls.length = 0; });

describe('submitting an attempt the server has not seen', () => {
  it('opens the attempt, scores it, counts it once, and gives XP and a streak for the day it was finished', async () => {
    const insert = ok();
    const xp = ok();
    const streakWrite = ok();
    const streaks = [ok(null), streakWrite];
    const app = await build({
      exam_attempts: [ok(null), ok(null), insert, ok([{ id: A1 }])],
      exam_blueprints: ok({ id: BP }),
      questions: ok([question]),
      xp_log: xp,
      streaks,
      'rpc:billing_reserve_quota': hold(2),
      'rpc:billing_settle_quota': ok(true),
    });
    const res = await submit(app, { started_at: '2026-10-19T08:00:00.000Z', finished_at: '2026-10-19T09:30:00.000Z' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ score: 10, correct_count: 1, xp_earned: 15, new_streak: 1 });
    expect(insert.inserted[0]).toMatchObject({ id: A1, user_id: 'student-1', blueprint_id: BP, metered: true, created_at: '2026-10-19T08:00:00.000Z' });
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:commit']);
    expect(xp.inserted[0]).toMatchObject({ created_at: '2026-10-19T09:30:00.000Z' });
    expect(streakWrite.inserted[0]).toMatchObject({ user_id: 'student-1', subject_id: 'subject-1', current_streak: 1, last_active: '2026-10-19' });
    await app.close();
  });

  it('says the attempt was not counted, with no result, XP or streak, when the plan has none left', async () => {
    const insert = ok();
    const xp = ok();
    const streaks = ok(null);
    const app = await build({
      exam_attempts: [ok(null), ok(null), insert],
      exam_blueprints: ok({ id: BP }),
      questions: ok([question]),
      xp_log: xp,
      streaks,
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([{ metric: 'graded_exam_attempts', kind: 'monthly', quota_limit: 3, used: 3, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-09-30T17:00:00+00:00' }]),
    });
    const res = await submit(app);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'QUOTA_EXCEEDED' });
    expect(res.json()).not.toHaveProperty('score');
    expect(insert.inserted).toHaveLength(0);
    expect(xp.inserted).toHaveLength(0);
    expect(streaks.inserted).toHaveLength(0);
    await app.close();
  });

  it('answers 404 for an attempt id that belongs to someone else, and for an unknown exam', async () => {
    const other = await build({ exam_attempts: [ok(null), ok({ id: A1, user_id: 'someone', blueprint_id: BP, metered: true, status: 'started' })], exam_blueprints: ok({ id: BP }) });
    expect((await submit(other)).statusCode).toBe(404);
    await other.close();
    const missing = await build({ exam_attempts: [ok(null), ok(null)], exam_blueprints: ok(null) });
    expect((await submit(missing)).statusCode).toBe(404);
    await missing.close();
  });

  it('does not meter a teacher, who still earns XP and a streak', async () => {
    const insert = ok();
    const app = await build({
      exam_attempts: [ok(null), ok(null), insert, ok([{ id: A1 }])],
      exam_blueprints: ok({ id: BP }),
      questions: ok([question]),
      xp_log: ok(),
      streaks: [ok(null), ok()],
    }, teacher);
    const res = await submit(app);
    expect(res.statusCode).toBe(200);
    expect(insert.inserted[0]).toMatchObject({ metered: false });
    expect(rpcCalls).toHaveLength(0);
    expect(res.json()).toMatchObject({ xp_earned: 15, new_streak: 1 });
    await app.close();
  });
});

describe('streak of a graded exam', () => {
  const scored = (tables: Record<string, MockBuilder | MockBuilder[]>, questions = [question]) => build({
    exam_attempts: [ok({ id: A1, user_id: 'student-1', blueprint_id: BP, metered: false, status: 'started', created_at: '2026-10-19T08:00:00.000Z' }), ok([{ id: A1 }])],
    exam_blueprints: ok({ id: BP }),
    questions: ok(questions),
    xp_log: ok(),
    ...tables,
  });

  it('counts a day once per scored attempt, even when the exam already gave its XP', async () => {
    const streakWrite = ok();
    const streaks = [ok({ current_streak: 4, longest_streak: 6, last_active: '2026-10-18' }), streakWrite];
    const app = await scored({ streaks, xp_log: mockQuery({ data: null, error: { code: '23505', message: 'duplicate' } }) });
    const res = await submit(app, { finished_at: '2026-10-19T09:00:00.000Z' });
    expect(res.json()).toMatchObject({ xp_earned: 0, already_awarded: true, new_streak: 5 });
    expect(streakWrite.inserted[0]).toMatchObject({ current_streak: 5, last_active: '2026-10-19' });
    await app.close();
  });

  it('leaves the streak alone for an exam of several subjects', async () => {
    const streaks = ok(null);
    const app = await scored({ streaks }, [question, { ...question, id: 'q2', subject_id: 'subject-2' }]);
    const res = await submit(app);
    expect(res.statusCode).toBe(200);
    expect(res.json()).not.toHaveProperty('new_streak');
    expect(streaks.inserted).toHaveLength(0);
    await app.close();
  });

  it('is not touched by a second submit of the same attempt', async () => {
    const streaks = ok(null);
    const app = await build({
      exam_attempts: ok({ id: A1, user_id: 'student-1', blueprint_id: BP, metered: true, status: 'submitted', score: 10, correct_count: 1, total_questions: 1, xp_earned: 15 }),
      streaks,
    });
    expect((await submit(app)).json()).toMatchObject({ already_submitted: true });
    expect(streaks.inserted).toHaveLength(0);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('still scores when the streak cannot be saved', async () => {
    const app = await scored({ streaks: mockQuery({ data: null, error: { message: 'db down' } }) });
    expect((await submit(app)).statusCode).toBe(200);
    await app.close();
  });
});

describe('clampStartedAt', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  const finished = new Date('2026-10-19T09:30:00Z');
  it('keeps a start between a week ago and the finish', () => {
    expect(clampStartedAt('2026-10-19T08:00:00.000Z', finished, now)?.toISOString()).toBe('2026-10-19T08:00:00.000Z');
  });
  it('drops one that is missing, unreadable, older than a week, or after the finish', () => {
    expect(clampStartedAt(undefined, finished, now)).toBeUndefined();
    expect(clampStartedAt('yesterday', finished, now)).toBeUndefined();
    expect(clampStartedAt('2026-10-01T00:00:00.000Z', finished, now)).toBeUndefined();
    expect(clampStartedAt('2026-10-19T10:00:00.000Z', finished, now)).toBeUndefined();
  });
});
