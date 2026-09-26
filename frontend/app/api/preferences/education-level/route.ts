import { createServerClient } from '@scipal/supabase';
import { NextResponse, type NextRequest } from 'next/server';
import { parseEducationLevel } from '../../../../features/landing/educationLevel';

type FailureStatus = 400 | 401 | 500;
type CookieOptions = Parameters<NextResponse['cookies']['set']>[2];
type PendingCookie = { name: string; value: string; options?: CookieOptions };

class PreferenceRouteError extends Error {
  constructor(readonly status: 401 | 500) {
    super();
  }
}

function requestKind(request: NextRequest): 'json' | 'form' | null {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType.includes('application/json') || contentType.includes('+json')) return 'json';
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    return 'form';
  }
  return null;
}

async function readPayload(request: NextRequest, kind: 'json' | 'form'): Promise<unknown> {
  if (kind === 'json') return request.json();
  const form = await request.formData();
  return { level: form.get('level'), scope: form.get('scope') };
}

function applyCookies(response: NextResponse, cookies: PendingCookie[]): NextResponse {
  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}

function failureResponse(
  request: NextRequest,
  kind: 'json' | 'form',
  status: FailureStatus,
  cookies: PendingCookie[],
  redirectOrigin: string,
): NextResponse {
  if (kind === 'form') {
    return applyCookies(
      NextResponse.redirect(new URL('/?chooseLevel=1&saveError=1', redirectOrigin), 303),
      cookies,
    );
  }

  const error = status === 400
    ? 'Invalid request'
    : status === 401
      ? 'Authentication required'
      : 'Unable to save preference';
  return applyCookies(NextResponse.json({ error }, { status }), cookies);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const kind = requestKind(request);
  const responseKind = kind ?? 'json';
  const pendingCookies: PendingCookie[] = [];
  const requestUrl = new URL(request.url);
  let redirectOrigin = requestUrl.origin;
  if (!kind) return failureResponse(request, responseKind, 400, pendingCookies, redirectOrigin);

  const origin = request.headers.get('origin');
  if (origin !== null) {
    try {
      const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
      const requestHost = forwardedHost || request.headers.get('host');
      const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
      const requestProtocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
      const hostOrigin = requestHost
        ? new URL(`${requestProtocol}://${requestHost}`).origin
        : requestUrl.origin;
      const allowedOrigins = new Set([requestUrl.origin, hostOrigin]);
      const originUrl = new URL(origin);
      if (!allowedOrigins.has(originUrl.origin)) {
        return failureResponse(request, kind, 400, pendingCookies, redirectOrigin);
      }
      redirectOrigin = originUrl.origin;
    } catch {
      return failureResponse(request, kind, 400, pendingCookies, redirectOrigin);
    }
  }

  let payload: unknown;
  try {
    payload = await readPayload(request, kind);
  } catch {
    return failureResponse(request, kind, 400, pendingCookies, redirectOrigin);
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('level' in payload) ||
    !('scope' in payload) ||
    payload.scope !== 'account'
  ) {
    return failureResponse(request, kind, 400, pendingCookies, redirectOrigin);
  }
  const level = parseEducationLevel(payload.level);
  if (level === null) {
    return failureResponse(request, kind, 400, pendingCookies, redirectOrigin);
  }

  const requestCookies = new Map(request.cookies.getAll().map(({ name, value }) => [name, value]));
  const supabase = createServerClient({
    getAll: () => Array.from(requestCookies, ([name, value]) => ({ name, value })),
    set: (name, value, options) => {
      requestCookies.set(name, value);
      request.cookies.set(name, value);
      pendingCookies.push({ name, value, options });
    },
  });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new PreferenceRouteError(401);

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ preferred_education_level: level })
      .eq('id', user.id)
      .select('id')
      .single();
    if (updateError || !profile) throw new PreferenceRouteError(500);
  } catch (error) {
    const status = error instanceof PreferenceRouteError ? error.status : 500;
    return failureResponse(request, kind, status, pendingCookies, redirectOrigin);
  }

  const response = kind === 'form'
    ? NextResponse.redirect(new URL('/#landing-title', redirectOrigin), 303)
    : NextResponse.json({ level, scope: 'account' });
  return applyCookies(response, pendingCookies);
}
