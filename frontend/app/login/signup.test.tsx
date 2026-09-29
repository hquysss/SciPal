import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AuthModeTabs } from './AuthModeTabs';
import { OAuthButtonsView } from './OAuthButtons';
import { SignUpForm, SignUpSent } from './SignUpForm';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/supabase', () => ({ createBrowserClient: () => ({}) }));

describe('AuthModeTabs', () => {
  it('marks the open tab and links each mode to its own address', () => {
    const html = renderToStaticMarkup(<AuthModeTabs mode="signup" onChange={() => {}} />);
    expect(html).toMatch(/aria-selected="true"[^>]*>Tạo tài khoản/);
    expect(html).toMatch(/aria-selected="false"[^>]*>Đăng nhập/);
  });
});

describe('SignUpForm', () => {
  it('asks for name, email and the password twice', () => {
    const html = renderToStaticMarkup(<SignUpForm redirect="/glossary" signupOpen />);
    for (const label of ['Họ và tên', 'Email', 'Mật khẩu', 'Nhập lại mật khẩu']) expect(html).toContain(label);
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('Tạo tài khoản miễn phí');
    expect(html).not.toContain('tạm đóng');
  });

  it('says so when sign-up is closed', () => {
    const html = renderToStaticMarkup(<SignUpForm redirect="/" signupOpen={false} />);
    expect(html).toContain('tạm đóng');
    expect(html).toMatch(/<button type="submit" disabled=""/);
  });
});

describe('SignUpSent', () => {
  it('tells the visitor where the confirmation went and offers to resend', () => {
    const html = renderToStaticMarkup(<SignUpSent email="an@gmail.com" resend="idle" onResend={() => {}} />);
    expect(html).toContain('an@gmail.com');
    expect(html).toContain('Gửi lại email');
  });
});

describe('OAuthButtonsView', () => {
  it('offers only the providers that are switched on', () => {
    const both = renderToStaticMarkup(<OAuthButtonsView providers={{ google: true, facebook: true }} busy={null} onChoose={() => {}} />);
    // Short visible names keep both buttons on one line; the full phrase is the accessible name.
    expect(both).toMatch(/aria-label="Tiếp tục với Google"[^>]*>[\s\S]*?<span>Google<\/span>/);
    expect(both).toMatch(/aria-label="Tiếp tục với Facebook"[^>]*>[\s\S]*?<span>Facebook<\/span>/);

    const google = renderToStaticMarkup(<OAuthButtonsView providers={{ google: true, facebook: false }} busy={null} onChoose={() => {}} />);
    expect(google).not.toContain('Facebook');

    expect(renderToStaticMarkup(<OAuthButtonsView providers={{ google: false, facebook: false }} busy={null} onChoose={() => {}} />)).toBe('');
  });

  it('holds both buttons while one provider opens', () => {
    const html = renderToStaticMarkup(<OAuthButtonsView providers={{ google: true, facebook: true }} busy="google" onChoose={() => {}} />);
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('Đang mở Google');
  });
});
