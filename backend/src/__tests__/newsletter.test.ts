import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { newsletterRoutes } from '../routes/newsletter.js';
import { makeToken, readToken } from '../newsletter/tokens.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const SECRET = 'x'.repeat(40);
const SUB_ID = '66666666-6666-4666-8666-666666666666';
const account = { id: 'student-1', email: 'an@gmail.com' };
const valid = { email: ' Khach@Gmail.com ', levels: ['primary', 'lower_secondary'], locale: 'vi' };

async function build(user: object | null, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables) as never);
  app.addHook('onRequest', async (req) => {
    if (user) (req as any).user = user;
  });
  await app.register(newsletterRoutes);
  await app.ready();
  return app;
}

const none = () => mockQuery({ data: null, error: null, count: 0 });
const saved = () => mockQuery({ data: { id: SUB_ID }, error: null });

describe('newsletter tokens', () => {
  beforeEach(() => { process.env.GUEST_TRIAL_SECRET = SECRET; });
  afterEach(() => { delete process.env.GUEST_TRIAL_SECRET; });

  it('only reads back a token made for the same purpose and id', () => {
    const token = makeToken('confirm', SUB_ID)!;
    expect(readToken('confirm', token)).toBe(SUB_ID);
    expect(readToken('unsubscribe', token)).toBeNull();
    expect(readToken('confirm', token.slice(0, -1) + '0')).toBeNull();
    expect(readToken('confirm', 'nonsense')).toBeNull();
    expect(readToken('confirm', undefined)).toBeNull();
  });
});

describe('subscribing to the newsletter', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    process.env.GUEST_TRIAL_SECRET = SECRET;
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

  it('stores a pending visitor and sends the confirmation link', async () => {
    const insert = saved();
    const app = await build(null, { newsletter_subscribers: [none(), none(), insert] });
    const res = await app.inject({ method: 'POST', url: '/api/newsletter/subscribe', payload: valid });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ ok: true, confirmed: false });
    expect(insert.inserted[0]).toMatchObject({ email: 'khach@gmail.com', status: 'pending', levels: ['primary', 'lower_secondary'], locale: 'vi', user_id: null });
    const sent = JSON.parse(fetchMock.mock.calls[0]![1].body)[0];
    expect(sent.to).toBe('khach@gmail.com');
    expect(sent.html).toContain(`/newsletter/confirm?token=${encodeURIComponent(makeToken('confirm', SUB_ID)!)}`);
    await app.close();
  });

  it('confirms at once for an account using its own address, without e-mail', async () => {
    const insert = saved();
    const app = await build(account, { newsletter_subscribers: [none(), none(), insert] });
    const res = await app.inject({ method: 'POST', url: '/api/newsletter/subscribe', payload: { ...valid, email: 'AN@gmail.com' } });
    expect(res.json()).toEqual({ ok: true, confirmed: true });
    expect(insert.inserted[0]).toMatchObject({ status: 'confirmed', user_id: 'student-1' });
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('answers the same and changes nothing for a confirmed address', async () => {
    const found = mockQuery({ data: { id: SUB_ID, status: 'confirmed', last_sent_at: null }, error: null });
    const app = await build(null, { newsletter_subscribers: [none(), found] });
    const res = await app.inject({ method: 'POST', url: '/api/newsletter/subscribe', payload: valid });
    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ ok: true, confirmed: false });
    expect(found.updated).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('does not mail a pending address again within ten minutes', async () => {
    const found = mockQuery({ data: { id: SUB_ID, status: 'pending', last_sent_at: new Date().toISOString() }, error: null });
    const app = await build(null, { newsletter_subscribers: [none(), found] });
    const res = await app.inject({ method: 'POST', url: '/api/newsletter/subscribe', payload: valid });
    expect(res.statusCode).toBe(202);
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('rejects a bad address, no level and an unknown level', async () => {
    const app = await build(null, {});
    for (const payload of [{ ...valid, email: 'nope' }, { ...valid, levels: [] }, { ...valid, levels: ['college'] }]) {
      const res = await app.inject({ method: 'POST', url: '/api/newsletter/subscribe', payload });
      expect(res.statusCode).toBe(400);
    }
    await app.close();
  });

  it('limits a visitor to five sign-ups an hour', async () => {
    const app = await build(null, { newsletter_subscribers: [mockQuery({ data: null, error: null, count: 5 })] });
    const res = await app.inject({ method: 'POST', url: '/api/newsletter/subscribe', payload: valid });
    expect(res.statusCode).toBe(429);
    await app.close();
  });

  it('says it is unavailable while e-mail is not configured', async () => {
    delete process.env.RESEND_API_KEY;
    const app = await build(null, {});
    const res = await app.inject({ method: 'POST', url: '/api/newsletter/subscribe', payload: valid });
    expect(res.statusCode).toBe(503);
    await app.close();
  });
});

describe('confirming and unsubscribing', () => {
  beforeEach(() => { process.env.GUEST_TRIAL_SECRET = SECRET; });
  afterEach(() => { delete process.env.GUEST_TRIAL_SECRET; });

  it('confirms only a pending row, with a valid confirm token', async () => {
    const update = mockQuery({ data: null, error: null });
    const app = await build(null, { newsletter_subscribers: update });
    const res = await app.inject({ method: 'POST', url: '/api/newsletter/confirm', payload: { token: makeToken('confirm', SUB_ID) } });
    expect(res.statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ status: 'confirmed' });
    expect(update.eqCalls).toEqual([['id', SUB_ID], ['status', 'pending']]);
    await app.close();
  });

  it('unsubscribes with an unsubscribe token and refuses a confirm token', async () => {
    const update = mockQuery({ data: null, error: null });
    const app = await build(null, { newsletter_subscribers: update });
    const wrong = await app.inject({ method: 'POST', url: '/api/newsletter/unsubscribe', payload: { token: makeToken('confirm', SUB_ID) } });
    expect(wrong.statusCode).toBe(400);
    const right = await app.inject({ method: 'POST', url: '/api/newsletter/unsubscribe', payload: { token: makeToken('unsubscribe', SUB_ID) } });
    expect(right.statusCode).toBe(200);
    expect(update.updated[0]).toMatchObject({ status: 'unsubscribed' });
    await app.close();
  });
});
