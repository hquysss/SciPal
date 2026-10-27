import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeAccess } from './routeAccess';

afterEach(() => vi.unstubAllEnvs());

const PUBLIC = ['/', '/login', '/login/x', '/reset-password', '/auth/callback', '/pricing', '/pricing/checkout', '/help', '/privacy', '/terms', '/newsletter/confirm', '/reminders/unsubscribe', '/offline', '/feature-off', '/video'];
const ACCOUNT = ['/subjects', '/informatics', '/informatics/vong-lap', '/glossary', '/exam', '/exam/abc', '/lab', '/lab/wave-3d', '/feedback', '/tutor', '/review', '/profile', '/helpful', '/feedback-extra', '/pricing-x', '/video-x'];

describe('routeAccess', () => {
  it.each(PUBLIC)('%s is open to visitors', (path) => expect(routeAccess(path)).toEqual({ kind: 'public' }));
  it.each(ACCOUNT)('%s needs an account', (path) => expect(routeAccess(path)).toEqual({ kind: 'account' }));

  it('opens /dev only in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(routeAccess('/dev/x')).toEqual({ kind: 'public' });
    vi.stubEnv('NODE_ENV', 'production');
    expect(routeAccess('/dev/x')).toEqual({ kind: 'account' });
  });
});
