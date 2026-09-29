import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { CookieStore } from '@scipal/supabase';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock('@scipal/supabase', () => ({ createServerClient: mocks.createServerClient }));

const visit = (query: string) => GET(new NextRequest(`https://scipal.vn/auth/callback?${query}`));
const location = (response: Response) => response.headers.get('location');

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServerClient.mockImplementation((store: CookieStore) => ({
      auth: {
        exchangeCodeForSession: mocks.exchangeCodeForSession.mockImplementation(async () => {
          store.set?.('sb-x-auth-token', 'session', { path: '/' });
          return { error: null };
        }),
        verifyOtp: mocks.verifyOtp.mockResolvedValue({ error: null }),
      },
    }));
  });

  it('turns the code into a session and returns to the page', async () => {
    const response = await visit('code=abc&redirect=%2Fglossary');
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(location(response)).toBe('https://scipal.vn/glossary');
    expect(response.headers.get('set-cookie')).toContain('sb-x-auth-token=session');
  });

  it('confirms an e-mail link that carries a token hash', async () => {
    const response = await visit('token_hash=h1&type=signup&redirect=%2F');
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: 'h1', type: 'signup' });
    expect(location(response)).toBe('https://scipal.vn/');
  });

  it('never leaves the site', async () => {
    expect(location(await visit('code=abc&redirect=https%3A%2F%2Fevil.example'))).toBe('https://scipal.vn/');
    expect(location(await visit('code=abc&redirect=%2F%2Fevil.example'))).toBe('https://scipal.vn/');
  });

  it('sends a cancelled or failed provider sign-in back to the login page', async () => {
    const response = await visit('error=access_denied&error_description=User+denied&redirect=%2Fglossary');
    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(location(response)).toBe('https://scipal.vn/login?error=oauth&redirect=%2Fglossary');
  });

  it('names the missing e-mail when the provider would not share one', async () => {
    const response = await visit('error=server_error&error_description=Error+getting+user+email+from+external+provider&redirect=%2F');
    expect(location(response)).toBe('https://scipal.vn/login?error=oauth_email&redirect=%2F');
  });

  it('reports an expired or reused link', async () => {
    mocks.createServerClient.mockReturnValue({ auth: { exchangeCodeForSession: async () => ({ error: new Error('invalid grant') }) } });
    expect(location(await visit('code=old'))).toBe('https://scipal.vn/login?error=link&redirect=%2F');
    expect(location(await visit('type=signup'))).toBe('https://scipal.vn/login?error=link&redirect=%2F');
    expect(location(await visit('token_hash=h1&type=admin'))).toBe('https://scipal.vn/login?error=link&redirect=%2F');
  });
});
