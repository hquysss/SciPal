import { afterEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { adminScheduledRoutes } from '../routes/adminScheduled.js';
import { authPlugin } from '../plugins/auth.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'a0000000-0000-4000-8000-000000000002', app_metadata: { app_role: 'teacher' } };
const ID = '99999999-9999-4999-8999-999999999999';
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const inAnHour = () => new Date(Date.now() + 3_600_000).toISOString();
const announcement = { title_vi: 'Bảo trì', title_en: 'Maintenance', body_vi: '', body_en: '', send_app: true, send_email: false };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables) as never);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  await app.register(adminScheduledRoutes);
  await app.ready();
  return app;
}

describe('scheduled actions', () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('keeps everyone but admins out', async () => {
    const app = await build(teacher, {});
    expect((await app.inject({ method: 'GET', url: '/api/admin/scheduled' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/admin/scheduled', payload: { kind: 'maintenance_on', run_at: inAnHour() } })).statusCode).toBe(403);
    await app.close();
  });

  it('stores a future item and refuses a past time, an unknown kind or a bad announcement', async () => {
    const scheduled = ok({ id: ID, kind: 'maintenance_on' });
    const app = await build(admin, { scheduled_actions: scheduled });
    const post = (payload: object) => app.inject({ method: 'POST', url: '/api/admin/scheduled', payload });
    expect((await post({ kind: 'maintenance_on', run_at: inAnHour() })).statusCode).toBe(201);
    expect((await post({ kind: 'maintenance_on', run_at: new Date(Date.now() - 1000).toISOString() })).statusCode).toBe(400);
    expect((await post({ kind: 'reboot', run_at: inAnHour() })).statusCode).toBe(400);
    expect((await post({ kind: 'announcement', run_at: inAnHour(), payload: { ...announcement, title_vi: '' } })).statusCode).toBe(400);
    await app.close();
  });

  it('cancels only a pending item', async () => {
    const gone = await build(admin, { scheduled_actions: ok([]) });
    expect((await gone.inject({ method: 'DELETE', url: `/api/admin/scheduled/${ID}` })).statusCode).toBe(404);
    const live = ok([{ id: ID }]);
    const app = await build(admin, { scheduled_actions: live });
    expect((await app.inject({ method: 'DELETE', url: `/api/admin/scheduled/${ID}` })).statusCode).toBe(204);
    expect(live.eqCalls).toContainEqual(['status', 'pending']);
    await app.close();
  });

  it('runs only with the cron secret, switches maintenance on for a due item and marks it done', async () => {
    process.env.CRON_SECRET = 'c'.repeat(40);
    const due = ok([{ id: ID, kind: 'maintenance_on', run_at: new Date().toISOString(), payload: {}, status: 'pending' }]);
    const claim = ok([{ id: ID }]);
    const finish = ok(null);
    const site = ok(null);
    const app = await build(null, { scheduled_actions: [due, claim, finish], site_settings: site });
    expect((await app.inject({ method: 'GET', url: '/api/internal/scheduled/run' })).statusCode).toBe(401);
    const res = await app.inject({ method: 'GET', url: '/api/internal/scheduled/run', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(res.json()).toEqual({ done: 1, failed: 0 });
    expect(site.updated[0]).toMatchObject({ maintenance: true });
    expect(finish.updated[0]).toMatchObject({ status: 'done' });
    await app.close();
  });

  it('lets the cron secret past the real auth hook', async () => {
    process.env.CRON_SECRET = 'c'.repeat(40);
    const app = Fastify();
    app.decorate('supabase', mockSupabase({ scheduled_actions: ok([]) }) as never);
    await app.register(authPlugin);
    await app.register(adminScheduledRoutes);
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/internal/scheduled/run', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ done: 0, failed: 0 });
    await app.close();
  });

  it('skips an item another runner already claimed', async () => {
    process.env.CRON_SECRET = 'c'.repeat(40);
    const due = ok([{ id: ID, kind: 'maintenance_off', run_at: new Date().toISOString(), payload: {}, status: 'pending' }]);
    const site = ok(null);
    const app = await build(null, { scheduled_actions: [due, ok([])], site_settings: site });
    const res = await app.inject({ method: 'GET', url: '/api/internal/scheduled/run', headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(res.json()).toEqual({ done: 0, failed: 0 });
    expect(site.updated).toEqual([]);
    await app.close();
  });
});
