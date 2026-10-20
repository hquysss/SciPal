import { timingSafeEqual } from 'node:crypto';

/** The scheduler's `Authorization: Bearer <CRON_SECRET>` header; false when no secret is configured. */
export function cronAuthorized(header: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const received = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
