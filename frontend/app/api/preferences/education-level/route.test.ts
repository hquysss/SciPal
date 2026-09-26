import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { CookieStore } from '@scipal/supabase';
import { POST } from './route';

const routeMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));

let activeCookieStore: CookieStore | null = null;

vi.mock('@scipal/supabase', () => ({
  createServerClient: routeMocks.createServerClient,
}));

function jsonRequest(body: unknown, origin = 'http://localhost') {
  return new NextRequest('http://localhost/api/preferences/education-level', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin,
    },
    body: JSON.stringify(body),
  });
}

function hasLevelCookie(response: Response) {
  return response.headers.get('set-cookie')?.includes('scipal_education_level=') ?? false;
}

describe('POST /api/preferences/education-level', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeCookieStore = null;
    routeMocks.createServerClient.mockImplementation((cookieStore: CookieStore) => {
      activeCookieStore = cookieStore;
      return {
        auth: { getUser: routeMocks.getUser },
        from: routeMocks.from,
      };
    });
    routeMocks.getUser.mockImplementation(async () => {
      activeCookieStore?.set?.('sb-refresh-token', 'refreshed-session', { path: '/' });
      return { data: { user: { id: 'user-1' } }, error: null };
    });
    routeMocks.from.mockReturnValue({ update: routeMocks.update });
    routeMocks.update.mockReturnValue({ eq: routeMocks.eq });
    routeMocks.eq.mockReturnValue({ select: routeMocks.select });
    routeMocks.select.mockReturnValue({ single: routeMocks.single });
    routeMocks.single.mockResolvedValue({ data: { id: 'user-1' }, error: null });
  });

  it('rejects unsupported levels before creating a Supabase client', async () => {
    const response = await POST(jsonRequest({ level: 'thpt', scope: 'account' }));

    expect(response.status).toBe(400);
    expect(routeMocks.createServerClient).not.toHaveBeenCalled();
    expect(hasLevelCookie(response)).toBe(false);
  });

  it('rejects device persistence without touching Supabase', async () => {
    const response = await POST(jsonRequest({ level: 'primary', scope: 'device' }));

    expect(response.status).toBe(400);
    expect(routeMocks.createServerClient).not.toHaveBeenCalled();
    expect(hasLevelCookie(response)).toBe(false);
  });

  it('updates only the authenticated profile row without persisting a level cookie', async () => {
    const response = await POST(jsonRequest({ level: 'upper_secondary', scope: 'account' }));

    expect(response.status).toBe(200);
    expect(routeMocks.getUser).toHaveBeenCalledOnce();
    expect(routeMocks.from).toHaveBeenCalledWith('profiles');
    expect(routeMocks.update).toHaveBeenCalledWith({ preferred_education_level: 'upper_secondary' });
    expect(routeMocks.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(routeMocks.select).toHaveBeenCalledWith('id');
    expect(routeMocks.single).toHaveBeenCalledOnce();
    expect(hasLevelCookie(response)).toBe(false);
    expect(response.headers.get('set-cookie')).toContain('sb-refresh-token=refreshed-session');
  });

  it('returns 401 and leaves the level cookie unchanged when no user is authenticated', async () => {
    routeMocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(jsonRequest({ level: 'primary', scope: 'account' }));

    expect(response.status).toBe(401);
    expect(hasLevelCookie(response)).toBe(false);
    expect(routeMocks.from).not.toHaveBeenCalled();
  });

  it('returns 500 without changing the level cookie when the profile update fails', async () => {
    routeMocks.single.mockRejectedValue(new Error('DB offline'));

    const response = await POST(jsonRequest({ level: 'primary', scope: 'account' }));

    expect(response.status).toBe(500);
    expect(hasLevelCookie(response)).toBe(false);
  });

  it('redirects failed form saves to the gate and preserves the level cookie', async () => {
    routeMocks.single.mockResolvedValue({ data: null, error: new Error('DB offline') });
    const request = new NextRequest('http://localhost/api/preferences/education-level', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'http://localhost' },
      body: 'level=primary&scope=account',
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost/?chooseLevel=1&saveError=1');
    expect(hasLevelCookie(response)).toBe(false);
  });

  it('rejects cross-origin writes before touching Supabase', async () => {
    const response = await POST(jsonRequest({ level: 'primary', scope: 'account' }, 'https://attacker.example'));

    expect(response.status).toBe(400);
    expect(routeMocks.createServerClient).not.toHaveBeenCalled();
    expect(hasLevelCookie(response)).toBe(false);
  });

  it('accepts the same browser origin when Next normalizes the request URL host without a level cookie', async () => {
    const request = new NextRequest('http://localhost:3102/api/preferences/education-level', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin: 'http://127.0.0.1:3102',
        host: '127.0.0.1:3102',
      },
      body: 'level=primary&scope=account',
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://127.0.0.1:3102/#landing-title');
    expect(hasLevelCookie(response)).toBe(false);
    expect(response.headers.get('set-cookie')).toContain('sb-refresh-token=refreshed-session');
    expect(routeMocks.getUser).toHaveBeenCalledOnce();
  });
});
