import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { adminAnnouncementRoutes } from '../routes/adminAnnouncements.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const admin = { id: 'a0000000-0000-4000-8000-000000000001', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'a0000000-0000-4000-8000-000000000002', app_metadata: { app_role: 'teacher' } };
const REQUEST_ID = '77777777-7777-4777-8777-777777777777';
const SUB_A = '66666666-6666-4666-8666-666666666661';
const SUB_B = '66666666-6666-4666-8666-666666666662';
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const payload = { client_request_id: REQUEST_ID, title_vi: 'Có bài mới', title_en: 'New lessons', body_vi: 'Xem ngay', body_en: 'Take a look', link: '/subjects', send_app: true, send_email: true };
const stored = { id: 'ann-1', ...payload, level: null, app_count: 0, email_count: 0, created_at: '2026-10-12T00:00:00Z' };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>, users: Array<{ id: string; app_metadata?: { app_role?: string } }> = []) {
  const app = Fastify();
  const supabase = mockSupabase(tables) as unknown as { auth: unknown };
  supabase.auth = { admin: { listUsers: async () => ({ data: { users }, error: null }) } };
  app.decorate('supabase', supabase as never);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  await app.register(adminAnnouncementRoutes);
  await app.ready();
  return app;
}

describe('admin announcements', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    process.env.GUEST_TRIAL_SECRET = 'x'.repeat(40);
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'SciPal <hi@example.com>';
    fetchMock.mockReset().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    delete process.env.GUEST_TRIAL_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    vi.unstubAllGlobals();
  });

  it('keeps everyone but admins out', async () => {
    const app = await build(teacher, {});
    expect((await app.inject({ method: 'GET', url: '/api/admin/announcements' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/admin/announcements', payload })).statusCode).toBe(403);
    await app.close();
  });

  it('lets only an admin take an announcement back, clearing its bell notices', async () => {
    const ID = '88888888-8888-4888-8888-888888888888';
    expect((await (await build(teacher, {})).inject({ method: 'DELETE', url: `/api/admin/announcements/${ID}` })).statusCode).toBe(403);
    const notifications = ok();
    const app = await build(admin, { announcements: [ok({ ...stored, id: ID }), ok(null)], notifications });
    expect((await app.inject({ method: 'DELETE', url: `/api/admin/announcements/${ID}` })).statusCode).toBe(204);
    expect(notifications.inCalls).toContainEqual(['kind', ['announcement', 'announcement:good', 'announcement:warn', 'announcement:urgent']]);
    expect(notifications.eqCalls).toContainEqual(['title_en', 'New lessons']);
    expect((await app.inject({ method: 'DELETE', url: '/api/admin/announcements/not-an-id' })).statusCode).toBe(400);
    await app.close();
  });

  it('writes a bell notification per account and e-mails confirmed subscribers with their unsubscribe link', async () => {
    const notifications = ok();
    const subscribers = ok([
      { id: SUB_A, email: 'a@gmail.com', locale: 'vi', levels: ['primary'] },
      { id: SUB_B, email: 'b@gmail.com', locale: 'en', levels: ['upper_secondary'] },
    ]);
    const announcements = [ok(null), ok(stored), ok(null)];
    const app = await build(admin, { announcements, profiles: ok([{ id: 'u1' }, { id: 'u2' }]), notifications, newsletter_subscribers: subscribers });
    const res = await app.inject({ method: 'POST', url: '/api/admin/announcements', payload });
    expect(res.statusCode).toBe(201);
    expect(res.json().announcement).toMatchObject({ app_count: 2, email_count: 2 });
    expect(notifications.inserted[0]).toEqual([
      { user_id: 'u1', kind: 'announcement', title_en: 'New lessons', title_vi: 'Có bài mới', link: '/subjects' },
      { user_id: 'u2', kind: 'announcement', title_en: 'New lessons', title_vi: 'Có bài mới', link: '/subjects' },
    ]);
    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(sent.map((m: { to: string }) => m.to)).toEqual(['a@gmail.com', 'b@gmail.com']);
    expect(sent[1].subject).toBe('New lessons');
    expect(sent[0].headers['List-Unsubscribe']).toContain('/newsletter/unsubscribe?token=');
    expect(subscribers.eqCalls).toContainEqual(['status', 'confirmed']);
    await app.close();
  });

  it('stores the tone, writes it into the bell notice kind and names it in the e-mail', async () => {
    const notifications = ok();
    const subscribers = ok([{ id: SUB_A, email: 'a@gmail.com', locale: 'vi', levels: [] }]);
    const app = await build(admin, { announcements: [ok(null), ok({ ...stored, tone: 'warn' }), ok(null)], profiles: ok([{ id: 'u1' }]), notifications, newsletter_subscribers: subscribers });
    const res = await app.inject({ method: 'POST', url: '/api/admin/announcements', payload: { ...payload, tone: 'warn' } });
    expect(res.statusCode).toBe(201);
    expect((notifications.inserted[0] as Array<{ kind: string }>)[0]!.kind).toBe('announcement:warn');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)[0].html).toContain('Lưu ý');
    await app.close();
  });

  it('defaults the tone to info and rejects an unknown one', async () => {
    const app = await build(admin, { announcements: [ok(null), ok(stored), ok(null)], profiles: ok([{ id: 'u1' }]), notifications: ok(), newsletter_subscribers: ok([]) });
    expect((await app.inject({ method: 'POST', url: '/api/admin/announcements', payload })).statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: '/api/admin/announcements', payload: { ...payload, tone: 'purple' } })).statusCode).toBe(400);
    await app.close();
  });

  it('narrows the e-mail to one level', async () => {
    const subscribers = ok([
      { id: SUB_A, email: 'a@gmail.com', locale: 'vi', levels: ['primary'] },
      { id: SUB_B, email: 'b@gmail.com', locale: 'vi', levels: ['upper_secondary'] },
    ]);
    const app = await build(admin, { announcements: [ok(null), ok({ ...stored, level: 'primary' }), ok(null)], newsletter_subscribers: subscribers });
    const res = await app.inject({ method: 'POST', url: '/api/admin/announcements', payload: { ...payload, send_app: false, level: 'primary' } });
    expect(res.json().announcement.email_count).toBe(1);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).map((m: { to: string }) => m.to)).toEqual(['a@gmail.com']);
    await app.close();
  });

  it('returns the first result for a repeated request id and sends nothing again', async () => {
    const app = await build(admin, { announcements: [ok({ ...stored, app_count: 5 })] });
    const res = await app.inject({ method: 'POST', url: '/api/admin/announcements', payload });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ repeated: true, announcement: { app_count: 5 } });
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('still sends the bell and warns when e-mail is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    const app = await build(admin, { announcements: [ok(null), ok(stored), ok(null)], profiles: ok([{ id: 'u1' }]), notifications: ok() });
    const res = await app.inject({ method: 'POST', url: '/api/admin/announcements', payload });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ warning: 'email_not_configured', announcement: { app_count: 1, email_count: 0 } });
    await app.close();
  });

  it('refuses a missing title, no channel and a javascript link', async () => {
    const app = await build(admin, {});
    for (const bad of [{ ...payload, title_en: ' ' }, { ...payload, send_app: false, send_email: false }, { ...payload, link: 'javascript:alert(1)' }, { ...payload, link: '//evil.test' }, { ...payload, client_request_id: 'nope' }]) {
      expect((await app.inject({ method: 'POST', url: '/api/admin/announcements', payload: bad })).statusCode).toBe(400);
    }
    await app.close();
  });

  it('lists announcements with audience counts', async () => {
    const app = await build(admin, {
      announcements: ok([stored]),
      newsletter_subscribers: ok([{ status: 'confirmed', levels: ['primary'] }, { status: 'confirmed', levels: ['primary', 'upper_secondary'] }, { status: 'pending', levels: ['primary'] }]),
      profiles: mockQuery({ data: null, error: null, count: 42 }),
    });
    const body = (await app.inject({ method: 'GET', url: '/api/admin/announcements' })).json();
    expect(body.audience).toMatchObject({ accounts: 42, confirmed: 2, pending: 1, unsubscribed: 0, confirmedByLevel: { primary: 2, lower_secondary: 0, upper_secondary: 1 } });
    expect(body.emailReady).toBe(true);
    await app.close();
  });

  const U1 = '11111111-1111-4111-8111-111111111111';
  const U2 = '22222222-2222-4222-8222-222222222222';
  const U3 = '33333333-3333-4333-8333-333333333333';

  it('sends the bell only to the chosen accounts that have a profile', async () => {
    const notifications = ok();
    const profiles = ok([{ id: U1 }]);
    const app = await build(admin, { announcements: [ok(null), ok(stored), ok(null)], profiles, notifications });
    const res = await app.inject({ method: 'POST', url: '/api/admin/announcements', payload: { ...payload, send_email: false, audience: { mode: 'users', user_ids: [U1, U2] } } });
    expect(res.statusCode).toBe(201);
    expect(profiles.inCalls).toEqual([['id', [U1, U2]]]);
    expect(notifications.inserted[0]).toEqual([{ user_id: U1, kind: 'announcement', title_en: 'New lessons', title_vi: 'Có bài mới', link: '/subjects' }]);
    expect(res.json().announcement.app_count).toBe(1);
    await app.close();
  });

  it('sends the bell to the accounts of the chosen roles (a missing role counts as student)', async () => {
    const notifications = ok();
    const profiles = ok([{ id: U1 }, { id: U3 }]);
    const users = [{ id: U1, app_metadata: { app_role: 'teacher' } }, { id: U2, app_metadata: { app_role: 'admin' } }, { id: U3 }];
    const app = await build(admin, { announcements: [ok(null), ok(stored), ok(null)], profiles, notifications }, users);
    const res = await app.inject({ method: 'POST', url: '/api/admin/announcements', payload: { ...payload, send_email: false, audience: { mode: 'role', roles: ['teacher', 'student'] } } });
    expect(res.statusCode).toBe(201);
    expect(profiles.inCalls).toEqual([['id', [U1, U3]]]);
    expect(res.json().announcement.app_count).toBe(2);
    await app.close();
  });

  it('refuses an empty, oversized or malformed audience', async () => {
    const app = await build(admin, {});
    const many = Array.from({ length: 201 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    for (const audience of [{ mode: 'users', user_ids: [] }, { mode: 'users', user_ids: ['nope'] }, { mode: 'users', user_ids: many }, { mode: 'role', roles: [] }, { mode: 'role', roles: ['owner'] }, { mode: 'everyone' }]) {
      expect((await app.inject({ method: 'POST', url: '/api/admin/announcements', payload: { ...payload, audience } })).statusCode).toBe(400);
    }
    await app.close();
  });
});
