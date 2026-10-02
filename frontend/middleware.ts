import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@scipal/supabase';
import { ALL_ON, featureOfPath, featureVisible, fetchSiteSettings, type SiteSettings } from './lib/siteSettings';
import { TRIAL_COOKIE, TRIAL_UI_COOKIE, readTrials, routeAccess, signTrials, trialRenewable, type TrialFeature, type Trials } from './lib/guestTrial';

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
const TRIAL_COOKIE_DAYS = 30;
type CookieUpdate = { name: string; value: string; options: Parameters<NextResponse['cookies']['set']>[2] };

/** Vercel sets these to the client address; a browser cannot choose them. */
function visitorIp(request: NextRequest) {
  return request.headers.get('x-real-ip')?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function loginRedirect(request: NextRequest, reason?: 'trial') {
  const url = new URL('/login', request.url);
  url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
  if (reason) url.searchParams.set('reason', reason);
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

async function rememberTrials(response: NextResponse, trials: Trials, secret: string) {
  const options = { path: '/', maxAge: TRIAL_COOKIE_DAYS * 86_400, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
  response.cookies.set(TRIAL_COOKIE, await signTrials(trials, secret), { ...options, httpOnly: true });
  // The banner's copy: it shows the time left and grants nothing.
  response.cookies.set(TRIAL_UI_COOKIE, JSON.stringify(trials), { ...options, httpOnly: false });
}

/**
 * A visitor on a feature page: within the feature's window the page opens; after it, sign in until
 * the window comes round again 24 hours after it opened.
 * The window comes from the signed cookie, else from the backend (which knows the visitor by IP).
 */
async function guestTrial(request: NextRequest, feature: TrialFeature) {
  const secret = process.env.GUEST_TRIAL_SECRET;
  if (!secret || secret.length < 32) return loginRedirect(request);

  const trials = await readTrials(request.cookies.get(TRIAL_COOKIE)?.value, secret);
  const known = trials?.[feature];
  if (known !== undefined && known > Date.now()) return NextResponse.next();
  // An ended window stays ended until its 24 hours are up; then the backend opens a new one.
  if (known !== undefined && !trialRenewable(known, Date.now())) return loginRedirect(request, 'trial');

  let answer: { allowed?: unknown; expiresAt?: unknown };
  try {
    const res = await fetch(`${API_BASE}/api/guest/trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-guest-key': secret },
      body: JSON.stringify({ feature, ip: visitorIp(request) }),
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error(`guest trial ${res.status}`);
    answer = (await res.json()) as typeof answer;
  } catch {
    // The backend is unreachable: let this page through without recording anything.
    return NextResponse.next();
  }
  const until = typeof answer.expiresAt === 'string' ? Date.parse(answer.expiresAt) : NaN;
  if (typeof answer.allowed !== 'boolean' || Number.isNaN(until)) return NextResponse.next();

  const response = answer.allowed ? NextResponse.next() : loginRedirect(request, 'trial');
  await rememberTrials(response, { ...(trials ?? {}), [feature]: until }, secret);
  return response;
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const access = routeAccess(pathname);

  // The landing page, sign-in (with its callback) and the tutor page (one guest question) are open to visitors.
  if (access.kind === 'public') {
    const response = NextResponse.next();
    clearLegacyLevelCookie(request, response);
    return response;
  }

  const cookieUpdates: CookieUpdate[] = [];
  const user = hasSessionCookie(request) || access.kind === 'account' ? await signedInUser(request, cookieUpdates) : null;
  const feature = featureOfPath(pathname);
  const site = feature || (!user && access.kind === 'trial') ? await siteSettings() : ALL_ON;

  let response: NextResponse;
  if (!featureVisible(site, feature, user?.app_metadata?.app_role)) {
    response = featureOffPage(request, feature!);
  } else if (!user) {
    // With guest trials switched off, visitors sign in first.
    response = access.kind === 'account' || !site.features.guest_trial ? loginRedirect(request) : await guestTrial(request, access.feature);
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
