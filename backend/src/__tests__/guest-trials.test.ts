import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { guestRoutes } from '../routes/guest.js';
import { clientIp, visitorHash } from '../guest/visitor.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const SECRET = 'test-guest-secret-0123456789abcdef0123';
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const hashOf = (ip: string) => createHmac('sha256', SECRET).update(ip).digest('hex');

function provider(chunks: string[], fail = false) {
  const calls: Array<{ messages: unknown; system: string }> = [];
  return {
    calls,
    chat: async function* (messages: unknown, system: string) {
      calls.push({ messages, system });
      if (fail) throw new Error('provider down');
      for (const c of chunks) yield c;
    },
  };
}

async function build(tables: Record<string, MockBuilder | MockBuilder[]>, ai = provider(['Thử ', 'nghĩ xem.'])) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.decorate('aiProvider', ai);
  await app.register(guestRoutes);
  await app.ready();
  return { app, ai };
}

beforeEach(() => {
  rpcCalls.length = 0;
  process.env.GUEST_TRIAL_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.GUEST_TRIAL_SECRET;
});

describe('visitor', () => {
  it('takes the address Vercel sets, not a list a browser could add to', () => {
    expect(clientIp({ headers: { 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9, 1.2.3.4' }, ip: '10.0.0.1' })).toBe('1.2.3.4');
    expect(clientIp({ headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.2' }, ip: '10.0.0.1' })).toBe('5.6.7.8');
    expect(clientIp({ headers: {}, ip: '10.0.0.1' })).toBe('10.0.0.1');
  });

  it('keeps only an HMAC of the address', () => {
    expect(visitorHash('1.2.3.4', SECRET)).toBe(hashOf('1.2.3.4'));
    expect(visitorHash('1.2.3.4', SECRET)).not.toContain('1.2.3.4');
  });
});

describe('POST /api/guest/trial (from the web middleware)', () => {
  const open = (app: Awaited<ReturnType<typeof build>>['app'], headers: Record<string, string>, payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: '/api/guest/trial', headers, payload });

  it('opens or reads the trial of a feature for the visitor the web names', async () => {
    const { app } = await build({ 'rpc:guest_trial_open': ok({ allowed: true, expires_at: '2026-09-30T03:30:00+00:00', resets_at: '2026-10-01T03:00:00+00:00' }) });
    const res = await open(app, { 'x-guest-key': SECRET }, { feature: 'learn', ip: '1.2.3.4' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ allowed: true, expiresAt: '2026-09-30T03:30:00.000Z', resetsAt: '2026-10-01T03:00:00.000Z' });
    expect(rpcCalls[0]).toEqual(['guest_trial_open', { p_visitor: hashOf('1.2.3.4'), p_feature: 'learn', p_window_minutes: 30 }]);
    await app.close();
  });

  it('answers only the web (shared key), and only for page features', async () => {
    const { app } = await build({});
    expect((await open(app, {}, { feature: 'learn', ip: '1.2.3.4' })).statusCode).toBe(401);
    expect((await open(app, { 'x-guest-key': 'wrong-key-of-some-length-000000000000' }, { feature: 'learn', ip: '1.2.3.4' })).statusCode).toBe(401);
    expect((await open(app, { 'x-guest-key': SECRET }, { feature: 'tutor', ip: '1.2.3.4' })).statusCode).toBe(400);
    expect((await open(app, { 'x-guest-key': SECRET }, { feature: 'learn', ip: '' })).statusCode).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });

  it('is off until the secret is configured', async () => {
    delete process.env.GUEST_TRIAL_SECRET;
    const { app } = await build({});
    expect((await open(app, { 'x-guest-key': SECRET }, { feature: 'learn', ip: '1.2.3.4' })).statusCode).toBe(503);
    await app.close();
  });
});

describe('POST /api/tutor/guest (one question for a visitor)', () => {
  const ask = (app: Awaited<ReturnType<typeof build>>['app'], message = 'Vòng lặp là gì?', ip = '1.2.3.4') =>
    app.inject({ method: 'POST', url: '/api/tutor/guest', headers: { 'x-real-ip': ip }, payload: { message, language: 'vi' } });

  it('answers the first question of a visitor, counted by their address', async () => {
    const { app, ai } = await build({ 'rpc:guest_tutor_claim': ok('claimed') });
    const res = await ask(app);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ answer: 'Thử nghĩ xem.' });
    expect(rpcCalls[0]).toEqual(['guest_tutor_claim', { p_visitor: hashOf('1.2.3.4'), p_daily_cap: 200 }]);
    expect(ai.calls[0].messages).toEqual([{ role: 'user', content: 'Vòng lặp là gì?' }]);
    await app.close();
  });

  it('asks the visitor to sign in for a second question, and says when guests are too many today', async () => {
    const { app, ai } = await build({ 'rpc:guest_tutor_claim': [ok('used'), ok('busy')] });
    const used = await ask(app);
    expect(used.statusCode).toBe(429);
    expect(used.json()).toMatchObject({ code: 'GUEST_TRIAL_USED' });
    expect(used.json().error).toContain('Đăng nhập');
    const busy = await ask(app);
    expect(busy.statusCode).toBe(429);
    expect(busy.json().code).toBe('GUEST_TUTOR_BUSY');
    expect(ai.calls).toHaveLength(0);
    await app.close();
  });

  it('gives the question back when the model fails', async () => {
    const { app } = await build({ 'rpc:guest_tutor_claim': ok('claimed'), 'rpc:guest_tutor_release': ok() }, provider([], true));
    const res = await ask(app);
    expect(res.statusCode).toBe(502);
    expect(rpcCalls.map(([name]) => name)).toEqual(['guest_tutor_claim', 'guest_tutor_release']);
    await app.close();
  });

  it('refuses an empty or too long question before counting it', async () => {
    const { app } = await build({});
    expect((await ask(app, '   ')).statusCode).toBe(400);
    expect((await ask(app, 'x'.repeat(2001))).statusCode).toBe(400);
    expect(rpcCalls).toHaveLength(0);
    await app.close();
  });
});
