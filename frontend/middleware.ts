import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@scipal/supabase';
import { ALL_ON, featureOfPath, featureVisible, fetchSiteSettings, type SiteSettings } from './lib/siteSettings';
import { routeAccess } from './lib/routeAccess';

const LEGACY_LEVEL_COOKIE = 'scipal_education_level';

function clearLegacyLevelCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.has(LEGACY_LEVEL_COOKIE)) return;
  response.cookies.set(LEGACY_LEVEL_COOKIE, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

type CookieUpdate = { name: string; value: string; options: Parameters<NextResponse['cookies']['set']>[2] };

function loginRedirect(request: NextRequest) {
  const url = new URL('/login', request.url);
  url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

function hasSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));
}

async function signedInUser(request: NextRequest, cookieUpdates: CookieUpdate[]) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = createServerClient({
    getAll: () => request.cookies.getAll(),
    set: (name: string, value: string, options: CookieUpdate['options']) => {
      request.cookies.set(name, value);
      cookieUpdates.push({ name, value, options });
    },
  });
  try {
    const { data, error } = await supabase.auth.getUser();
    return error ? null : data.user;
  } catch {
    // A failed auth service cannot turn an unverified cookie into a session.
    return null;
  }
}

// The site switches, read at most every 30 seconds per server instance.
let siteCache: { at: number; value: SiteSettings } | null = null;
async function siteSettings(): Promise<SiteSettings> {
  if (siteCache && Date.now() - siteCache.at < 30_000) return siteCache.value;
  const value = await fetchSiteSettings().catch(() => ALL_ON);
  siteCache = { at: Date.now(), value };
  return value;
}

/** A page of a feature an admin switched off: the notice page, at the same address. */
function featureOffPage(request: NextRequest, feature: string) {
  const url = request.nextUrl.clone();
  url.pathname = '/feature-off';
  url.search = `?feature=${feature}`;
  return NextResponse.rewrite(url);
}

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const access = routeAccess(pathname);

  // Maintenance mode: sign-in and password recovery stay open, and admins use the site as normal.
  if (process.env.NODE_ENV !== 'development' && !under(pathname, '/login') && !under(pathname, '/reset-password') && !under(pathname, '/auth') && !under(pathname, '/dev')) {
    const site = await siteSettings();
    if (site.maintenance) {
      const updates: CookieUpdate[] = [];
      const who = hasSessionCookie(request) ? await signedInUser(request, updates) : null;
      if (who?.app_metadata?.app_role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        url.search = '';
        const closed = NextResponse.rewrite(url, { status: 503 });
        for (const { name, value, options } of updates) closed.cookies.set(name, value, options);
        return closed;
      }
    }
  }

  // The public pages (routeAccess) are open to visitors, unless an admin switched their feature off.
  if (access.kind === 'public' && featureOfPath(pathname) === null) {
    const response = NextResponse.next();
    clearLegacyLevelCookie(request, response);
    return response;
  }

  const cookieUpdates: CookieUpdate[] = [];
  const user = hasSessionCookie(request) || access.kind === 'account' ? await signedInUser(request, cookieUpdates) : null;
  const feature = featureOfPath(pathname);
  const site = feature ? await siteSettings() : ALL_ON;

  let response: NextResponse;
  if (!featureVisible(site, feature, user?.app_metadata?.app_role)) {
    response = featureOffPage(request, feature!);
  } else if (access.kind === 'public') {
    response = NextResponse.next();
  } else if (!user) {
    response = loginRedirect(request);
  } else if (
    (pathname === '/teacher' || pathname.startsWith('/teacher/')) &&
    !['teacher', 'admin'].includes(user.app_metadata?.app_role)
  ) {
    response = NextResponse.redirect(new URL('/profile', request.url));
  } else if (
    (pathname === '/admin' || pathname.startsWith('/admin/')) &&
    user.app_metadata?.app_role !== 'admin'
  ) {
    response = NextResponse.redirect(new URL('/profile', request.url));
  } else {
    response = NextResponse.next({ request });
  }

  for (const { name, value, options } of cookieUpdates) {
    response.cookies.set(name, value, options);
  }
  clearLegacyLevelCookie(request, response);
  return response;
}

export const config = {
  // Every page; not Next internals, its API routes, or files (a dot in the path: images, patterns, templates).
  matcher: ['/((?!_next/|api/|.*\\..*).*)'],
};
