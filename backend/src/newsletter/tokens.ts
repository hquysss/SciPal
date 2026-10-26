import { createHmac } from 'node:crypto';
import { guestSecret, sameSecret } from '../guest/visitor.js';

// Links in newsletter e-mails carry `<subscriber id>.<HMAC of purpose and id>`, so nothing is stored.
// The key is the guest-trial secret (backend only); rotating it retires every link.

export type Purpose = 'confirm' | 'unsubscribe' | 'reminder-off';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mac = (purpose: Purpose, id: string, secret: string) => createHmac('sha256', secret).update(`${purpose}:${id}`).digest('hex');

export function makeToken(purpose: Purpose, id: string): string | null {
  const secret = guestSecret();
  return secret ? `${id}.${mac(purpose, id, secret)}` : null;
}

/** The subscriber id a token was made for, or null when it is malformed or forged. */
export function readToken(purpose: Purpose, token: unknown): string | null {
  const secret = guestSecret();
  if (!secret || typeof token !== 'string' || token.length > 200) return null;
  const [id, given] = token.split('.');
  if (!id || !given || !ID.test(id)) return null;
  return sameSecret(given, mac(purpose, id, secret)) ? id : null;
}
