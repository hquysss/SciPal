import { describe, expect, it } from 'vitest';
import { installMode, isIos } from './installMode';

describe('how SciPal installs on this device', () => {
  it('says it is installed when opened from the home screen', () => {
    expect(installMode({ standalone: true, canPrompt: true, ios: false })).toBe('installed');
    expect(installMode({ standalone: true, canPrompt: false, ios: true })).toBe('installed');
  });

  it('offers the one-tap install where the browser allows it', () => {
    expect(installMode({ standalone: false, canPrompt: true, ios: false })).toBe('prompt');
  });

  it('shows the Share → Add to Home Screen steps on iPhone and iPad', () => {
    expect(installMode({ standalone: false, canPrompt: false, ios: true })).toBe('ios');
  });

  it('falls back to the browser menu elsewhere', () => {
    expect(installMode({ standalone: false, canPrompt: false, ios: false })).toBe('manual');
  });

  it('recognises iPhones, iPads and iPadOS that calls itself a Mac', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(isIos('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5)).toBe(false);
  });
});
