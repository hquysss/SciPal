import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { checkPracticeAnswer, keyTermsUsed, practiceRoutes } from '../routes/practice.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const Q = '99999999-9999-4999-8999-999999999999';
const LESSON = '22222222-2222-4222-8222-222222222222';
const OP = '66666666-6666-4666-8666-666666666666';
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const writing = {
  id: Q, usage: 'practice', status: 'published', subject_id: 's', lesson_id: LESSON, created_by: 'teacher-1', type: 'writing', difficulty: 1,
  data: { stem: { vi: 'Giải thích vòng lặp.', en: 'Explain a loop.' }, sample_answer: 'A loop repeats a block of code while a condition is true.', key_terms: ['loop', 'repeat', 'condition'] },
};
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const hold = () => ok({ operation_id: OP, state: 'reserved', kind: 'daily', remaining: 10_000, resets_at: '2026-10-13T17:00:00+00:00' });
const REPLY = 'Em đã đúng ý. Viết lại: "A loop repeats code while a condition is true."';

function provider(replies: Array<string | Error>) {
  const calls: Array<{ system: string; content: string }> = [];
  return {
    calls,
    chat: async function* (messages: Array<{ content: string }>, system: string, _o: unknown, onUsage?: (u: { prompt: number; completion: number; total: number }) => void) {
      calls.push({ system, content: messages[0]!.content });
      const next = replies.shift() ?? '';
      if (next instanceof Error) throw next;
      yield next;
      onUsage?.({ prompt: 300, completion: 120, total: 420 });
    },
  };
}

async function build(user: object | undefined, tables: Record<string, MockBuilder | MockBuilder[]>, ai = provider([REPLY])) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', ai);
  if (user) app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(practiceRoutes);
  await app.ready();
  return { app, ai };
}
const servable = () => ({ questions: ok(writing), lessons: ok([{ id: LESSON }]) });
const feedback = (app: Awaited<ReturnType<typeof build>>['app'], payload: object) =>
  app.inject({ method: 'POST', url: '/api/practice/writing-feedback', payload: payload as Record<string, unknown> });
const names = () => rpcCalls.map(([name, args]) => [name, (args as { p_outcome?: string }).p_outcome].filter(Boolean).join(':'));

beforeEach(() => { rpcCalls.length = 0; });

describe('keyTermsUsed', () => {
  it('matches whole words in any case, with s/es/ed/ing endings', () => {
    expect(keyTermsUsed('Loops REPEATED the code while the conditions hold.', ['loop', 'repeat', 'condition'])).toEqual({ used: ['loop', 'repeat', 'condition'], missing: [] });
    expect(keyTermsUsed('It repeats.', ['loop', 'repeat'])).toEqual({ used: ['repeat'], missing: ['loop'] });
  });

  it('does not count a term inside another word', () => {
    expect(keyTermsUsed('A sloop sails.', ['loop'])).toEqual({ used: [], missing: ['loop'] });
  });

  it('matches multi-word terms with any spacing', () => {
    expect(keyTermsUsed('a  for   loop', ['for loop'])).toEqual({ used: ['for loop'], missing: [] });
  });
});

describe('checking a writing answer', () => {
  it('reports the key terms used and missed, and shows the sample answer', () => {
    expect(checkPracticeAnswer(writing, { writing_answer: 'A loop repeats code.' })).toEqual({
      correct: false,
      writing: { used: ['loop', 'repeat'], missing: ['condition'], sample_answer: writing.data.sample_answer },
    });
  });

  it('is right when every key term is used, or when there are none', () => {
    expect(checkPracticeAnswer(writing, { writing_answer: 'A loop repeats while a condition is true.' }).correct).toBe(true);
    expect(checkPracticeAnswer({ ...writing, data: { ...writing.data, key_terms: undefined } }, { writing_answer: 'Anything.' }).correct).toBe(true);
  });

  it('the check route takes writing answers and refuses empty or wrong-shaped ones', async () => {
    let { app } = await build(undefined, servable());
    const res = await app.inject({ method: 'POST', url: '/api/practice/check', payload: { question_id: Q, response: { writing_answer: 'A loop repeats.' } } });
    expect(res.statusCode).toBe(200);
    expect(res.json().writing.missing).toEqual(['condition']);
    await app.close();
    for (const response of [{ writing_answer: '   ' }, { short_answer: 'loop' }]) {
      ({ app } = await build(undefined, servable()));
      expect((await app.inject({ method: 'POST', url: '/api/practice/check', payload: { question_id: Q, response } })).statusCode).toBe(400);
      await app.close();
    }
  });
});

describe('POST /api/practice/writing-feedback', () => {
  const body = { question_id: Q, answer: 'A loop repeat code when condition true.', language: 'vi' };

  it('needs a signed-in learner', async () => {
    const { app, ai } = await build(undefined, servable());
    expect((await feedback(app, body)).statusCode).toBe(401);
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('holds Professor tokens, asks the AI once, and counts the tokens it used', async () => {
    const { app, ai } = await build(student, { ...servable(), 'rpc:billing_reserve_quota': hold(), 'rpc:billing_settle_quota': ok(true) });
    const res = await feedback(app, body);
    expect(res.statusCode).toBe(200);
    expect(res.json().feedback).toBe(REPLY);
    expect(ai.calls).toHaveLength(1);
    expect(ai.calls[0]!.content).toContain(body.answer);
    expect(ai.calls[0]!.content).toContain(writing.data.sample_answer);
    expect(ai.calls[0]!.system).toMatch(/thầy/);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:commit']);
    expect((rpcCalls[0]![1] as { p_metric?: string }).p_metric).toBe('tutor_tokens');
    expect((rpcCalls[1]![1] as { p_units_used?: number }).p_units_used).toBe(420);
    await app.close();
  });

  it('gives the tokens back when the AI fails or says nothing', async () => {
    for (const reply of [new Error('down'), '   ']) {
      rpcCalls.length = 0;
      const { app } = await build(student, { ...servable(), 'rpc:billing_reserve_quota': hold(), 'rpc:billing_settle_quota': ok(true) }, provider([reply, reply]));
      const res = await feedback(app, body);
      expect(res.statusCode).toBe(502);
      expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
      await app.close();
    }
  });

  it('says so when the tokens are used up, without asking the AI', async () => {
    const { app, ai } = await build(student, {
      ...servable(),
      'rpc:billing_reserve_quota': mockQuery({ data: null, error: { code: 'P0001', message: 'QUOTA_EXCEEDED' } }),
      'rpc:billing_get_effective_quotas': ok([{ metric: 'tutor_tokens', kind: 'daily', quota_limit: 15000, used: 15000, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-10-13T17:00:00+00:00' }]),
    });
    const res = await feedback(app, body);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: 'QUOTA_EXCEEDED' });
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('admins are not counted', async () => {
    const { app } = await build(admin, servable());
    expect((await feedback(app, body)).statusCode).toBe(200);
    expect(names()).toEqual([]);
    await app.close();
  });

  it('refuses another type, an unavailable question and a bad request', async () => {
    let { app } = await build(student, { questions: ok({ ...writing, type: 'mc' }), lessons: ok([{ id: LESSON }]) });
    expect((await feedback(app, body)).statusCode).toBe(400);
    await app.close();
    ({ app } = await build(student, { questions: ok({ ...writing, status: 'draft' }) }));
    expect((await feedback(app, body)).statusCode).toBe(404);
    await app.close();
    ({ app } = await build(student, {}));
    for (const bad of [{ ...body, answer: ' ' }, { ...body, answer: 'x'.repeat(1001) }, { ...body, question_id: 'nope' }, { ...body, language: 'fr' }]) {
      expect((await feedback(app, bad)).statusCode, JSON.stringify(bad).slice(0, 60)).toBe(400);
    }
    await app.close();
  });
});
