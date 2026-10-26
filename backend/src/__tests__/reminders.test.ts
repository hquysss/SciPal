import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeToken } from '../newsletter/tokens.js';
import { reminderFor, runReminders } from '../reminders/reminders.js';
import { reminderRoutes } from '../routes/reminders.js';
import { vnHour } from '../streaks/vnDay.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const A = 'a0000000-0000-4000-8000-000000000001';
const B = 'a0000000-0000-4000-8000-000000000002';
const C = 'a0000000-0000-4000-8000-000000000003';
const NOW = new Date('2026-11-02T13:00:00Z'); // 20:00 in Vietnam, 2026-11-02
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const log = { error: vi.fn() };

type Claim = { user_id: string; in_app: boolean; email: boolean };

function stub(claim: { data?: Claim[]; error?: object | null }, tables: Record<string, MockBuilder | MockBuilder[]>, emails: Record<string, string> = {}) {
  const supabase = mockSupabase(tables) as unknown as Record<string, unknown>;
  const rpc = vi.fn().mockResolvedValue({ data: claim.data ?? [], error: claim.error ?? null });
  supabase.rpc = rpc;
  supabase.auth = { admin: { getUserById: async (id: string) => ({ data: { user: emails[id] ? { email: emails[id] } : null } }) } };
  return { supabase: supabase as never, rpc };
}

const days = (...rows: Array<[string, string]>) => ok(rows.map(([user_id, day]) => ({ user_id, day })));

beforeEach(() => {
  process.env.GUEST_TRIAL_SECRET = 'x'.repeat(40);
  log.error.mockReset();
});
afterEach(() => {
  delete process.env.GUEST_TRIAL_SECRET;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  vi.unstubAllGlobals();
});

describe('vnHour', () => {
  it('is the Vietnam hour, midnight as 0', () => {
    expect(vnHour(NOW)).toBe(20);
    expect(vnHour(new Date('2026-11-02T17:00:00Z'))).toBe(0);
    expect(vnHour(new Date('2026-11-02T16:59:00Z'))).toBe(23);
  });
});

describe('reminderFor', () => {
  it('protects a streak of two or more, and otherwise nudges plainly', () => {
    expect(reminderFor(5).title.vi).toBe('Học hôm nay để giữ chuỗi 5 ngày');
    expect(reminderFor(5).title.en).toBe('Study today to keep your 5-day streak');
    expect(reminderFor(2).title.vi).toContain('chuỗi 2 ngày');
    expect(reminderFor(1).title.vi).toBe('Hôm nay bạn chưa học. Chỉ cần 5 phút!');
    expect(reminderFor(0).title.vi).toBe(reminderFor(1).title.vi);
    expect(reminderFor(60).title.vi).toContain('60+');
  });
});

describe('runReminders', () => {
  it('claims the Vietnam day and hour, then notifies each learner with their own streak text', async () => {
    const notifications = ok();
    const { supabase, rpc } = stub(
      { data: [{ user_id: A, in_app: true, email: false }, { user_id: B, in_app: true, email: false }] },
      {
        study_days: days([A, '2026-11-01'], [A, '2026-10-31'], [A, '2026-10-30']), // A: three days in a row up to yesterday
        notifications,
      },
    );
    const summary = await runReminders(supabase, NOW, log);
    expect(rpc).toHaveBeenCalledWith('claim_study_reminders', { p_day: '2026-11-02', p_hour: 20, p_limit: 500 });
    expect(summary).toEqual({ claimed: 2, in_app: 2, emailed: 0 });
    // A and B have different texts, so there are two inserts, one learner each.
    const rows = (notifications.inserted as Array<Array<{ user_id: string; title_vi: string; kind: string; link: string }>>).flat();
    expect(rows.find((r) => r.user_id === A)).toMatchObject({ kind: 'reminder', title_vi: 'Học hôm nay để giữ chuỗi 3 ngày', link: '/progress' });
    expect(rows.find((r) => r.user_id === B)).toMatchObject({ title_vi: 'Hôm nay bạn chưa học. Chỉ cần 5 phút!' });
  });

  it('does nothing when nobody is due', async () => {
    const { supabase } = stub({ data: [] }, {});
    expect(await runReminders(supabase, NOW, log)).toEqual({ claimed: 0, in_app: 0, emailed: 0 });
  });

  it('throws when the claim fails, so the run reports an error', async () => {
    const { supabase } = stub({ error: { message: 'down' } }, {});
    await expect(runReminders(supabase, NOW, log)).rejects.toBeTruthy();
  });

  it('still nudges everyone plainly when the streak read fails', async () => {
    const notifications = ok();
    const { supabase } = stub({ data: [{ user_id: A, in_app: true, email: false }] }, { study_days: mockQuery({ data: null, error: { message: 'down' } }), notifications });
    expect((await runReminders(supabase, NOW, log)).in_app).toBe(1);
    expect((notifications.inserted as any[]).flat()[0].title_vi).toBe('Hôm nay bạn chưa học. Chỉ cần 5 phút!');
    expect(log.error).toHaveBeenCalled();
  });

  it('e-mails only those who asked, each with a signed unsubscribe link, and never in-app for e-mail only', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'SciPal <hi@example.com>';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
    const notifications = ok();
    const { supabase } = stub(
      { data: [{ user_id: A, in_app: false, email: true }, { user_id: B, in_app: true, email: false }, { user_id: C, in_app: true, email: true }] },
      { study_days: days(), notifications },
      { [A]: 'a@example.com', [B]: 'b@example.com', [C]: 'c@example.com' },
    );
    const summary = await runReminders(supabase, NOW, log);
    expect(summary).toEqual({ claimed: 3, in_app: 2, emailed: 2 });
    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body) as Array<{ to: string; html: string; headers: Record<string, string> }>;
    expect(sent.map((e) => e.to)).toEqual(['a@example.com', 'c@example.com']);
    expect(sent[0]!.html).toContain(`/reminders/unsubscribe?token=${encodeURIComponent(makeToken('reminder-off', A)!)}`);
    expect(sent[1]!.html).toContain(encodeURIComponent(makeToken('reminder-off', C)!));
    expect(sent[0]!.headers['List-Unsubscribe']).toContain('/reminders/unsubscribe?token=');
    // The in-app path sent no e-mail of its own (one batch call, the reminder e-mails).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((notifications.inserted as any[]).flat().map((r) => r.user_id).sort()).toEqual([B, C]);
  });

  it('a failed e-mail run does not undo the in-app reminders', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.EMAIL_FROM = 'SciPal <hi@example.com>';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const { supabase } = stub({ data: [{ user_id: A, in_app: true, email: true }] }, { study_days: days(), notifications: ok() }, { [A]: 'a@example.com' });
    expect(await runReminders(supabase, NOW, log)).toEqual({ claimed: 1, in_app: 1, emailed: 0 });
  });
});

describe('reminder routes', () => {
  async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]> = {}, claim: Claim[] = []) {
    const app = Fastify();
    app.decorate('supabase', stub({ data: claim }, tables).supabase);
    app.addHook('onRequest', async (req) => {
      if (user) (req as any).user = user;
    });
    await app.register(reminderRoutes);
    await app.ready();
    return app;
  }

  it('needs a signed-in learner for the settings', async () => {
    const app = await build(null);
    expect((await app.inject({ method: 'GET', url: '/api/me/reminders' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'PATCH', url: '/api/me/reminders', payload: { hour: 20 } })).statusCode).toBe(401);
  });

  it('reads the settings, off by default', async () => {
    const app = await build({ id: A }, { profiles: ok({ reminder_hour: null, reminder_in_app: true, reminder_email: false }) });
    const res = await app.inject({ method: 'GET', url: '/api/me/reminders' });
    expect(res.json()).toEqual({ hour: null, in_app: true, email: false, email_available: false });
  });

  it('saves a valid hour and channels, and turns reminders off with null', async () => {
    const profiles = ok();
    const app = await build({ id: A }, { profiles });
    expect((await app.inject({ method: 'PATCH', url: '/api/me/reminders', payload: { hour: 20, in_app: true, email: true } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PATCH', url: '/api/me/reminders', payload: { hour: null } })).statusCode).toBe(200);
    expect(profiles.updated).toEqual([{ reminder_hour: 20, reminder_in_app: true, reminder_email: true }, { reminder_hour: null }]);
    expect(profiles.eqCalls).toContainEqual(['id', A]);
  });

  it.each([{ hour: 24 }, { hour: -1 }, { hour: 7.5 }, { hour: '20' }, { in_app: 'yes' }, { email: 1 }, {}])('rejects %j', async (payload) => {
    const profiles = ok();
    const app = await build({ id: A }, { profiles });
    expect((await app.inject({ method: 'PATCH', url: '/api/me/reminders', payload })).statusCode).toBe(400);
    expect(profiles.updated).toEqual([]);
  });

  it('unsubscribes the e-mail with a valid token only', async () => {
    const profiles = ok();
    const app = await build(null, { profiles });
    const bad = await app.inject({ method: 'POST', url: '/api/reminders/unsubscribe', payload: { token: `${A}.forged` } });
    expect(bad.statusCode).toBe(400);
    const wrongPurpose = await app.inject({ method: 'POST', url: '/api/reminders/unsubscribe', payload: { token: makeToken('unsubscribe', A) } });
    expect(wrongPurpose.statusCode).toBe(400);
    expect(profiles.updated).toEqual([]);
    const good = await app.inject({ method: 'POST', url: '/api/reminders/unsubscribe', payload: { token: makeToken('reminder-off', A) } });
    expect(good.statusCode).toBe(200);
    expect(profiles.updated).toEqual([{ reminder_email: false }]);
    expect(profiles.eqCalls).toContainEqual(['id', A]);
  });

  it('runs the job only for the cron secret', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    try {
      const app = await build(null);
      expect((await app.inject({ method: 'GET', url: '/api/internal/reminders/run' })).statusCode).toBe(401);
      expect((await app.inject({ method: 'GET', url: '/api/internal/reminders/run', headers: { authorization: 'Bearer nope' } })).statusCode).toBe(401);
      const res = await app.inject({ method: 'GET', url: '/api/internal/reminders/run', headers: { authorization: 'Bearer cron-secret' } });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ claimed: 0, in_app: 0, emailed: 0 });
    } finally {
      delete process.env.CRON_SECRET;
    }
  });
});
