import { describe, expect, it } from 'vitest';
import { readTrials, routeAccess, signTrials } from './guestTrial';

const SECRET = 'test-guest-secret-0123456789abcdef0123';

describe('routeAccess', () => {
  it('keeps the landing page, sign-in and the tutor page open', () => {
    for (const path of ['/', '/login', '/tutor', '/auth/callback']) expect(routeAccess(path), path).toEqual({ kind: 'public' });
  });

  it('needs an account for personal and paying pages', () => {
    for (const path of ['/profile', '/profile/plan', '/progress', '/teacher/classes', '/admin/plans', '/exam/abc', '/checkout/abc', '/classes', '/dev/blocks']) {
      expect(routeAccess(path), path).toEqual({ kind: 'account' });
    }
  });

  it('gives each feature its own trial; subjects and lessons are one feature', () => {
    expect(routeAccess('/subjects')).toEqual({ kind: 'trial', feature: 'learn' });
    expect(routeAccess('/informatics')).toEqual({ kind: 'trial', feature: 'learn' });
    expect(routeAccess('/informatics/vong-lap')).toEqual({ kind: 'trial', feature: 'learn' });
    expect(routeAccess('/glossary')).toEqual({ kind: 'trial', feature: 'glossary' });
    expect(routeAccess('/exam')).toEqual({ kind: 'trial', feature: 'exam' });
    expect(routeAccess('/pricing')).toEqual({ kind: 'trial', feature: 'pricing' });
  });
});

describe('signed trial cookie', () => {
  it('reads back what it signed', async () => {
    const value = await signTrials({ learn: 1_900_000_000_000 }, SECRET);
    expect(await readTrials(value, SECRET)).toEqual({ learn: 1_900_000_000_000 });
  });

  it('ignores a cookie that was edited, signed with another key, or garbled', async () => {
    const value = await signTrials({ learn: 1_000 }, SECRET);
    const [payload, signature] = value.split('.');
    const edited = `${Buffer.from(JSON.stringify({ learn: 9_999_999_999_999 })).toString('base64url')}.${signature}`;
    expect(await readTrials(edited, SECRET)).toBeNull();
    expect(await readTrials(`${payload}.${signature}`, 'another-secret-of-enough-length-0000000')).toBeNull();
    expect(await readTrials('nonsense', SECRET)).toBeNull();
    expect(await readTrials(undefined, SECRET)).toBeNull();
  });
});
