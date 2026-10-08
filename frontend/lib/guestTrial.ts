// Guest trials (chủ dự án chốt 29/09, 30/09): a visitor without an account tries each feature for a
// 30-minute window, then must sign in; 24 hours after the window opened they get a new one. The window is kept by the backend per visitor
// (an HMAC of the IP) and cached here in a signed cookie, so editing the cookie does not help and
// deleting it only makes the web ask the backend again. Runs in the edge middleware (Web Crypto).

/** Length of a trial window (backend WINDOW_MINUTES) and how long after it opened a new one may. */
export const TRIAL_WINDOW_MS = 30 * 60 * 1000;
export const TRIAL_RESET_MS = 24 * 60 * 60 * 1000;

/** Whether a window that ended at `until` has come round again (the backend then opens a new one). */
export function trialRenewable(until: number, now: number): boolean {
  return now >= until - TRIAL_WINDOW_MS + TRIAL_RESET_MS;
}

export type TrialFeature = 'learn' | 'glossary' | 'exam' | 'pricing';
export type RouteAccess = { kind: 'public' } | { kind: 'account' } | { kind: 'trial'; feature: TrialFeature };

/** Signed map feature → end of the window (ms); httpOnly. */
export const TRIAL_COOKIE = 'scipal_trial';
/** The same map, unsigned, for the trial banner only (it grants nothing). */
export const TRIAL_UI_COOKIE = 'scipal_trial_ui';

export const FEATURE_NAME: Record<TrialFeature, { vi: string; en: string }> = {
  learn: { vi: 'Môn học', en: 'Subjects' },
  glossary: { vi: 'Từ điển', en: 'Glossary' },
  exam: { vi: 'Thi thử', en: 'Exams' },
  pricing: { vi: 'Bảng giá', en: 'Pricing' },
};

const ACCOUNT_PREFIXES = ['/profile', '/progress', '/teacher', '/admin', '/checkout', '/classes', '/games', '/dev'];
const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function routeAccess(pathname: string): RouteAccess {
  if (pathname === '/' || under(pathname, '/login') || under(pathname, '/reset-password') || under(pathname, '/auth') || pathname === '/tutor' || under(pathname, '/pricing') || pathname === '/help' || pathname === '/feedback' || under(pathname, '/lab') || pathname === '/privacy' || pathname === '/offline' || pathname === '/feature-off' || (process.env.NODE_ENV === 'development' && under(pathname, '/dev'))) return { kind: 'public' };
  if (ACCOUNT_PREFIXES.some((prefix) => under(pathname, prefix)) || pathname.startsWith('/exam/')) return { kind: 'account' };
  if (under(pathname, '/glossary')) return { kind: 'trial', feature: 'glossary' };
  if (pathname === '/exam') return { kind: 'trial', feature: 'exam' };
  // /subjects, a subject and its lessons.
  return { kind: 'trial', feature: 'learn' };
}

export type Trials = Partial<Record<TrialFeature, number>>;

const encoder = new TextEncoder();
const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (text: string) => {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};
const hex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');

async function hmac(text: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(text)));
}

export async function signTrials(trials: Trials, secret: string): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(trials)));
  return `${payload}.${await hmac(payload, secret)}`;
}

/** The trials of a correctly signed cookie, or null. */
export async function readTrials(value: string | undefined, secret: string): Promise<Trials | null> {
  if (!value) return null;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra !== undefined) return null;
  const expected = await hmac(payload, secret);
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const trials: Trials = {};
    for (const [feature, until] of Object.entries(parsed as Record<string, unknown>)) {
      if (feature in FEATURE_NAME && typeof until === 'number') trials[feature as TrialFeature] = until;
    }
    return trials;
  } catch {
    return null;
  }
}
