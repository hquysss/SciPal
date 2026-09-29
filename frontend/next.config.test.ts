import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

describe('security headers', () => {
  it('sends them on every page', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((rule) => rule.source === '/:path*');
    const headers = Object.fromEntries((all?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));
    // No other site may frame SciPal (clickjacking); the embeds SciPal shows are unaffected.
    expect(headers['content-security-policy']).toBe("frame-ancestors 'self'");
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['strict-transport-security']).toMatch(/^max-age=\d{8,}/);
  });
});
