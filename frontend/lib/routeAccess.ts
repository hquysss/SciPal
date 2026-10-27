// Who may open a page: everything needs an account except these. The middleware sends a visitor of
// any other page to sign in and back (docs/superpowers/specs/2026-10-20-require-login-design.md).

export type RouteAccess = { kind: 'public' } | { kind: 'account' };

const PUBLIC_PREFIXES = ['/login', '/reset-password', '/auth', '/pricing', '/help', '/privacy', '/terms', '/newsletter', '/reminders/unsubscribe', '/offline', '/feature-off', '/video'];
const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function routeAccess(pathname: string): RouteAccess {
  if (pathname === '/' || PUBLIC_PREFIXES.some((prefix) => under(pathname, prefix))) return { kind: 'public' };
  if (process.env.NODE_ENV === 'development' && under(pathname, '/dev')) return { kind: 'public' };
  return { kind: 'account' };
}
