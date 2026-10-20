import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('login required', () => {
  const fetchMock = vi.fn();
  const visit = (path: string) => middleware(new NextRequest(`http://localhost${path}`));

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the landing page, pricing, help and sign-in open to visitors', async () => {
    for (const path of ['/', '/login', '/pricing', '/help', '/auth/callback']) expect((await visit(path)).status, path).toBe(200);
  });

  it.each(['/glossary', '/subjects', '/informatics/vong-lap', '/tutor', '/lab', '/feedback', '/progress', '/khong-co-trang'])(
    'sends a visitor of %s to sign in, then back',
    async (path) => {
      const response = await visit(path);
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get('location')!);
      expect(location.pathname).toBe('/login');
      expect(location.searchParams.get('redirect')).toBe(path);
      expect(location.searchParams.has('reason')).toBe(false);
    },
  );

  it('brings the query back too', async () => {
    const location = new URL((await visit('/subjects?grade=10')).headers.get('location')!);
    expect(location.searchParams.get('redirect')).toBe('/subjects?grade=10');
  });

  it('never asks the backend about a visitor', async () => {
    await visit('/glossary');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('maintenance mode', () => {
  const settings = (maintenance: boolean) => Promise.resolve(new Response(JSON.stringify([{ signup_enabled: true, features: {}, maintenance }]), { status: 200 }));
  const visit = (path: string) => middleware(new NextRequest(`http://localhost${path}`));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('shows the maintenance page everywhere but the sign-in pages', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 120_000 }); // past the 30 s settings cache
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://db-maintenance.example.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubGlobal('fetch', vi.fn(() => settings(true)));
    for (const path of ['/', '/subjects', '/pricing', '/informatics/vong-lap']) {
      const res = await visit(path);
      expect(res.status, path).toBe(503);
      expect(res.headers.get('x-middleware-rewrite'), path).toContain('/maintenance');
    }
    for (const path of ['/login', '/auth/callback']) expect((await visit(path)).status, path).toBe(200);
  });
});
