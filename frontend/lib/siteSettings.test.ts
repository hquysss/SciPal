import { describe, expect, it } from 'vitest';
import { ALL_ON, featureOfPath, featureVisible, resolveSiteSettings } from './siteSettings';

describe('site switches', () => {
  it('turns on whatever is not switched off', () => {
    expect(resolveSiteSettings(null)).toEqual(ALL_ON);
    expect(resolveSiteSettings({ signup_enabled: false, features: { exam: false, glossary: 'no' } })).toEqual({
      signupEnabled: false,
      maintenance: false,
      features: { ...ALL_ON.features, exam: false },
    });
  });

  it('reads maintenance mode, off unless it is exactly true', () => {
    expect(resolveSiteSettings({ maintenance: true }).maintenance).toBe(true);
    expect(resolveSiteSettings({ maintenance: 'yes' }).maintenance).toBe(false);
    expect(resolveSiteSettings(null).maintenance).toBe(false);
  });

  it('knows which feature a page belongs to', () => {
    expect(featureOfPath('/glossary')).toBe('glossary');
    expect(featureOfPath('/glossary/algorithm')).toBe('glossary');
    expect(featureOfPath('/exam')).toBe('exam');
    expect(featureOfPath('/exam/abc')).toBe('exam');
    expect(featureOfPath('/pricing')).toBe('pricing');
    expect(featureOfPath('/checkout/1')).toBe('pricing');
    expect(featureOfPath('/classes')).toBe('classes');
    expect(featureOfPath('/teacher/classes/1')).toBe('classes');
    expect(featureOfPath('/examples')).toBeNull();
    expect(featureOfPath('/subjects')).toBeNull();
  });

  it('shows a switched-off feature only to admins', () => {
    const off = { ...ALL_ON, features: { ...ALL_ON.features, exam: false } };
    expect(featureVisible(off, 'exam', 'student')).toBe(false);
    expect(featureVisible(off, 'exam', null)).toBe(false);
    expect(featureVisible(off, 'exam', 'admin')).toBe(true);
    expect(featureVisible(off, 'glossary', 'student')).toBe(true);
    expect(featureVisible(off, null, 'student')).toBe(true);
  });
});
