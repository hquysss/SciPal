import { createHash, randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { gradeSubmission } from '../judge/grade.js';
import { Judge0Unavailable, verdictOf, type Judge0Client } from '../judge/judge0.js';
import { capsFor, createJudgeLimitsStore, DEFAULT_JUDGE_LIMITS } from '../judge/limits.js';
import { checkRateSlot, recordRun, runsToday, type RunKind } from '../judge/rateLimit.js';
import { BillingRepositoryError, createBillingRepository } from '../billing/repository.js';
import { vietnamDayStart } from '../tutor/limits.js';
import { getUser, ID, msg, servableQuestion, unavailable } from '../practice/servable.js';
import { CODE_LANGUAGES, MAX_CODE_CHARS, MAX_CODE_TESTS, type CodeTest } from '../schemas/questions.js';
import { explanationOf } from './practice.js';
import { touchStreak } from '../streaks/touchStreak.js';

// Programming questions in lesson practice. Signed-in learners run their code on an input they
// type, or submit it to be judged on every test (hidden ones included). Judging is Judge0's job;
// this file only decides who may ask, how often, and what the answer may show. Like all of
// Tự luyện nothing about the answer is stored. A published question solved for the first time gives XP
// by its difficulty, once per learner (a unique index on xp_log makes a second grant fail).

declare module 'fastify' {
  interface FastifyInstance {
    /** The code runner; without it (no JUDGE0_URL) programming questions cannot be run or judged. */
    judge0?: Judge0Client;
  }
}

const BODY_LIMIT = 160 * 1024;
const Source = z.string().max(MAX_CODE_CHARS).refine((text) => text.trim() !== '');
const Language = z.enum(CODE_LANGUAGES);

const RunBody = z.object({ question_id: z.string().regex(ID), language: Language, source: Source, stdin: z.string().max(MAX_CODE_CHARS).default('') }).strict();
const SubmitBody = z.object({ question_id: z.string().regex(ID), language: Language, source: Source }).strict();
const VerifyBody = z
  .object({
    language: Language,
    source: Source,
    time_limit_ms: z.number().int().min(500).max(5000),
    memory_limit_mb: z.number().int().min(16).max(256),
    tests: z
      .array(z.object({ input: z.string().max(MAX_CODE_CHARS), expected: z.string().max(MAX_CODE_CHARS), sample: z.boolean(), points: z.number().int().min(1).max(100) }).strict())
      .min(1)
      .max(MAX_CODE_TESTS),
  })
  .strict();

const signIn = msg('Đăng nhập để chạy và nộp code.', 'Sign in to run and submit code.');
const badRequest = msg('Yêu cầu không đúng định dạng (code tối đa 64 KB).', 'The request is not valid (code up to 64 KB).');
const off = msg('Chấm code chưa được bật.', 'Code judging is not switched on.');
const tooMany = msg('Em thao tác nhanh quá, đợi một phút rồi thử lại.', 'Too many tries, wait a minute and try again.');
const tooManyToday = msg('Hôm nay em đã dùng hết lượt chấm code, mai thử lại nhé.', 'You have used all of today’s code runs, try again tomorrow.');
const siteFull = msg('Hôm nay hệ thống chấm bài đã đầy, em thử lại vào ngày mai nhé.', 'The judge is full for today, try again tomorrow.');
const judgeDown = msg('Chưa chấm được lúc này, em thử lại sau nhé. Lần này không bị tính là sai.', 'Could not judge right now, try again later. This does not count as a wrong answer.');
/** XP for the first accepted answer, by difficulty (1 easy, 2 medium, 3 hard). */
export const CODE_XP: Record<number, number> = { 1: 20, 2: 35, 3: 50 };

const NDJSON = 'application/x-ndjson';
const noTests = msg('Câu này chưa có bộ test.', 'This question has no tests yet.');

/** A stored code question as the judge reads it; stored data is lenient, so every field is checked. */
function judgeData(data: unknown): { tests: CodeTest[]; time_limit_ms: number; memory_limit_mb: number } {
  const d = (data ?? {}) as Record<string, unknown>;
  const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
  const tests = (Array.isArray(d.tests) ? d.tests : []).flatMap((t: Record<string, unknown>) =>
    typeof t?.input === 'string' && typeof t.expected === 'string' ? [{ input: t.input, expected: t.expected, sample: t.sample === true, points: num(t.points, 1) }] : [],
  );
  return { tests: tests.slice(0, MAX_CODE_TESTS), time_limit_ms: num(d.time_limit_ms, 2000), memory_limit_mb: num(d.memory_limit_mb, 128) };
}

export const practiceCodeRoutes: FastifyPluginAsync = async (app) => {
  // Admins change the daily limits at /admin/judge; they reach every instance within 30 s.
  let readLimits: ReturnType<typeof createJudgeLimitsStore> | undefined;
  const limitsInForce = async () => {
    if (!app.supabase) return DEFAULT_JUDGE_LIMITS;
    readLimits ??= createJudgeLimitsStore(app.supabase, (err) => app.log.error({ err }, 'Failed to read the judge limits'));
    return readLimits();
  };

  /** Metrics of a plan: the learner's daily share of each kind of run. Teacher test checks are not a plan quota. */
  const METRIC = { submit: 'code_submits', run: 'code_runs' } as const;

  /**
   * The signed-in user with a free run slot, or the reply has been sent. A learner's day is a quota of their
   * plan: one unit is held now, `settle('commit')` counts it once the judge has answered and `settle('release')`
   * gives it back when it could not (a judge outage is never charged). Admins have no plan, so no quota.
   */
  async function admit(request: FastifyRequest, reply: FastifyReply, kind: RunKind): Promise<{ id: string; settle: (outcome: 'commit' | 'release') => Promise<void> } | null> {
    const user = getUser(request);
    if (!user?.id) {
      reply.code(401).send(signIn);
      return null;
    }
    if (!app.supabase || !app.judge0) {
      reply.code(503).send(off);
      return null;
    }
    const supabase = app.supabase;
    let operationId: string | null = null;
    try {
      const slot = await checkRateSlot(supabase, user.id, kind, capsFor(kind, await limitsInForce()));
      if (slot !== 'ok') {
        reply.code(429).send(slot === 'day' ? tooManyToday : slot === 'busy' ? siteFull : tooMany);
        return null;
      }
      if (kind !== 'verify' && user.app_metadata?.app_role !== 'admin') {
        operationId = randomUUID();
        try {
          await createBillingRepository((name, args) => supabase.rpc(name, args)).reserveQuota(user.id, METRIC[kind], operationId, 1, createHash('sha256').update(`${user.id}:code:${kind}:${operationId}`).digest('hex'));
        } catch (err) {
          if (err instanceof BillingRepositoryError && err.code === 'QUOTA_EXCEEDED') {
            reply.code(429).send(tooManyToday);
            return null;
          }
          throw err;
        }
      }
      await recordRun(supabase, user.id, kind);
    } catch (err) {
      request.log.error({ err }, 'Failed to count code runs');
      if (operationId) await settleHold(request, operationId, 'release');
      reply.code(500).send(judgeDown);
      return null;
    }
    const held = operationId;
    return { id: user.id, settle: async (outcome) => (held ? settleHold(request, held, outcome) : undefined) };
  }

  async function settleHold(request: FastifyRequest, operationId: string, outcome: 'commit' | 'release') {
    try {
      await createBillingRepository((name, args) => app.supabase!.rpc(name, args)).settleQuota(operationId, outcome);
    } catch (err) {
      request.log.error({ err }, 'Failed to settle a code run');
    }
  }
  const unreachable = (request: FastifyRequest, reply: FastifyReply, err: unknown) => {
    if (!(err instanceof Judge0Unavailable)) throw err;
    request.log.error({ err }, 'Judge0 unavailable');
    return reply.code(502).send(judgeDown);
  };

  /**
   * XP for a published question solved for the first time. A grant that already exists, or one that
   * fails, gives 0: the verdict still stands and the learner can be granted on a later accepted submit.
   */
  async function grantXp(request: FastifyRequest, row: { id: string; status: string; subject_id: string; difficulty: number }): Promise<number> {
    const userId = getUser(request)?.id;
    const delta = CODE_XP[row.difficulty] ?? CODE_XP[1]!;
    if (!userId || row.status !== 'published') return 0;
    const { error } = await app.supabase!.from('xp_log').insert({ user_id: userId, subject_id: row.subject_id, delta, reason: `code_ac:${row.id}` });
    if (error) {
      if (error.code !== '23505') request.log.warn({ err: error }, 'XP insert failed for a solved code question');
      return 0;
    }
    await touchStreak(app.supabase!, userId, row.subject_id, new Date(), request.log);
    return delta;
  }

  /** A code question the caller may use, after the signed-in and rate checks. */
  async function codeQuestion(request: FastifyRequest, reply: FastifyReply, questionId: string) {
    const row = await servableQuestion(app, request, reply, questionId, judgeDown);
    if (!row) return null;
    if (row.type !== 'code') {
      reply.code(404).send(unavailable);
      return null;
    }
    const data = judgeData(row.data);
    if (data.tests.length === 0) {
      reply.code(404).send(noTests);
      return null;
    }
    return { row, data };
  }

  app.get('/api/practice/code/solved', async (request, reply) => {
    const userId = getUser(request)?.id;
    if (!userId) return reply.code(401).send(signIn);
    if (!app.supabase) return reply.code(503).send(off);
    const { data, error } = await app.supabase.from('xp_log').select('reason').eq('user_id', userId).ilike('reason', 'code_ac:%');
    if (error) {
      request.log.error({ err: error }, 'Failed to list solved code questions');
      return reply.code(500).send(msg('Chưa tải được các bài đã giải.', 'Could not load your solved problems.'));
    }
    const ids = ((data ?? []) as Array<{ reason: string }>).map((row) => row.reason.slice('code_ac:'.length)).filter((id) => ID.test(id));
    return reply.send({ question_ids: [...new Set(ids)] });
  });

  // What a learner has left today: their plan's code quota (null for an admin, who has none), and whether the whole judge is full.
  app.get('/api/practice/code/quota', async (request, reply) => {
    const user = getUser(request);
    if (!user?.id) return reply.code(401).send(signIn);
    if (!app.supabase) return reply.code(503).send(off);
    const supabase = app.supabase;
    try {
      const limits = await limitsInForce();
      const quotas = user.app_metadata?.app_role === 'admin' ? [] : await createBillingRepository((name, args) => supabase.rpc(name, args)).getEffectiveQuotas(user.id, new Date());
      const of = async (kind: 'submit' | 'run') => {
        const quota = quotas.find((q) => q.metric === METRIC[kind]);
        const cap = capsFor(kind, limits).global;
        const site_full = cap !== null && (await runsToday(supabase, kind)) >= cap;
        return quota ? { used: quota.used + quota.reserved, limit: quota.limit, site_full } : null;
      };
      const [submit, run] = [await of('submit'), await of('run')];
      const resets = quotas.find((q) => q.metric === METRIC.submit)?.resetsAt ?? new Date(vietnamDayStart(new Date()).getTime() + 86_400_000).toISOString();
      return reply.send({ submit, run, resets_at: resets });
    } catch (err) {
      request.log.error({ err }, 'Failed to read the code quota');
      return reply.code(500).send(judgeDown);
    }
  });

  app.post('/api/practice/code/run', { bodyLimit: BODY_LIMIT }, async (request, reply) => {
    const parsed = RunBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(badRequest);
    const input = parsed.data;
    if (!getUser(request)?.id) return reply.code(401).send(signIn);
    if (!app.supabase) return reply.code(503).send(off);
    const question = await codeQuestion(request, reply, input.question_id);
    if (!question) return reply;
    const hold = await admit(request, reply, 'run');
    if (!hold) return reply;
    const limits = { memory_limit_mb: question.data.memory_limit_mb };
    try {
      const [outcome] = await app.judge0!.runBatch([{ language: input.language, source: input.source, stdin: input.stdin, time_limit_ms: question.data.time_limit_ms, ...limits }]);
      const answer = {
        status: verdictOf(outcome!, limits, true),
        stdout: outcome!.stdout,
        stderr: outcome!.compile_output || outcome!.stderr,
        time_ms: outcome!.time_ms,
        memory_kb: outcome!.memory_kb,
      };
      await hold.settle('commit');
      return reply.send(answer);
    } catch (err) {
      await hold.settle('release');
      return unreachable(request, reply, err);
    }
  });

  app.post('/api/practice/code/submit', { bodyLimit: BODY_LIMIT }, async (request, reply) => {
    const parsed = SubmitBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(badRequest);
    const input = parsed.data;
    if (!getUser(request)?.id) return reply.code(401).send(signIn);
    if (!app.supabase) return reply.code(503).send(off);
    const question = await codeQuestion(request, reply, input.question_id);
    if (!question) return reply;
    const hold = await admit(request, reply, 'submit');
    if (!hold) return reply;
    const judge = async (onTest?: Parameters<typeof gradeSubmission>[0]['onTest']) => {
      const { correct, ...code } = await gradeSubmission({ client: app.judge0!, language: input.language, source: input.source, ...question.data, reveal: 'samples', onTest });
      if (!correct) return { correct, code };
      const explanation = explanationOf(question.row.data as Record<string, unknown>);
      const xp_earned = await grantXp(request, question.row);
      return { correct, code, xp_earned, ...(explanation ? { explanation } : {}) };
    };
    if (!String(request.headers.accept ?? '').includes(NDJSON)) {
      try {
        const answer = await judge();
        await hold.settle('commit');
        return reply.send(answer);
      } catch (err) {
        await hold.settle('release');
        return unreachable(request, reply, err);
      }
    }

    // Live progress, one JSON object per line: {type:'start', total}, one {type:'test', index, verdict, time_ms}
    // per test as it finishes, then {type:'result', ...the JSON reply} or {type:'error', ...message}.
    reply.hijack();
    const raw = reply.raw;
    // hijack() skips onSend hooks: carry the headers already set on the reply (CORS) by hand.
    raw.writeHead(200, { ...(reply.getHeaders() as Record<string, string | string[]>), 'Content-Type': `${NDJSON}; charset=utf-8`, 'Cache-Control': 'no-cache, no-transform' });
    const line = (data: Record<string, unknown>) => {
      if (!raw.writableEnded && !raw.destroyed) raw.write(`${JSON.stringify(data)}\n`);
    };
    line({ type: 'start', total: question.data.tests.length });
    try {
      const answer = await judge((index, test) => line({ type: 'test', index, ...test }));
      await hold.settle('commit');
      line({ type: 'result', ...answer });
    } catch (err) {
      await hold.settle('release');
      request.log.error({ err }, err instanceof Judge0Unavailable ? 'Judge0 unavailable' : 'Code submit failed');
      line({ type: 'error', ...judgeDown });
    } finally {
      raw.end();
    }
    return reply;
  });

  // A teacher or admin tries a model solution against a test set before saving the question.
  app.post('/api/practice/code/verify', { bodyLimit: BODY_LIMIT }, async (request, reply) => {
    const user = getUser(request);
    if (!user?.id) return reply.code(401).send(signIn);
    const role = user.app_metadata?.app_role;
    if (role !== 'teacher' && role !== 'admin') return reply.code(403).send(msg('Chỉ giáo viên được kiểm tra bộ test.', 'Only teachers can check a test set.'));
    const parsed = VerifyBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(badRequest);
    if (!(await admit(request, reply, 'verify'))) return reply;
    // A teacher's test check holds no plan quota (admit gave none), so there is nothing to settle.
    try {
      const { correct: _correct, ...code } = await gradeSubmission({ client: app.judge0!, ...parsed.data, reveal: 'all' });
      return reply.send(code);
    } catch (err) {
      return unreachable(request, reply, err);
    }
  });
};
