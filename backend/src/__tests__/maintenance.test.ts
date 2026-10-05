import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { siteSettingsStore } from '../routes/siteSettings.js';
import { maintenanceHook } from '../site/maintenance.js';

async function build(maintenance: boolean, user?: { app_metadata: { app_role: string } }) {
  const app = Fastify();
  app.decorate('siteSettings', siteSettingsStore(async () => ({ signup_enabled: true, features: {}, maintenance })));
  app.addHook('onRequest', async (req) => {
    if (user) (req as unknown as { user: unknown }).user = user;
  });
  app.addHook('onRequest', maintenanceHook(app));
  app.get('/api/anything', async () => ({ ok: true }));
  app.get('/health', async () => ({ ok: true }));
  app.post('/api/billing/webhooks/payos', async () => ({ ok: true }));
  return app;
}

describe('maintenance mode', () => {
  it('answers 503 to everyone but admins while on', async () => {
    const res = await (await build(true)).inject({ method: 'GET', url: '/api/anything' });
    expect(res.statusCode).toBe(503);
    expect(res.json().code).toBe('MAINTENANCE');
    expect((await (await build(true, { app_metadata: { app_role: 'student' } })).inject({ method: 'GET', url: '/api/anything' })).statusCode).toBe(503);
    expect((await (await build(true, { app_metadata: { app_role: 'admin' } })).inject({ method: 'GET', url: '/api/anything' })).statusCode).toBe(200);
  });

  it('keeps the health check and the payment webhook working', async () => {
    const app = await build(true);
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/api/billing/webhooks/payos' })).statusCode).toBe(200);
  });

  it('does nothing while off', async () => {
    expect((await (await build(false)).inject({ method: 'GET', url: '/api/anything' })).statusCode).toBe(200);
  });
});
