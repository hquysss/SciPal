import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { practiceCodeRoutes } from '../routes/practiceCode.js';
import { practiceRoutes } from '../routes/practice.js';
import { Judge0Unavailable, type Judge0Client, type RunOutcome } from '../judge/judge0.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const Q = '99999999-9999-4999-8999-999999999999';
const LESSON = '22222222-2222-4222-8222-222222222222';
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const codeRow = {
  id: Q, usage: 'practice', status: 'published', subject_id: 's', lesson_id: LESSON, created_by: 'teacher-1', type: 'code', difficulty: 1,
  data: {
    stem: { vi: 'Nhân đôi.', en: 'Double.' }, input_spec: { vi: 'n', en: 'n' }, output_spec: { vi: '2n', en: '2n' },
    time_limit_ms: 2000, memory_limit_mb: 128, explanation: { vi: 'Nhân 2.', en: 'Times two.' },
    tests: [
      { input: '2\n', expected: '4\n', sample: true, points: 1 },
      { input: '9\n', expected: 'HIDDEN-EXPECTED-7\n', sample: false, points: 1 },
    ],
  },
};
const ok = (data: unknown = null, count?: number) => mockQuery({ data, error: null, ...(count !== undefined ? { count } : {}) });
const out = (stdout: string, over: Partial<RunOutcome> = {}): RunOutcome => ({ status_id: 3, stdout, stderr: '', compile_output: '', time_ms: 10, memory_kb: 2000, ...over });

/** `n` runs of the person, all within the last few seconds (what code_runs holds when they are counted). */
const recentRuns = (n: number, agoMs = 5000) => Array.from({ length: n }, () => ({ created_at: new Date(Date.now() - agoMs).toISOString() }));
/** What counting one run reads: the person's runs today, the site's count, then the insert. */
const slot = (person: unknown[], site = 0) => [ok(person), ok(null, site), ok()];

function build(opts: { user?: object; judge0?: Judge0Client | null; row?: unknown; used?: number; usedToday?: number; siteToday?: number; limits?: object | null; xp?: MockBuilder | MockBuilder[]; lessons?: unknown[] }) {
  const tables: Record<string, MockBuilder | MockBuilder[]> = {
    questions: ok(opts.row === undefined ? codeRow : opts.row),
    lessons: ok(opts.lessons ?? [{ id: LESSON }]),
    judge_settings: ok(opts.limits ?? null),
    // Two counts per test, in case a test calls twice (run then submit).
    code_runs: [...slot(opts.usedToday ? recentRuns(opts.usedToday, 3_600_000) : recentRuns(opts.used ?? 0), opts.siteToday), ...slot(opts.usedToday ? recentRuns(opts.usedToday, 3_600_000) : recentRuns(opts.used ?? 0), opts.siteToday)],
    xp_log: opts.xp ?? ok(),
    streaks: [ok(null), ok()],
  };
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  if (opts.judge0 !== null) app.decorate('judge0', opts.judge0 ?? { runBatch: vi.fn(async () => [out('4\n'), out('HIDDEN-EXPECTED-7\n')]) });
  if (opts.user) app.addHook('onRequest', async (req) => { (req as any).user = opts.user; });
  return app.register(practiceCodeRoutes).register(practiceRoutes).ready().then(() => ({ app, tables }));
}
const post = (app: Awaited<ReturnType<typeof build>>['app'], url: string, payload: object) => app.inject({ method: 'POST', url, payload: payload as Record<string, unknown> });
const submitBody = { question_id: Q, language: 'python', source: 'print(int(input())*2)' };

describe('POST /api/practice/code/submit', () => {
  it('needs a signed-in user and never reaches Judge0 without one', async () => {
    const judge0 = { runBatch: vi.fn() };
    const { app } = await build({ judge0 });
    const res = await post(app, '/api/practice/code/submit', submitBody);
    expect(res.statusCode).toBe(401);
    expect(judge0.runBatch).not.toHaveBeenCalled();
  });

  it('says so when judging is switched off', async () => {
    const { app } = await build({ user: student, judge0: null });
    expect((await post(app, '/api/practice/code/submit', submitBody)).statusCode).toBe(503);
  });

  it('rejects an empty source, another language and a question that is not code', async () => {
    const { app } = await build({ user: student });
    expect((await post(app, '/api/practice/code/submit', { ...submitBody, source: '   ' })).statusCode).toBe(400);
    expect((await post(app, '/api/practice/code/submit', { ...submitBody, language: 'java' })).statusCode).toBe(400);
    const mc = await build({ user: student, row: { ...codeRow, type: 'mc' } });
    expect((await post(mc.app, '/api/practice/code/submit', submitBody)).statusCode).toBe(404);
  });

  it('is correct when every test passes, then shows the explanation and still hides hidden tests', async () => {
    const { app } = await build({ user: student });
    const res = await post(app, '/api/practice/code/submit', submitBody);
    const body = res.json();
    expect(res.statusCode).toBe(200);
    expect(body).toMatchObject({ correct: true, code: { status: 'AC' }, explanation: { vi: 'Nhân 2.' } });
    expect(res.body).not.toContain('HIDDEN-EXPECTED-7');
  });

  it('is not correct and shows no explanation when a test fails', async () => {
    const { app } = await build({ user: student, judge0: { runBatch: async () => [out('4\n'), out('wrong\n')] } });
    const body = (await post(app, '/api/practice/code/submit', submitBody)).json();
    expect(body.correct).toBe(false);
    expect(body.code.status).toBe('WA');
    expect(body).not.toHaveProperty('explanation');
    expect(JSON.stringify(body)).not.toContain('HIDDEN-EXPECTED-7');
  });

  it('stops at the per-minute limit before calling Judge0', async () => {
    const judge0 = { runBatch: vi.fn() };
    const { app } = await build({ user: student, judge0, used: 5 });
    const res = await post(app, '/api/practice/code/submit', submitBody);
    expect(res.statusCode).toBe(429);
    expect(judge0.runBatch).not.toHaveBeenCalled();
  });

  it('stops at the daily limit, with its own message, before calling Judge0', async () => {
    const judge0 = { runBatch: vi.fn() };
    const { app } = await build({ user: student, judge0, usedToday: 20 });
    const res = await post(app, '/api/practice/code/submit', submitBody);
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toMatch(/hôm nay/i);
    expect(judge0.runBatch).not.toHaveBeenCalled();
  });

  it('uses the daily limit an admin set instead of the default', async () => {
    const judge0 = { runBatch: vi.fn() };
    // 5 runs today is fine by default (20) but over an admin's limit of 5.
    const { app } = await build({ user: student, judge0, usedToday: 5, limits: { person_submits_per_day: 5, person_runs_per_day: null, global_submits_per_day: null, global_runs_per_day: null } });
    expect((await post(app, '/api/practice/code/submit', submitBody)).statusCode).toBe(429);
    expect(judge0.runBatch).not.toHaveBeenCalled();
  });

  it('says the judge is full when the whole site has used its day, and spends nothing', async () => {
    const judge0 = { runBatch: vi.fn() };
    const { app } = await build({ user: student, judge0, siteToday: 300 });
    const res = await post(app, '/api/practice/code/submit', submitBody);
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toMatch(/đã đầy/);
    expect(judge0.runBatch).not.toHaveBeenCalled();
  });

  it('judges under the default limits when none were saved', async () => {
    const { app } = await build({ user: student });
    expect((await post(app, '/api/practice/code/submit', submitBody)).statusCode).toBe(200);
  });

  it('answers 502, not a wrong verdict, when Judge0 is down', async () => {
    const { app } = await build({ user: student, judge0: { runBatch: async () => { throw new Judge0Unavailable('down'); } } });
    const res = await post(app, '/api/practice/code/submit', submitBody);
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toMatch(/thử lại/);
  });

  const streamed = (app: Awaited<ReturnType<typeof build>>['app']) =>
    app.inject({ method: 'POST', url: '/api/practice/code/submit', payload: submitBody, headers: { accept: 'application/x-ndjson' } });
  const lines = (body: string) => body.trim().split('\n').map((l) => JSON.parse(l));

  it('streams each test verdict as it finishes, then the verdict, without hidden output', async () => {
    // Test 2 finishes before test 1, as Judge0 may do.
    const runBatch = async (_jobs: unknown[], onDone?: (i: number, o: RunOutcome) => void) => {
      onDone?.(1, out('HIDDEN-EXPECTED-7\n', { time_ms: 7 }));
      onDone?.(0, out('4\n'));
      return [out('4\n'), out('HIDDEN-EXPECTED-7\n')];
    };
    const { app } = await build({ user: student, judge0: { runBatch } });
    const res = await streamed(app);
    expect(res.headers['content-type']).toContain('application/x-ndjson');
    expect(lines(res.body)).toEqual([
      { type: 'start', total: 2 },
      { type: 'test', index: 1, verdict: 'AC', time_ms: 7 },
      { type: 'test', index: 0, verdict: 'AC', time_ms: 10 },
      expect.objectContaining({ type: 'result', correct: true, code: expect.objectContaining({ status: 'AC' }) }),
    ]);
    expect(res.body).not.toContain('HIDDEN-EXPECTED-7');
  });

  it('ends a stream with an error line, not a wrong verdict, when Judge0 goes down', async () => {
    const { app } = await build({ user: student, judge0: { runBatch: async () => { throw new Judge0Unavailable('down'); } } });
    const all = lines((await streamed(app)).body);
    expect(all.at(-1)).toMatchObject({ type: 'error', error: expect.stringMatching(/thử lại/) });
    expect(all.some((l) => l.type === 'result')).toBe(false);
  });
});

describe('POST /api/practice/code/run', () => {
  it('runs the code once with the typed input', async () => {
    const runBatch = vi.fn(async () => [out('6\n')]);
    const { app } = await build({ user: student, judge0: { runBatch } });
    const res = await post(app, '/api/practice/code/run', { ...submitBody, stdin: '3\n' });
    expect(res.json()).toMatchObject({ status: 'AC', stdout: '6\n' });
    expect(runBatch).toHaveBeenCalledWith([expect.objectContaining({ stdin: '3\n', time_limit_ms: 2000, memory_limit_mb: 128 })]);
  });

  it('shows the compiler message when the code does not build', async () => {
    const { app } = await build({ user: student, judge0: { runBatch: async () => [out('', { status_id: 6, compile_output: 'error: expected ;' })] } });
    expect((await post(app, '/api/practice/code/run', { ...submitBody, stdin: '' })).json()).toMatchObject({ status: 'CE', stderr: 'error: expected ;' });
  });
});

describe('POST /api/practice/code/verify', () => {
  const body = { language: 'python', source: 'print(4)', time_limit_ms: 2000, memory_limit_mb: 128, tests: codeRow.data.tests };

  it('is for teachers and admins only', async () => {
    const { app } = await build({ user: student });
    expect((await post(app, '/api/practice/code/verify', body)).statusCode).toBe(403);
  });

  it('shows a teacher the output of every test, hidden ones included', async () => {
    const { app } = await build({ user: teacher });
    const res = await post(app, '/api/practice/code/verify', body);
    expect(res.statusCode).toBe(200);
    expect(res.json().tests[1]).toMatchObject({ verdict: 'AC', expected: 'HIDDEN-EXPECTED-7\n' });
  });
});

describe('POST /api/practice/check', () => {
  it('sends a code question to its own Submit button', async () => {
    const { app } = await build({ user: student });
    const res = await post(app, '/api/practice/check', { question_id: Q, response: { code: { language: 'python', source: 'x' } } });
    expect(res.statusCode).toBe(400);
  });
});

describe('XP for a programming question', () => {
  it('gives XP by difficulty the first time every test passes, once per question', async () => {
    const xp = ok();
    const { app } = await build({ user: student, xp, row: { ...codeRow, difficulty: 2 } });
    const body = (await post(app, '/api/practice/code/submit', submitBody)).json();
    expect(body.xp_earned).toBe(35);
    expect(xp.inserted[0]).toEqual({ user_id: 'student-1', subject_id: 's', delta: 35, reason: `code_ac:${Q}` });
  });

  it('gives nothing when the question was already solved', async () => {
    const xp = mockQuery({ data: null, error: { code: '23505', message: 'duplicate' } });
    const { app } = await build({ user: student, xp });
    const res = await post(app, '/api/practice/code/submit', submitBody);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ correct: true, xp_earned: 0 });
  });

  it('gives nothing for a wrong answer or an author trying an unpublished question', async () => {
    const xp = ok();
    const wrong = await build({ user: student, xp, judge0: { runBatch: async () => [out('4\n'), out('no\n')] } });
    expect((await post(wrong.app, '/api/practice/code/submit', submitBody)).json().xp_earned).toBeUndefined();
    const draft = await build({ user: { id: 'teacher-1', app_metadata: { app_role: 'teacher' } }, xp, row: { ...codeRow, status: 'draft' } });
    expect((await post(draft.app, '/api/practice/code/submit', submitBody)).json()).toMatchObject({ correct: true, xp_earned: 0 });
    expect(xp.inserted).toHaveLength(0);
  });
});

describe('GET /api/practice/code/solved', () => {
  it('lists the programming questions the learner has solved', async () => {
    const { app } = await build({ user: student, xp: ok([{ reason: `code_ac:${Q}` }, { reason: 'code_ac:not-an-id' }]) });
    const res = await app.inject({ method: 'GET', url: '/api/practice/code/solved' });
    expect(res.json()).toEqual({ question_ids: [Q] });
  });

  it('needs a signed-in learner', async () => {
    const { app } = await build({});
    expect((await app.inject({ method: 'GET', url: '/api/practice/code/solved' })).statusCode).toBe(401);
  });
});


describe('Bồi dưỡng HSG problems', () => {
  const hsgRow = { ...codeRow, lesson_id: null, data: { ...codeRow.data, track: 'hsg' } };

  it('judges a published hsg problem that is in no lesson', async () => {
    const { app } = await build({ user: student, row: hsgRow, lessons: [] });
    const res = await post(app, '/api/practice/code/submit', submitBody);
    expect(res.statusCode).toBe(200);
    expect(res.json().correct).toBe(true);
  });

  it('still refuses a code question in no published lesson without the hsg track', async () => {
    const { app } = await build({ user: student, row: { ...codeRow, lesson_id: null }, lessons: [] });
    expect((await post(app, '/api/practice/code/submit', submitBody)).statusCode).toBe(404);
  });

  it('refuses an unpublished hsg problem to a learner', async () => {
    const { app } = await build({ user: student, row: { ...hsgRow, status: 'draft', created_by: 'someone' }, lessons: [] });
    expect((await post(app, '/api/practice/code/submit', submitBody)).statusCode).toBe(404);
  });
});
