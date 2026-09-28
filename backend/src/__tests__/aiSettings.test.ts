import { afterEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { aiSettingsRoutes } from '../routes/aiSettings.js';
import { createSettingsStore } from '../tutor/settings.js';
import type { AIProvider } from '../providers/ai.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const counted = (count: number) => mockQuery({ data: null, error: null, count });
const saved = { GEMINI_API_KEY: process.env.GEMINI_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY };

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
});

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>, ai: AIProvider = { chat: async function* () { yield 'OK'; } }) {
  const app = Fastify();
  const supabase = mockSupabase(tables);
  app.decorate('supabase', supabase);
  app.decorate('aiProvider', ai);
  let invalidated = 0;
  const store = createSettingsStore(async () => null, {});
  app.decorate('tutorSettings', { get: store.get, invalidate: () => { invalidated += 1; store.invalidate(); } });
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(aiSettingsRoutes);
  await app.ready();
  return { app, invalidated: () => invalidated };
}

const usage = () => [counted(4), counted(25), ok([{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'a' }])];

describe('AI settings routes', () => {
  it('are for admins only', async () => {
    const { app } = await build(teacher, {});
    for (const [method, url] of [['GET', '/api/admin/ai-settings'], ['PATCH', '/api/admin/ai-settings'], ['POST', '/api/admin/ai-settings/test']] as const) {
      expect((await app.inject({ method, url, payload: method === 'GET' ? undefined : {} })).statusCode).toBe(403);
    }
    await app.close();
  });

  it('shows the saved row, the effective settings, which keys are set (never their values) and usage', async () => {
    process.env.GEMINI_API_KEY = 'secret-gemini';
    delete process.env.OPENAI_API_KEY;
    const { app } = await build(admin, {
      ai_settings: ok({ provider: 'openai', model: null, daily_limit: 12, enabled: true, updated_at: 't' }),
      tutor_messages: usage(),
    });
    const res = await app.inject({ method: 'GET', url: '/api/admin/ai-settings' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.effective).toEqual({ provider: 'openai', model: 'gpt-4o-mini', dailyLimit: 12, enabled: true });
    expect(body.keys).toEqual({ gemini: true, openai: false });
    expect(body.usage).toEqual({ today: 4, week: 25, students_week: 2 });
    expect(body.defaults).toEqual({ gemini: 'gemini-3.8-flash', openai: 'gpt-4o-mini' });
    expect(res.body).not.toContain('secret-gemini');
    await app.close();
  });

  it('saves valid settings, clears the cache, and refuses bad input', async () => {
    const upsert = ok({ provider: 'gemini', model: 'gemini-3.8-flash-lite', daily_limit: 10, enabled: false, updated_at: 't' });
    const { app, invalidated } = await build(admin, { ai_settings: [upsert, ok({ provider: 'gemini', model: 'gemini-3.8-flash-lite', daily_limit: 10, enabled: false, updated_at: 't' })], tutor_messages: usage() });
    const res = await app.inject({ method: 'PATCH', url: '/api/admin/ai-settings', payload: { provider: 'gemini', model: ' gemini-3.8-flash-lite ', daily_limit: 10, enabled: false } });
    expect(res.statusCode).toBe(200);
    expect(upsert.inserted[0]).toMatchObject({ id: 1, provider: 'gemini', model: 'gemini-3.8-flash-lite', daily_limit: 10, enabled: false, updated_by: 'admin-1' });
    expect(invalidated()).toBe(1);

    for (const payload of [
      { provider: 'claude', model: null, daily_limit: null, enabled: true },
      { provider: 'gemini', model: 'bad model!', daily_limit: null, enabled: true },
      { provider: 'gemini', model: null, daily_limit: 0, enabled: true },
      { provider: 'gemini', model: null, daily_limit: 201, enabled: true },
      { provider: 'gemini', model: null, daily_limit: null, enabled: 'yes' },
    ]) {
      expect((await app.inject({ method: 'PATCH', url: '/api/admin/ai-settings', payload })).statusCode).toBe(400);
    }
    await app.close();
  });

  it('tests the connection with the effective provider and model, and reports the provider’s error', async () => {
    const choices: unknown[] = [];
    const good = await build(admin, {}, { chat: async function* (_m: unknown, _s: string, choice?: unknown) { choices.push(choice); yield 'OK'; } });
    const res = await good.app.inject({ method: 'POST', url: '/api/admin/ai-settings/test' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, reply: 'OK', provider: 'gemini', model: 'gemini-3.8-flash' });
    expect(choices[0]).toEqual({ provider: 'gemini', model: 'gemini-3.8-flash' });
    await good.app.close();

    const bad = await build(admin, {}, { chat: async function* () { throw new Error('404 model not found'); } });
    const failed = await bad.app.inject({ method: 'POST', url: '/api/admin/ai-settings/test' });
    expect(failed.statusCode).toBe(200);
    expect(failed.json()).toMatchObject({ ok: false, error: '404 model not found' });
    await bad.app.close();
  });
});
