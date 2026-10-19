import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { judgeSettingsRoutes } from '../routes/judgeSettings.js';
import { DEFAULT_JUDGE_LIMITS, capsFor, resolveJudgeLimits } from '../judge/limits.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const counted = (count: number) => mockQuery({ data: null, error: null, count });

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(judgeSettingsRoutes);
  await app.ready();
  return app;
}

describe('judge limits', () => {
  it('fall back to the defaults for what is not set, and ignore a nonsense value', () => {
    expect(resolveJudgeLimits(null)).toEqual(DEFAULT_JUDGE_LIMITS);
    expect(resolveJudgeLimits({ person_submits_per_day: 7, person_runs_per_day: null, global_submits_per_day: 0, global_runs_per_day: null })).toEqual({ ...DEFAULT_JUDGE_LIMITS, personSubmitsPerDay: 7 });
  });
  it('cap submits and trial runs for the person and the site, teacher checks for the person only', () => {
    expect(capsFor('submit', DEFAULT_JUDGE_LIMITS)).toEqual({ person: 20, global: 300 });
    expect(capsFor('run', DEFAULT_JUDGE_LIMITS)).toEqual({ person: 50, global: 1000 });
    expect(capsFor('verify', DEFAULT_JUDGE_LIMITS)).toEqual({ person: 100, global: null });
  });
});

describe('judge settings routes', () => {
  it('are for admins only', async () => {
    const app = await build(teacher, {});
    expect((await app.inject({ method: 'GET', url: '/api/admin/judge-settings' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'PATCH', url: '/api/admin/judge-settings', payload: {} })).statusCode).toBe(403);
    await app.close();
  });

  it('shows the limits in force, the defaults and today’s runs', async () => {
    const app = await build(admin, { judge_settings: ok({ person_submits_per_day: 10, person_runs_per_day: null, global_submits_per_day: 150, global_runs_per_day: null }), code_runs: [counted(12), counted(30)] });
    const body = (await app.inject({ method: 'GET', url: '/api/admin/judge-settings' })).json();
    expect(body.effective).toEqual({ personSubmitsPerDay: 10, personRunsPerDay: 50, globalSubmitsPerDay: 150, globalRunsPerDay: 1000 });
    expect(body.defaults).toEqual(DEFAULT_JUDGE_LIMITS);
    expect(body.usage).toEqual({ submits: 12, runs: 30 });
    await app.close();
  });

  it('saves whole numbers in range (null goes back to the default) and refuses the rest', async () => {
    const upsert = ok();
    const app = await build(admin, { judge_settings: [upsert, ok({ person_submits_per_day: 10 })], code_runs: [counted(0), counted(0)] });
    const res = await app.inject({ method: 'PATCH', url: '/api/admin/judge-settings', payload: { person_submits_per_day: 10, person_runs_per_day: null, global_submits_per_day: 250, global_runs_per_day: 900 } });
    expect(res.statusCode).toBe(200);
    expect(upsert.inserted[0]).toMatchObject({ id: 1, person_submits_per_day: 10, person_runs_per_day: null, global_submits_per_day: 250, global_runs_per_day: 900, updated_by: 'admin-1' });
    for (const bad of [{ person_submits_per_day: 0 }, { person_submits_per_day: 1.5 }, { global_runs_per_day: '5' }, { global_submits_per_day: 2_000_000 }]) {
      expect((await app.inject({ method: 'PATCH', url: '/api/admin/judge-settings', payload: bad })).statusCode).toBe(400);
    }
    await app.close();
  });
});
