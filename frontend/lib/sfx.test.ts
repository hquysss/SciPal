// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { setSfxEnabled, sfxEnabled } from './sfx';

describe('sfx setting', () => {
  beforeEach(() => window.localStorage.clear());

  it('is off by default', () => {
    expect(sfxEnabled()).toBe(false);
  });

  it('remembers being turned on and off', () => {
    setSfxEnabled(true);
    expect(sfxEnabled()).toBe(true);
    setSfxEnabled(false);
    expect(sfxEnabled()).toBe(false);
  });
});
