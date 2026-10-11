import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { tutorRoutes } from '../routes/tutor.js';
import type { TokenUsage } from '../providers/ai.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const C1 = 'c0000000-0000-4000-8000-000000000001';
const student = { id: 'student-1', app_metadata: {} };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
/** What the student has already had counted today: one row per answer. */
const today = (...tokens: number[]) => ok(tokens.map((value) => ({ tokens: value })));
const reservation = (remaining: number, kind: 'daily' | 'monthly' = 'daily') =>
  ok({ operation_id: 'd0000000-0000-4000-8000-000000000001', state: 'reserved', kind, remaining, resets_at: '2026-09-28T17:00:00+00:00' });
const refused = (message: string, code = 'P0001') => mockQuery({ data: null, error: { code, message } });
const quotaRow = (kind: 'daily' | 'monthly', limit: number, used: number, reserved = 0, resets_at: string | null = null) =>
  ({ metric: 'tutor_tokens', kind, quota_limit: limit, used, reserved, source: 'plan', expires_at: null, resets_at });

function provider(chunks: string[], failAfter?: number, usage?: TokenUsage) {
  const calls: unknown[] = [];
  return {
    calls,
    chat: async function* (_messages: unknown, _system: unknown, _choice?: unknown, onUsage?: (usage: TokenUsage) => void) {
      calls.push(1);
      for (const [i, c] of chunks.entries()) {
        if (failAfter !== undefined && i === failAfter) throw new Error('provider down');
        yield c;
      }
      if (usage) onUsage?.(usage);
    },
  };
}

async function build(tables: Record<string, MockBuilder | MockBuilder[]>, ai = provider(['Gợi ý.']), user: object = student) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', ai);
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(tutorRoutes);
  await app.ready();
  return { app, ai };
}

const ask = (app: Awaited<ReturnType<typeof build>>['app']) => app.inject({ method: 'POST', url: '/api/tutor/chat', payload: { message: 'Vòng lặp là gì?', language: 'vi' } });
const events = (body: string) =>
  body.trim().split('\n\n').map((block) => {
    const [ev, data] = block.split('\n');
    return { event: ev.replace('event: ', ''), data: JSON.parse(data.replace('data: ', '')) };
  });
const names = () => rpcCalls.map(([name, args]) => [name, (args as { p_outcome?: string }).p_outcome].filter(Boolean).join(':'));
const call = (name: string, index = 0) => rpcCalls.filter(([n]) => n === name)[index]![1] as Record<string, unknown>;
/** A new conversation that is answered and stored; `assistant` is the builder that receives the answer row. */
const answered = (assistant: MockBuilder = ok(), extra: Record<string, MockBuilder | MockBuilder[]> = {}) => ({
  tutor_messages: [today(), ok({ id: 'q1' }), ok([{ role: 'user', content: 'Vòng lặp là gì?' }]), assistant],
  profiles: ok(null),
  tutor_conversations: [ok({ id: C1 }), ok()],
  'rpc:billing_settle_quota': ok(true),
  ...extra,
});

beforeEach(() => { rpcCalls.length = 0; });

describe('Tutor tokens follow the plan quota', () => {
  it('reads the tokens left before any chat, taking the held ones off', async () => {
    const { app, ai } = await build({
      tutor_messages: today(),
      'rpc:billing_get_effective_quotas': ok([quotaRow('daily', 15_000, 3_000, 3_000)]),
    });
    const res = await app.inject({ method: 'GET', url: '/api/tutor/quota' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ remaining: 9_000, period: 'day' });
    expect(ai.calls).toHaveLength(0);
    expect(names()).toEqual(['billing_get_effective_quotas']);
    await app.close();
  });

  it('reads the tighter daily cap even for a monthly plan', async () => {
    const { app } = await build({
      tutor_messages: today(60_000, 28_000),
      'rpc:billing_get_effective_quotas': ok([quotaRow('monthly', 600_000, 0)]),
    });
    expect((await app.inject({ method: 'GET', url: '/api/tutor/quota' })).json()).toMatchObject({ remaining: 2_000, period: 'day' });
    await app.close();
  });

  it('reads unlimited quota for admins without a billing call', async () => {
    const { app } = await build({}, provider([]), admin);
    const res = await app.inject({ method: 'GET', url: '/api/tutor/quota' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ remaining: null, period: 'day' });
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('does not invent remaining tokens when quota storage fails', async () => {
    const { app } = await build({ tutor_messages: today(), 'rpc:billing_get_effective_quotas': refused('db down') });
    const res = await app.inject({ method: 'GET', url: '/api/tutor/quota' });
    expect(res.statusCode).toBe(503);
    expect(res.json().code).toBe('BILLING_UNAVAILABLE');
    await app.close();
  });

  it('holds 3,000 tokens before asking the model and counts the tokens the answer really used', async () => {
    const assistant = ok();
    const { app } = await build(answered(assistant, { 'rpc:billing_reserve_quota': reservation(27_000) }), provider(['Gợi ý.'], undefined, { prompt: 1_200, completion: 300, total: 1_500 }));
    const res = await ask(app);
    expect(res.statusCode).toBe(200);
    const ev = events(res.body);
    expect(ev.map((e) => e.event)).toEqual(['meta', 'delta', 'done']);
    // 30,000 were there before the hold; the answer then takes 1,500 of them.
    expect(ev[0].data).toEqual({ conversation_id: C1, remaining: 30_000, period: 'day' });
    expect(ev[2].data).toEqual({ remaining: 28_500, period: 'day' });
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:commit']);
    expect(call('billing_reserve_quota')).toMatchObject({ p_user_id: 'student-1', p_metric: 'tutor_tokens', p_units: 3_000 });
    expect(call('billing_reserve_quota').p_request_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(call('billing_settle_quota')).toMatchObject({ p_outcome: 'commit', p_units_used: 1_500 });
    expect(assistant.inserted[0]).toMatchObject({ role: 'assistant', tokens: 1_500 });
    await app.close();
  });

  it('may count more than it held when a long answer used more', async () => {
    const { app } = await build(answered(ok(), { 'rpc:billing_reserve_quota': reservation(0) }), provider(['Dài.'], undefined, { prompt: 4_000, completion: 5_000, total: 9_000 }));
    const ev = events((await ask(app)).body);
    expect(call('billing_settle_quota')).toMatchObject({ p_units_used: 9_000 });
    expect(ev.at(-1)!.data).toEqual({ remaining: 0, period: 'day' });
    await app.close();
  });

  it('estimates from the text when the provider reports no usage, never at zero', async () => {
    const assistant = ok();
    const { app } = await build(answered(assistant, { 'rpc:billing_reserve_quota': reservation(27_000) }));
    await ask(app);
    const used = call('billing_settle_quota').p_units_used as number;
    expect(used).toBeGreaterThan(0);
    expect(Number.isInteger(used)).toBe(true);
    expect((assistant.inserted[0] as { tokens: number }).tokens).toBe(used);
    await app.close();
  });

  it('refuses a question over the quota before storing anything or asking the model', async () => {
    const { app, ai } = await build({
      tutor_messages: today(),
      profiles: ok(null),
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([quotaRow('daily', 90_000, 90_000, 0, '2026-09-28T17:00:00+00:00')]),
    });
    const res = await ask(app);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: 'QUOTA_EXCEEDED', remaining: 0, limit: 90_000, period: 'day', resetsAt: '2026-09-28T17:00:00.000Z' });
    expect(res.json().error).toContain('90.000 token hôm nay');
    expect(res.json().error_en).toContain('90,000 tokens today');
    expect(ai.calls).toHaveLength(0);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_get_effective_quotas']);
    await app.close();
  });

  it('says "this month" when a monthly plan runs out', async () => {
    const { app } = await build({
      tutor_messages: today(),
      profiles: ok(null),
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([quotaRow('monthly', 600_000, 600_000, 0, '2026-09-30T17:00:00+00:00')]),
    });
    const res = await ask(app);
    expect(res.json()).toMatchObject({ period: 'month', limit: 600_000 });
    expect(res.json().error).toContain('600.000 token tháng này');
    await app.close();
  });

  it('lets the last question use what is left when that is less than a full hold', async () => {
    const { app, ai } = await build(answered(ok(), {
      'rpc:billing_reserve_quota': [refused('QUOTA_EXCEEDED'), reservation(0)],
      'rpc:billing_get_effective_quotas': ok([quotaRow('daily', 90_000, 88_800)]),
    }), provider(['Gợi ý.'], undefined, { prompt: 700, completion: 900, total: 1_600 }));
    const res = await ask(app);
    expect(res.statusCode).toBe(200);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_get_effective_quotas', 'billing_reserve_quota', 'billing_settle_quota:commit']);
    expect(call('billing_reserve_quota', 1)).toMatchObject({ p_units: 1_200 });
    expect(call('billing_reserve_quota', 0).p_operation_id).not.toBe(call('billing_reserve_quota', 1).p_operation_id);
    expect(call('billing_settle_quota')).toMatchObject({ p_units_used: 1_600 });
    expect(ai.calls).toHaveLength(1);
    await app.close();
  });

  it('refuses when nothing is left, even a partial hold', async () => {
    const { app, ai } = await build({
      tutor_messages: today(),
      profiles: ok(null),
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([quotaRow('daily', 90_000, 89_000, 1_000)]),
    });
    expect((await ask(app)).statusCode).toBe(429);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_get_effective_quotas']);
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('gives the tokens back when the model fails, before or after some text, and stores no tokens on a cut-off answer', async () => {
    for (const failAfter of [0, 1]) {
      rpcCalls.length = 0;
      const assistant = ok();
      const { app } = await build(
        {
          tutor_messages: [today(), ok({ id: 'q1' }), ok([{ role: 'user', content: 'Hỏi' }]), assistant, ok()],
          profiles: ok(null),
          tutor_conversations: [ok({ id: C1 }), ok(), ok()],
          'rpc:billing_reserve_quota': reservation(27_000),
          'rpc:billing_settle_quota': ok(true),
        },
        provider(['Một phần', ' nữa'], failAfter),
      );
      const ev = events((await ask(app)).body);
      expect(ev.at(-1)!.event).toBe('error');
      expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
      expect(call('billing_settle_quota')).not.toHaveProperty('p_units_used');
      if (failAfter === 0) expect(ev.at(-1)!.data.remaining).toBe(30_000);
      if (failAfter === 1) expect(assistant.inserted[0]).toMatchObject({ role: 'assistant', tokens: null });
      await app.close();
    }
  });

  it('gives the tokens back when the question cannot be stored', async () => {
    const { app } = await build({
      tutor_messages: [today(), mockQuery({ data: null, error: { message: 'db down' } })],
      profiles: ok(null),
      tutor_conversations: ok({ id: C1 }),
      'rpc:billing_reserve_quota': reservation(27_000),
      'rpc:billing_settle_quota': ok(true),
    });
    expect((await ask(app)).statusCode).toBe(500);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
    await app.close();
  });

  it('does not answer when the quota cannot be checked (no free pass)', async () => {
    const { app, ai } = await build({ tutor_messages: today(), profiles: ok(null), 'rpc:billing_reserve_quota': refused('connection lost', '08006') });
    const res = await ask(app);
    expect(res.statusCode).toBe(503);
    expect(res.json().error_en).toEqual(expect.any(String));
    expect(res.body).not.toContain('connection lost');
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('never meters admins: no quota calls, no daily sum, no remaining shown, no tokens stored', async () => {
    const assistant = ok();
    const { app } = await build(
      {
        tutor_messages: [ok({ id: 'q1' }), ok([{ role: 'user', content: 'Vòng lặp là gì?' }]), assistant],
        profiles: ok(null),
        tutor_conversations: [ok({ id: C1 }), ok()],
      },
      provider(['Gợi ý.'], undefined, { prompt: 10, completion: 5, total: 15 }),
      admin,
    );
    const ev = events((await ask(app)).body);
    expect(ev[0].data).toEqual({ conversation_id: C1, remaining: null, period: null });
    expect(ev.at(-1)).toEqual({ event: 'done', data: { remaining: null, period: null } });
    expect(rpcCalls).toHaveLength(0);
    expect(assistant.inserted[0]).toMatchObject({ role: 'assistant', tokens: null });
    await app.close();
  });

  it('shows the smaller of the plan quota and the admin daily cap', async () => {
    const { app } = await build({ ...answered(ok(), { 'rpc:billing_reserve_quota': reservation(150_000, 'monthly') }), tutor_messages: [today(88_000), ok({ id: 'q1' }), ok([{ role: 'user', content: 'Hỏi' }]), ok()] });
    const ev = events((await ask(app)).body);
    expect(ev[0].data).toEqual({ conversation_id: C1, remaining: 2_000, period: 'day' });
    await app.close();
  });

  it('refuses once the admin daily cap is spent, without holding anything', async () => {
    const { app, ai } = await build({ tutor_messages: today(50_000, 40_000), profiles: ok(null) });
    const res = await ask(app);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ remaining: 0, period: 'day' });
    expect(res.json().error).toContain('hạn mức');
    expect(rpcCalls).toHaveLength(0);
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });
});
