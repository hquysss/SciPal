import { createHmac, timingSafeEqual } from 'node:crypto';

// Who a visitor without an account is: an HMAC of their IP address, never the address itself.
// Vercel sets x-real-ip and overwrites x-forwarded-for with the client address, so a browser
// cannot name another visitor.

type RequestLike = { headers: Record<string, string | string[] | undefined>; ip?: string };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function clientIp(request: RequestLike): string {
  const real = first(request.headers['x-real-ip'])?.trim();
  if (real) return real;
  const forwarded = first(request.headers['x-forwarded-for'])?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  return request.ip ?? '';
}

export const visitorHash = (ip: string, secret: string) => createHmac('sha256', secret).update(ip).digest('hex');

/** The shared secret of guest trials (backend and web server), or null while it is not configured. */
export function guestSecret(env: Record<string, string | undefined> = process.env): string | null {
  const secret = env.GUEST_TRIAL_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function sameSecret(given: string | undefined, secret: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
