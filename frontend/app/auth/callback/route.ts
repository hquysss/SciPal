import { createServerClient } from '@scipal/supabase';
import { NextResponse, type NextRequest } from 'next/server';
import { safeRedirect } from '@/lib/authFlow';

// Supabase sends the browser here after Google, and from the sign-up confirmation
// e-mail. The code (or token hash) becomes a session cookie, then the visitor returns to the page
// they were on. The redirect is always a path on this site.

type CookieOptions = Parameters<NextResponse['cookies']['set']>[2];
// The e-mail link types Supabase can send (supabase-js is not a direct dependency here).
type EmailOtpType = 'signup' | 'email' | 'invite' | 'magiclink' | 'recovery' | 'email_change';
const EMAIL_TYPES: EmailOtpType[] = ['signup', 'email', 'invite', 'magiclink', 'recovery', 'email_change'];

function toLogin(request: NextRequest, error: 'oauth' | 'link', redirect: string) {
  const url = new URL('/login', request.url);
  url.searchParams.set('error', error);
  url.searchParams.set('redirect', redirect);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const redirect = safeRedirect(params.get('redirect'));

  // The visitor cancelled at Google, or Google refused.
  if (params.get('error')) return toLogin(request, 'oauth', redirect);

  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  if (!code && !(tokenHash && type && EMAIL_TYPES.includes(type))) return toLogin(request, 'link', redirect);

  const pending: { name: string; value: string; options?: CookieOptions }[] = [];
  const supabase = createServerClient({
    getAll: () => request.cookies.getAll(),
    set: (name: string, value: string, options?: CookieOptions) => {
      request.cookies.set(name, value);
      pending.push({ name, value, options });
    },
  });

  let failed: boolean;
  try {
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) return toLogin(request, 'link', redirect);

  const response = NextResponse.redirect(new URL(redirect, request.url));
  for (const { name, value, options } of pending) response.cookies.set(name, value, options);
  return response;
}
