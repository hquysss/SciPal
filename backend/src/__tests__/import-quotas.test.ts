import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { examImportRoutes } from '../routes/examImport.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';

const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const bi = (vi: string) => ({ vi, en: `${vi} (en)` });
const mc = (key: string) => ({ key, subject_slug: 'informatics', type: 'mc' as const, difficulty: 1, stem: bi(`Câu ${key}`), options: [{ id: 'A', text: bi('Một') }, { id: 'B', text: bi('Hai') }], answer: 'A' });
const pkg = { questions: [mc('q1'), mc('q2')], blueprints: [] };
const hold = ok({ operation_id: '55555555-5555-4555-8555-555555555555', state: 'reserved', kind: 'monthly', remaining: 4, resets_at: '2026-09-30T17:00:00+00:00' });

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase({ subjects: ok([{ id: 'subject-1', slug: 'informatics' }]), ...tables }));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(examImportRoutes);
  await app.ready();
  return app;
}
const send = (app: Awaited<ReturnType<typeof build>>) => app.inject({ method: 'POST', url: '/api/authoring/content-import', payload: pkg });
const names = () => rpcCalls.map(([name, args]) => [name, (args as { p_outcome?: string }).p_outcome].filter(Boolean).join(':'));

beforeEach(() => { rpcCalls.length = 0; });

describe('imported files follow the plan quota', () => {
  it('holds one file for a teacher and counts it once the import is saved', async () => {
    const app = await build(teacher, { questions: ok(), 'rpc:billing_reserve_quota': hold, 'rpc:billing_settle_quota': ok(true) });
    const res = await send(app);
    expect(res.statusCode).toBe(201);
    expect(res.json().remaining).toBe(4);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:commit']);
    expect(rpcCalls[0][1]).toMatchObject({ p_user_id: 'teacher-1', p_metric: 'import_files', p_units: 1 });
    await app.close();
  });

  it('refuses a file over the month before saving anything', async () => {
    const questions = ok();
    const app = await build(teacher, {
      questions,
      'rpc:billing_reserve_quota': mockQuery({ data: null, error: { code: 'P0001', message: 'QUOTA_EXCEEDED' } }),
      'rpc:billing_get_effective_quotas': ok([{ metric: 'import_files', kind: 'monthly', quota_limit: 5, used: 5, reserved: 0, source: 'plan', expires_at: null, resets_at: '2026-09-30T17:00:00+00:00' }]),
    });
    const res = await send(app);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: 'QUOTA_EXCEEDED', limit: 5 });
    expect(res.json().error).toContain('5 tệp');
    expect(questions.inserted).toHaveLength(0);
    await app.close();
  });

  it('gives the file back when saving fails, and does not meter admins', async () => {
    const app = await build(teacher, { questions: [mockQuery({ data: null, error: { message: 'db down' } }), ok()], 'rpc:billing_reserve_quota': hold, 'rpc:billing_settle_quota': ok(true) });
    expect((await send(app)).statusCode).toBe(500);
    expect(names()).toEqual(['billing_reserve_quota', 'billing_settle_quota:release']);
    await app.close();

    rpcCalls.length = 0;
    const adminApp = await build(admin, { questions: ok() });
    expect((await send(adminApp)).statusCode).toBe(201);
    expect(rpcCalls).toHaveLength(0);
    await adminApp.close();
  });
});
