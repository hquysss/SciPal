import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { practiceRoutes } from '../routes/practice.js';
import { clampAnsweredAt } from '../practice/record.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const LESSON = '22222222-2222-4222-8222-222222222222';
const Q_MC = '33333333-3333-4333-8333-333333333333';
const Q_CODE = '44444444-4444-4444-8444-444444444444';
const Q_WRITING = '55555555-5555-4555-8555-555555555555';
const student = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', app_metadata: { app_role: 'student' } };
const ok = (data: unknown) => mockQuery({ data, error: null });

const explanation = { vi: 'Vì 2 + 2 = 4.', en: 'Because 2 + 2 = 4.' };
const mc = { id: Q_MC, usage: 'practice', status: 'published', subject_id: SUBJECT, lesson_id: LESSON, created_by: 'teacher-1', type: 'mc', difficulty: 2, data: { stem: { vi: '2 + 2?', en: '2 + 2?' }, options: [{ id: 'a', text: { vi: '3', en: '3' } }, { id: 'b', text: { vi: '4', en: '4' } }], answer: 'b', explanation } };
const writing = { ...mc, id: Q_WRITING, type: 'writing', data: { stem: { vi: 'Viết', en: 'Write' }, key_terms: ['loop'], sample_answer: 'A loop.' } };
const lesson = { id: LESSON, subject_id: SUBJECT, status: 'published', created_by: 'teacher-1', blocks: [{ type: 'quiz', question_id: Q_MC }, { type: 'quiz', question_id: Q_CODE }, { type: 'quiz', question_id: Q_WRITING }] };

async function build(user: object | undefined, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  if (user) app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(practiceRoutes);
  await app.ready();
  return app;
}

describe('GET /api/practice/lessons/:id/offline', () => {
  const url = `/api/practice/lessons/${LESSON}/offline`;

  it('needs a session', async () => {
    const app = await build(undefined, {});
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(401);
    await app.close();
  });

  it('sends the questions with what grades them, only for mc/truefalse/short/writing, with no-store', async () => {
    const questions = ok([mc, writing]);
    const downloads = [ok(null), ok({ downloaded_at: '2026-10-18T07:00:00.000Z' })];
    const app = await build(student, { lessons: ok(lesson), questions, offline_downloads: downloads });
    const res = await app.inject({ method: 'GET', url });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const body = res.json();
    expect(body).toMatchObject({ lesson_id: LESSON, subject_id: SUBJECT, downloaded_at: '2026-10-18T07:00:00.000Z' });
    expect(body.questions.map((q: { id: string }) => q.id)).toEqual([Q_MC, Q_WRITING]);
    expect(body.questions[0].data).not.toHaveProperty('answer');
    expect(body.keys[Q_MC]).toEqual({ type: 'mc', difficulty: 2, data: mc.data });
    expect(questions.inCalls).toContainEqual(['type', ['mc', 'truefalse', 'short', 'writing']]);
    expect(questions.eqCalls).toContainEqual(['status', 'published']);
    await app.close();
  });

  it('records the first download only', async () => {
    const downloads = ok(null);
    const app = await build(student, { lessons: ok(lesson), questions: ok([mc]), offline_downloads: [downloads, ok({ downloaded_at: '2026-10-18T07:00:00.000Z' })] });
    await app.inject({ method: 'GET', url });
    expect(downloads.inserted[0]).toMatchObject({ user_id: student.id, lesson_id: LESSON });
    await app.close();
  });

  it('refuses a lesson that is not published', async () => {
    const app = await build(student, { lessons: ok({ ...lesson, status: 'draft', created_by: 'someone' }) });
    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(404);
    await app.close();
  });
});

describe('clampAnsweredAt', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  const downloaded = '2026-10-18T07:00:00.000Z';
  it('keeps a plausible time of answering', () => {
    expect(clampAnsweredAt('2026-10-19T09:00:00.000Z', downloaded, now).toISOString()).toBe('2026-10-19T09:00:00.000Z');
  });
  it('uses the server time for a time in the future (beyond 5 minutes of clock drift)', () => {
    expect(clampAnsweredAt('2026-10-20T10:10:00.000Z', downloaded, now)).toEqual(now);
    expect(clampAnsweredAt('2026-10-20T10:04:00.000Z', downloaded, now).toISOString()).toBe('2026-10-20T10:04:00.000Z');
  });
  it('never dates an answer before the download', () => {
    expect(clampAnsweredAt('2026-10-01T00:00:00.000Z', downloaded, now).toISOString()).toBe(downloaded);
  });
  it('uses the server time without a download or a readable time', () => {
    expect(clampAnsweredAt('2026-10-19T09:00:00.000Z', null, now)).toEqual(now);
    expect(clampAnsweredAt('yesterday', downloaded, now)).toEqual(now);
  });
});

describe('POST /api/practice/sync', () => {
  const sync = (app: Awaited<ReturnType<typeof build>>, attempts: unknown) => app.inject({ method: 'POST', url: '/api/practice/sync', payload: { attempts } });
  const item = (question_id: string, response: unknown, answered_at = '2026-10-19T09:00:00.000Z') => ({ question_id, lesson_id: LESSON, response, answered_at });

  it('needs a session', async () => {
    const app = await build(undefined, {});
    expect((await sync(app, [item(Q_MC, { selected_option: 'b' })])).statusCode).toBe(401);
    await app.close();
  });

  it('refuses more than 100 answers, or none', async () => {
    const app = await build(student, {});
    expect((await sync(app, Array.from({ length: 101 }, () => item(Q_MC, { selected_option: 'b' })))).statusCode).toBe(400);
    expect((await sync(app, [])).statusCode).toBe(400);
    await app.close();
  });

  it("grades on the server and counts yesterday's offline answer on yesterday", async () => {
    const attempt = ok([{ question_id: Q_MC }]);
    const xp = ok(null);
    const streakWrite = ok(null);
    const app = await build(student, {
      offline_downloads: ok([{ lesson_id: LESSON, downloaded_at: '2026-10-18T07:00:00.000Z' }]),
      questions: ok(mc),
      lessons: [ok([{ id: LESSON }]), ok({ id: LESSON }), ok([])],
      practice_attempts: attempt,
      xp_log: xp,
      streaks: [ok(null), streakWrite],
    });
    const res = await sync(app, [item(Q_MC, { selected_option: 'b' })]);
    expect(res.statusCode).toBe(200);
    expect(res.json().results).toEqual([{ question_id: Q_MC, status: 'ok', correct: true, explanation, counted: true, xp_earned: 15, new_streak: 1, lesson_completed: false }]);
    expect(attempt.inserted[0]).toMatchObject({ created_at: '2026-10-19T09:00:00.000Z' });
    expect(streakWrite.inserted[0]).toMatchObject({ last_active: '2026-10-19' });
    await app.close();
  });

  it('ignores the download of a lesson that does not hold the question (no backdating through another lesson)', async () => {
    const attempt = ok([]);
    const ownership = ok(null);
    const app = await build(student, {
      offline_downloads: ok([{ lesson_id: LESSON, downloaded_at: '2026-10-01T07:00:00.000Z' }]),
      questions: ok(mc),
      lessons: [ok([{ id: 'other' }]), ownership],
      practice_attempts: attempt,
    });
    const before = Date.now();
    await sync(app, [item(Q_MC, { selected_option: 'b' }, '2026-10-02T09:00:00.000Z')]);
    expect(ownership.eqCalls).toContainEqual(['id', LESSON]);
    expect(Date.parse((attempt.inserted[0] as { created_at: string }).created_at)).toBeGreaterThanOrEqual(before);
    await app.close();
  });

  it('rejects a malformed item alone and still grades the others', async () => {
    const app = await build(student, {
      offline_downloads: ok([]),
      questions: ok(mc),
      lessons: [ok([{ id: LESSON }]), ok([])],
      practice_attempts: ok([]),
    });
    const res = await sync(app, [{ ...item(Q_CODE, { selected_option: 'b' }), answered_at: 'x'.repeat(50) }, item(Q_MC, { selected_option: 'b' })]);
    expect(res.statusCode).toBe(200);
    expect(res.json().results.map((r: { question_id: string; status: string }) => [r.question_id, r.status])).toEqual([[Q_CODE, 'rejected'], [Q_MC, 'ok']]);
    await app.close();
  });

  it('reports a question that is gone or a malformed answer per item, and still counts the rest', async () => {
    const app = await build(student, {
      offline_downloads: ok([]),
      questions: [ok(null), ok(mc), ok(mc)],
      lessons: [ok([{ id: LESSON }]), ok([{ id: LESSON }]), ok([])],
      practice_attempts: ok([]),
    });
    const res = await sync(app, [
      item(Q_CODE, { selected_option: 'b' }, '2026-10-19T08:00:00.000Z'),
      item(Q_MC, { short_answer: 'b' }, '2026-10-19T08:30:00.000Z'),
      item(Q_MC, { selected_option: 'a' }, '2026-10-19T09:00:00.000Z'),
    ]);
    expect(res.json().results.map((r: { status: string }) => r.status)).toEqual(['gone', 'rejected', 'ok']);
    await app.close();
  });

  it('handles answers in the order they were made', async () => {
    const app = await build(student, {
      offline_downloads: ok([]),
      questions: [ok(mc), ok(writing)],
      lessons: [ok([{ id: LESSON }]), ok([{ id: LESSON }])],
      practice_attempts: [ok([]), ok([])],
    });
    const res = await sync(app, [item(Q_WRITING, { writing_answer: 'loop' }, '2026-10-19T09:00:00.000Z'), item(Q_MC, { selected_option: 'b' }, '2026-10-19T08:00:00.000Z')]);
    expect(res.json().results.map((r: { question_id: string }) => r.question_id)).toEqual([Q_MC, Q_WRITING]);
    await app.close();
  });
});
