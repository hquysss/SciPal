import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

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
});
