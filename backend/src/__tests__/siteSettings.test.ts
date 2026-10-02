import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { siteSettingsRoutes, siteSettingsStore } from '../routes/siteSettings.js';
import { featureAllowed, resolveSiteSettings } from '../site/features.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };
const ok = (data: unknown = null) => mockQuery({ data, error: null });

describe('resolveSiteSettings', () => {
  it('turns on whatever is not switched off, sign-up included', () => {
    expect(resolveSiteSettings(null)).toEqual({ signupEnabled: true, features: { glossary: true, exam: true, pricing: true, classes: true, tutor: true, guest_trial: true } });
    expect(resolveSiteSettings({ signup_enabled: false, features: { exam: false, glossary: 'no', unknown: false } })).toEqual({
      signupEnabled: false,
      features: { glossary: true, exam: false, pricing: true, classes: true, tutor: true, guest_trial: true },
    });
  });
});

describe('featureAllowed', () => {
  const app = { siteSettings: siteSettingsStore(async () => ({ signup_enabled: true, features: { exam: false } })) };
  it('refuses a switched-off feature to everyone but admins', async () => {
    expect(await featureAllowed(app, 'exam', student)).toBe(false);
    expect(await featureAllowed(app, 'exam')).toBe(false);
    expect(await featureAllowed(app, 'exam', admin)).toBe(true);
    expect(await featureAllowed(app, 'glossary', student)).toBe(true);
  });
  it('keeps everything on when the switches cannot be read', async () => {
    const broken = { siteSettings: siteSettingsStore(async () => { throw new Error('down'); }) };
    expect(await featureAllowed(broken, 'exam', student)).toBe(true);
    expect(await featureAllowed({}, 'exam', student)).toBe(true);
  });
});

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  let invalidated = 0;
  app.decorate('siteSettings', { get: async () => resolveSiteSettings(null), invalidate: () => { invalidated += 1; } });
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(siteSettingsRoutes);
  await app.ready();
  return { app, invalidated: () => invalidated };
}

describe('site settings routes', () => {
  it('are for admins only', async () => {
    const { app } = await build(student, {});
    expect((await app.inject({ method: 'GET', url: '/api/admin/site-settings' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'PATCH', url: '/api/admin/site-settings', payload: { signup_enabled: false, features: {} } })).statusCode).toBe(403);
    await app.close();
  });

  it('saves the switches, clears the cache and refuses unknown features', async () => {
    const upsert = ok({ signup_enabled: false, features: { exam: false }, updated_at: 't' });
    const { app, invalidated } = await build(admin, { site_settings: [upsert] });
    const res = await app.inject({ method: 'PATCH', url: '/api/admin/site-settings', payload: { signup_enabled: false, features: { exam: false } } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ signupEnabled: false, features: { exam: false, glossary: true } });
    expect(upsert.inserted[0]).toMatchObject({ id: 1, signup_enabled: false, features: { exam: false }, updated_by: 'admin-1' });
    expect(invalidated()).toBe(1);
    for (const payload of [{ signup_enabled: 'no', features: {} }, { signup_enabled: true, features: { teleport: false } }, { signup_enabled: true, features: { exam: 'off' } }, { signup_enabled: true }]) {
      expect((await app.inject({ method: 'PATCH', url: '/api/admin/site-settings', payload })).statusCode).toBe(400);
    }
    await app.close();
  });
});
