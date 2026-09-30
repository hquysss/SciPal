import { describe, expect, it } from 'vitest';
import { authErrorText, callbackUrl, readAuthSettings, safeRedirect, validateSignUp } from './authFlow';

describe('safeRedirect', () => {
  it('keeps same-site paths and drops everything else', () => {
    expect(safeRedirect('/informatics/vong-lap?x=1')).toBe('/informatics/vong-lap?x=1');
    expect(safeRedirect(null)).toBe('/');
    expect(safeRedirect('')).toBe('/');
    expect(safeRedirect('https://evil.example')).toBe('/');
    expect(safeRedirect('//evil.example')).toBe('/');
    expect(safeRedirect('/\\evil.example')).toBe('/');
    expect(safeRedirect('/login')).toBe('/');
    expect(safeRedirect('/auth/callback?code=x')).toBe('/');
  });
});

describe('callbackUrl', () => {
  it('points back to this site with the page to return to', () => {
    expect(callbackUrl('https://scipal.vn', '/glossary')).toBe('https://scipal.vn/auth/callback?redirect=%2Fglossary');
    expect(callbackUrl('https://scipal.vn', 'https://evil.example')).toBe('https://scipal.vn/auth/callback?redirect=%2F');
  });
});

describe('readAuthSettings', () => {
  it('reads which providers are on and whether sign-up is open', () => {
    expect(readAuthSettings({ external: { google: true, facebook: true, email: true }, disable_signup: false })).toEqual({
      google: true,
      signupOpen: true,
    });
    expect(readAuthSettings({ external: { google: 'yes' }, disable_signup: true })).toEqual({ google: false, signupOpen: false });
    expect(readAuthSettings(null)).toBeNull();
    expect(readAuthSettings({ nope: 1 })).toBeNull();
  });
});

describe('validateSignUp', () => {
  const ok = { name: 'Lê An', email: 'an@gmail.com', password: 'mat-khau-dai', confirm: 'mat-khau-dai' };

  it('accepts a complete form', () => {
    expect(validateSignUp(ok)).toEqual({});
  });

  it('names each field that needs fixing', () => {
    const errors = validateSignUp({ name: ' ', email: 'an@gmail', password: 'ngan', confirm: 'khac' });
    expect(Object.keys(errors).sort()).toEqual(['confirm', 'email', 'name', 'password']);
    expect(errors.password?.vi).toContain('8 ký tự');
    expect(errors.confirm?.vi).toContain('không khớp');
  });

  it('only flags the confirmation when the passwords differ', () => {
    expect(validateSignUp({ ...ok, confirm: 'mat-khau-dai ' })).toEqual({ confirm: expect.any(Object) });
  });
});

describe('authErrorText', () => {
  it('turns Supabase errors into plain words', () => {
    expect(authErrorText('User already registered').vi).toContain('đã có tài khoản');
    expect(authErrorText('Password should be at least 8 characters', 422, 'weak_password').vi).toContain('Mật khẩu');
    expect(authErrorText('Signups not allowed for this instance').vi).toContain('tạm đóng');
    expect(authErrorText('email rate limit exceeded', 429).vi).toMatch(/thử lại sau/i);
    expect(authErrorText('Failed to fetch').vi).toContain('kết nối');
    expect(authErrorText('Something odd').vi).toContain('Something odd');
  });
});
