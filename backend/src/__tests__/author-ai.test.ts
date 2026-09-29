import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authorAiRoutes } from '../routes/authorAi.js';
import { parseDraft } from '../authoring/authorAiPrompt.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const OP = '66666666-6666-4666-8666-666666666666';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const refused = (message: string, code = 'P0001') => mockQuery({ data: null, error: { code, message } });
const hold = (remaining: number) => ok({ operation_id: OP, state: 'reserved', kind: 'monthly', remaining, resets_at: '2026-09-30T17:00:00+00:00' });
const GOOD = JSON.stringify({ blocks: [{ vi: '## Vòng lặp\nVòng lặp **for** lặp $n$ lần.', en: '## Loops\nA **for** loop runs $n$ times.' }] });

function provider(replies: Array<string | Error>) {
  const calls: Array<{ system: string; content: string }> = [];
  return {
    calls,
    chat: async function* (messages: Array<{ content: string }>, system: string) {
      calls.push({ system, content: messages[0].content });
      const next = replies.shift() ?? '';
      if (next instanceof Error) throw next;
      yield next;
    },
  };
}

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>, ai = provider([GOOD])) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', ai);
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(authorAiRoutes);
  await app.ready();
  return { app, ai };
}
const body = { operation_id: OP, topic: 'Vòng lặp for', grade: 10, language: 'vi', request: 'Giải thích kèm ví dụ Python.' };
const draft = (app: Awaited<ReturnType<typeof build>>['app'], payload: object = body) =>
  app.inject({ method: 'POST', url: '/api/authoring/ai-draft', payload: payload as Record<string, unknown> });
const names = () => rpcCalls.map(([name, args]) => [name, (args as { p_outcome?: string }).p_outcome].filter(Boolean).join(':'));

beforeEach(() => { rpcCalls.length = 0; });

describe('parseDraft', () => {
  it('keeps 1–8 bilingual theory sections and refuses anything else', () => {
    expect(parseDraft(`Đây là bản nháp:\n${GOOD}`)).toEqual([{ type: 'theory', content: { vi: '## Vòng lặp\nVòng lặp **for** lặp $n$ lần.', en: '## Loops\nA **for** loop runs $n$ times.' } }]);
    expect(parseDraft('{"blocks":[]}')).toBeNull();
    expect(parseDraft('{"blocks":[{"vi":"x"}]}')).toBeNull();
    expect(parseDraft(JSON.stringify({ blocks: Array(9).fill({ vi: 'a', en: 'b' }) }))).toBeNull();
    expect(parseDraft('not json')).toBeNull();
  });
});

describe('POST /api/authoring/ai-draft', () => {
  it('writes a draft for a Pro teacher, stores it, then counts the request', async () => {
    const store = ok();
    const { app, ai } = await build(teacher, { author_ai_drafts: [ok(null), store], 'rpc:billing_reserve_quota': hold(99), 'rpc:billing_settle_quota': ok(true) });
    const res = await draft(app);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ blocks: [expect.objectContaining({ type: 'theory' })], remaining: 99, period: 'month', replayed: false });
    expect(store.inserted[0]).toMatchObject({ operation_id: OP, user_id: 'teacher-1', blocks: [expect.objectContaining({ type: 'theory' })] });
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:commit']);
    expect(rpcCalls[0][1]).toMatchObject({ p_metric: 'author_ai_requests', p_operation_id: OP });
    expect(ai.calls[0].system).toMatch(/GDPT 2018/);
    expect(ai.calls[0].content).toContain('Vòng lặp for');
    await app.close();
  });

  it('refuses a Free teacher (0 a month) before asking the model', async () => {
    const { app, ai } = await build(teacher, {
      author_ai_drafts: ok(null),
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([{ metric: 'author_ai_requests', kind: 'monthly', quota_limit: 0, used: 0, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-09-30T17:00:00+00:00' }]),
    });
    const res = await draft(app);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: 'QUOTA_EXCEEDED', limit: 0 });
    expect(res.json().error).toContain('Teacher Pro');
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('refuses students, even with a custom quota', async () => {
    const { app } = await build(student, {});
    expect((await draft(app)).statusCode).toBe(403);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('gives the request back when the model fails or answers something invalid twice', async () => {
    for (const replies of [[new Error('down'), new Error('down')], ['nope', '{"blocks":[]}']]) {
      rpcCalls.length = 0;
      const { app } = await build(teacher, { author_ai_drafts: ok(null), 'rpc:billing_reserve_quota': hold(5), 'rpc:billing_settle_quota': ok(true) }, provider(replies as Array<string | Error>));
      const res = await draft(app);
      expect(res.statusCode).toBe(502);
      expect(res.json().error_en).toEqual(expect.any(String));
      expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
      await app.close();
    }
  });

  it('answers the stored draft for a retried request, without a new charge or model call', async () => {
    const stored = { operation_id: OP, user_id: 'teacher-1', request_hash: 'x', blocks: [{ type: 'theory', content: { vi: 'A', en: 'B' } }] };
    const { app, ai } = await build(teacher, { author_ai_drafts: ok(stored) });
    const res = await draft(app);
    expect(res.json()).toEqual({ blocks: stored.blocks, remaining: null, period: null, replayed: true });
    expect(ai.calls).toHaveLength(0);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('does not meter admins and refuses bad input', async () => {
    const { app } = await build(admin, { author_ai_drafts: [ok(null), ok()] });
    const res = await draft(app);
    expect(res.statusCode).toBe(200);
    expect(res.json().remaining).toBeNull();
    expect(rpcCalls).toHaveLength(0);
    for (const bad of [{ ...body, operation_id: 'x' }, { ...body, topic: '' }, { ...body, grade: 13 }, { ...body, request: 'x'.repeat(8001) }, { ...body, language: 'fr' }]) {
      expect((await draft(app, bad)).statusCode).toBe(400);
    }
    await app.close();
  });
});

describe('AI drafts counted per day', () => {
  it('says "today" when the day\'s drafts are used up', async () => {
    const { app } = await build(teacher, {
      author_ai_drafts: ok(null),
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([{ metric: 'author_ai_requests', kind: 'daily', quota_limit: 5, used: 5, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-09-29T17:00:00+00:00' }]),
    });
    const res = await draft(app);
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toContain('5 lượt AI soạn bài hôm nay');
    expect(res.json().period).toBe('day');
    await app.close();
  });
});
