import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { tutorRoutes } from '../routes/tutor.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const C1 = 'c0000000-0000-4000-8000-000000000001';
const student = { id: 'student-1', app_metadata: {} };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const counted = (count: number) => mockQuery({ data: null, error: null, count });
const reservation = (remaining: number, kind: 'daily' | 'monthly' = 'daily') =>
  ok({ operation_id: 'd0000000-0000-4000-8000-000000000001', state: 'reserved', kind, remaining, resets_at: '2026-09-28T17:00:00+00:00' });
const refused = (message: string, code = 'P0001') => mockQuery({ data: null, error: { code, message } });

function provider(chunks: string[], failAfter?: number) {
  const calls: unknown[] = [];
  return {
    calls,
    chat: async function* () {
      calls.push(1);
      for (const [i, c] of chunks.entries()) {
        if (failAfter !== undefined && i === failAfter) throw new Error('provider down');
        yield c;
      }
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
/** A new conversation that is answered and stored. */
const answered = (extra: Record<string, MockBuilder | MockBuilder[]> = {}) => ({
  tutor_messages: [counted(0), ok({ id: 'q1' }), ok([{ role: 'user', content: 'Vòng lặp là gì?' }]), ok()],
  profiles: ok(null),
  tutor_conversations: [ok({ id: C1 }), ok()],
  'rpc:billing_settle_quota': ok(true),
  ...extra,
});

beforeEach(() => { rpcCalls.length = 0; });

describe('Tutor requests follow the plan quota', () => {
  it('holds a request before asking the model and counts it once the answer is stored', async () => {
    const { app } = await build(answered({ 'rpc:billing_reserve_quota': reservation(4) }));
    const res = await ask(app);
    expect(res.statusCode).toBe(200);
    const ev = events(res.body);
    expect(ev.map((e) => e.event)).toEqual(['meta', 'delta', 'done']);
    expect(ev[0].data).toEqual({ conversation_id: C1, remaining: 4, period: 'day' });
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:commit']);
    const hold = rpcCalls[0][1] as { p_user_id: string; p_metric: string; p_request_hash: string; p_units: number };
    expect(hold).toMatchObject({ p_user_id: 'student-1', p_metric: 'tutor_requests', p_units: 1 });
    expect(hold.p_request_hash).toMatch(/^[a-f0-9]{64}$/);
    await app.close();
  });

  it('refuses a request over the daily quota before storing anything or asking the model', async () => {
    const { app, ai } = await build({
      tutor_messages: counted(0),
      profiles: ok(null),
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([{ metric: 'tutor_requests', kind: 'daily', quota_limit: 5, used: 5, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-09-28T17:00:00+00:00' }]),
    });
    const res = await ask(app);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: 'QUOTA_EXCEEDED', remaining: 0, limit: 5, period: 'day', resetsAt: '2026-09-28T17:00:00.000Z' });
    expect(res.json().error).toContain('5 lượt hôm nay');
    expect(res.json().error_en).toContain('5 questions today');
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('says "this month" when a monthly plan runs out', async () => {
    const { app } = await build({
      tutor_messages: counted(0),
      profiles: ok(null),
      'rpc:billing_reserve_quota': refused('QUOTA_EXCEEDED'),
      'rpc:billing_get_effective_quotas': ok([{ metric: 'tutor_requests', kind: 'monthly', quota_limit: 200, used: 200, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-09-30T17:00:00+00:00' }]),
    });
    const res = await ask(app);
    expect(res.json()).toMatchObject({ period: 'month', limit: 200 });
    expect(res.json().error).toContain('200 lượt tháng này');
    await app.close();
  });

  it('gives the request back when the model fails, before or after some text', async () => {
    for (const failAfter of [0, 1]) {
      rpcCalls.length = 0;
      const { app } = await build(
        {
          tutor_messages: [counted(0), ok({ id: 'q1' }), ok([{ role: 'user', content: 'Hỏi' }]), ok(), ok()],
          profiles: ok(null),
          tutor_conversations: [ok({ id: C1 }), ok(), ok()],
          'rpc:billing_reserve_quota': reservation(2),
          'rpc:billing_settle_quota': ok(true),
        },
        provider(['Một phần', ' nữa'], failAfter),
      );
      const ev = events((await ask(app)).body);
      expect(ev.at(-1)!.event).toBe('error');
      expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
      if (failAfter === 0) expect(ev.at(-1)!.data.remaining).toBe(3);
      await app.close();
    }
  });

  it('gives the request back when the question cannot be stored', async () => {
    const { app } = await build({
      tutor_messages: [counted(0), mockQuery({ data: null, error: { message: 'db down' } })],
      profiles: ok(null),
      tutor_conversations: ok({ id: C1 }),
      'rpc:billing_reserve_quota': reservation(2),
      'rpc:billing_settle_quota': ok(true),
    });
    expect((await ask(app)).statusCode).toBe(500);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
    await app.close();
  });

  it('does not answer when the quota cannot be checked (no free pass)', async () => {
    const { app, ai } = await build({ tutor_messages: counted(0), profiles: ok(null), 'rpc:billing_reserve_quota': refused('connection lost', '08006') });
    const res = await ask(app);
    expect(res.statusCode).toBe(503);
    expect(res.json().error_en).toEqual(expect.any(String));
    expect(res.body).not.toContain('connection lost');
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('never meters admins: no quota calls, no daily count, no remaining shown', async () => {
    const { app } = await build(
      {
        tutor_messages: [ok({ id: 'q1' }), ok([{ role: 'user', content: 'Vòng lặp là gì?' }]), ok()],
        profiles: ok(null),
        tutor_conversations: [ok({ id: C1 }), ok()],
      },
      provider(['Gợi ý.']),
      admin,
    );
    const ev = events((await ask(app)).body);
    expect(ev[0].data).toEqual({ conversation_id: C1, remaining: null, period: null });
    expect(ev.at(-1)!.event).toBe('done');
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('shows the smaller of the plan quota and the admin daily cap', async () => {
    const { app } = await build(answered({ tutor_messages: [counted(28), ok({ id: 'q1' }), ok([{ role: 'user', content: 'Hỏi' }]), ok()], 'rpc:billing_reserve_quota': reservation(150, 'monthly') }));
    const ev = events((await ask(app)).body);
    expect(ev[0].data).toEqual({ conversation_id: C1, remaining: 1, period: 'day' });
    await app.close();
  });
});
