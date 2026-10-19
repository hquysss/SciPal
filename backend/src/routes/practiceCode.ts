import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { gradeSubmission } from '../judge/grade.js';
import { Judge0Unavailable, verdictOf, type Judge0Client } from '../judge/judge0.js';
import { consumeRateSlot, type RunKind } from '../judge/rateLimit.js';
import { getUser, ID, msg, servableQuestion, unavailable } from '../practice/servable.js';
import { CODE_LANGUAGES, MAX_CODE_CHARS, MAX_CODE_TESTS, type CodeTest } from '../schemas/questions.js';
import { explanationOf } from './practice.js';

// Programming questions in lesson practice. Signed-in learners run their code on an input they
// type, or submit it to be judged on every test (hidden ones included). Judging is Judge0's job;
// this file only decides who may ask, how often, and what the answer may show. Like all of
// Tự luyện nothing is stored and no XP is given.

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
const judgeDown = msg('Chưa chấm được lúc này, em thử lại sau nhé. Lần này không bị tính là sai.', 'Could not judge right now, try again later. This does not count as a wrong answer.');
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
  /** The signed-in user with a free run slot, or the reply has been sent. */
  async function admit(request: FastifyRequest, reply: FastifyReply, kind: RunKind): Promise<{ id: string } | null> {
    const user = getUser(request);
    if (!user?.id) {
      reply.code(401).send(signIn);
      return null;
    }
    if (!app.supabase || !app.judge0) {
      reply.code(503).send(off);
      return null;
    }
    try {
      if (!(await consumeRateSlot(app.supabase, user.id, kind))) {
        reply.code(429).send(tooMany);
        return null;
      }
    } catch (err) {
      request.log.error({ err }, 'Failed to count code runs');
      reply.code(500).send(judgeDown);
      return null;
    }
    return { id: user.id };
  }

  const unreachable = (request: FastifyRequest, reply: FastifyReply, err: unknown) => {
    if (!(err instanceof Judge0Unavailable)) throw err;
    request.log.error({ err }, 'Judge0 unavailable');
    return reply.code(502).send(judgeDown);
  };

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

  app.post('/api/practice/code/run', { bodyLimit: BODY_LIMIT }, async (request, reply) => {
    const parsed = RunBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(badRequest);
    const input = parsed.data;
    if (!getUser(request)?.id) return reply.code(401).send(signIn);
    if (!app.supabase) return reply.code(503).send(off);
    const question = await codeQuestion(request, reply, input.question_id);
    if (!question) return reply;
    if (!(await admit(request, reply, 'run'))) return reply;
    const limits = { memory_limit_mb: question.data.memory_limit_mb };
    try {
      const [outcome] = await app.judge0!.runBatch([{ language: input.language, source: input.source, stdin: input.stdin, time_limit_ms: question.data.time_limit_ms, ...limits }]);
      return reply.send({
        status: verdictOf(outcome!, limits, true),
        stdout: outcome!.stdout,
        stderr: outcome!.compile_output || outcome!.stderr,
        time_ms: outcome!.time_ms,
        memory_kb: outcome!.memory_kb,
      });
    } catch (err) {
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
    if (!(await admit(request, reply, 'submit'))) return reply;
    try {
      const result = await gradeSubmission({ client: app.judge0!, language: input.language, source: input.source, ...question.data, reveal: 'samples' });
      const { correct, ...code } = result;
      const explanation = correct ? explanationOf(question.row.data as Record<string, unknown>) : undefined;
      return reply.send({ correct, code, ...(explanation ? { explanation } : {}) });
    } catch (err) {
      return unreachable(request, reply, err);
    }
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
    try {
      const { correct: _correct, ...code } = await gradeSubmission({ client: app.judge0!, ...parsed.data, reveal: 'all' });
      return reply.send(code);
    } catch (err) {
      return unreachable(request, reply, err);
    }
  });
};
