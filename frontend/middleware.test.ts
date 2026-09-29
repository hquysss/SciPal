import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readTrials, signTrials } from './lib/guestTrial';
import { NextRequest } from 'next/server';
import { config, middleware } from './middleware';

const middlewareMocks = vi.hoisted(() => ({ createServerClient: vi.fn() }));

vi.mock('@scipal/supabase', () => ({
  createServerClient: middlewareMocks.createServerClient,
}));

describe('middleware legacy education preference cleanup', () => {
  it('expires the old long-lived level cookie on the home route without an auth request', async () => {
    const request = new NextRequest('http://localhost/', {
      headers: { cookie: 'scipal_education_level=primary' },
    });

    const response = await middleware(request);

    expect(response.headers.get('set-cookie')).toContain('scipal_education_level=');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(middlewareMocks.createServerClient).not.toHaveBeenCalled();
  });

  it('does not add a cookie header when there is no legacy preference to clear', async () => {
    const response = await middleware(new NextRequest('http://localhost/'));

    expect(response.headers.get('set-cookie')).toBeNull();
    expect(middlewareMocks.createServerClient).not.toHaveBeenCalled();
  });

  it('sends a visitor of an order page to sign in first, then back to the order', async () => {
    const response = await middleware(new NextRequest('http://localhost/checkout/c0000000-0000-4000-8000-000000000001'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?redirect=%2Fcheckout%2Fc0000000-0000-4000-8000-000000000001');
  });

  it('sends a visitor of the class page to sign in first', async () => {
    const response = await middleware(new NextRequest('http://localhost/classes'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?redirect=%2Fclasses');
  });

  it('runs on every page but not on files, Next internals or its API routes', () => {
    const [matcher] = config.matcher;
    const source = new RegExp(`^${matcher}$`);
    for (const page of ['/', '/subjects', '/informatics/vong-lap', '/pricing', '/checkout/abc', '/classes']) expect(source.test(page), page).toBe(true);
    for (const file of ['/_next/static/chunk.js', '/api/preferences', '/logo.svg', '/patterns/primary.svg', '/templates/mau.xlsx', '/favicon.ico']) expect(source.test(file), file).toBe(false);
  });
});

describe('guest trials', () => {
  const SECRET = 'test-guest-secret-0123456789abcdef0123';
  const fetchMock = vi.fn();
  const visit = (path: string, cookie?: string) =>
    middleware(new NextRequest(`http://localhost${path}`, { headers: { 'x-real-ip': '1.2.3.4', ...(cookie ? { cookie } : {}) } }));
  const answer = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const trialCookie = (response: Response) => /scipal_trial=([^;]+)/.exec(response.headers.get('set-cookie') ?? '')?.[1];

  beforeEach(() => {
    process.env.GUEST_TRIAL_SECRET = SECRET;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    delete process.env.GUEST_TRIAL_SECRET;
    vi.unstubAllGlobals();
  });

  it('opens the trial of a feature on the first visit and remembers it in a signed cookie', async () => {
    const until = Date.now() + 30 * 60_000;
    fetchMock.mockReturnValue(answer(200, { allowed: true, expiresAt: new Date(until).toISOString() }));
    const response = await visit('/informatics/vong-lap');
    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/guest\/trial$/);
    expect(init.headers['x-guest-key']).toBe(SECRET);
    expect(JSON.parse(init.body)).toEqual({ feature: 'learn', ip: '1.2.3.4' });
    expect(await readTrials(decodeURIComponent(trialCookie(response)!), SECRET)).toEqual({ learn: until });
  });

  it('lets the visitor move around the feature without asking the backend again', async () => {
    const cookie = `scipal_trial=${await signTrials({ learn: Date.now() + 60_000 }, SECRET)}`;
    expect((await visit('/subjects', cookie)).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks to sign in once the window is over', async () => {
    const cookie = `scipal_trial=${await signTrials({ learn: Date.now() - 1 }, SECRET)}`;
    const response = await visit('/subjects?grade=10', cookie);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain(`/login?redirect=${encodeURIComponent('/subjects?grade=10')}&reason=trial`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks the backend again when the cookie was edited or deleted, and follows it', async () => {
    fetchMock.mockReturnValue(answer(200, { allowed: false, expiresAt: new Date(Date.now() - 1000).toISOString() }));
    const forged = `scipal_trial=${await signTrials({ learn: Date.now() + 3_600_000 }, 'forged-secret-of-a-good-length-000000000')}`;
    const response = await visit('/subjects', forged);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('reason=trial');
  });

  it('keeps each feature separate', async () => {
    fetchMock.mockReturnValue(answer(200, { allowed: true, expiresAt: new Date(Date.now() + 60_000).toISOString() }));
    const cookie = `scipal_trial=${await signTrials({ learn: Date.now() - 1 }, SECRET)}`;
    expect((await visit('/glossary', cookie)).status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).feature).toBe('glossary');
  });

  it('lets the page through, unrecorded, when the backend cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    const response = await visit('/glossary');
    expect(response.status).toBe(200);
    expect(trialCookie(response)).toBeUndefined();
  });

  it('asks to sign in when trials are not configured', async () => {
    delete process.env.GUEST_TRIAL_SECRET;
    const response = await visit('/glossary');
    expect(response.status).toBe(307);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the landing page, sign-in and the tutor page open to visitors', async () => {
    for (const path of ['/', '/login', '/tutor']) expect((await visit(path)).status, path).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a visitor of a personal page to sign in without a trial', async () => {
    const response = await visit('/progress');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).not.toContain('reason=trial');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
