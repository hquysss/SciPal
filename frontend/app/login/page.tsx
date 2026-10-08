'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { ThemeToggle } from '@/components/nav/ThemeToggle';
import { TrialEndedNote } from '@/features/guest/TrialEndedNote';
import { readAuthSettings, safeRedirect, type AuthSettings, type Bilingual } from '@/lib/authFlow';
import { fetchSiteSettings } from '@/lib/siteSettings';
import { AuthModeTabs, type AuthMode } from './AuthModeTabs';
import { LoginLanguageSwitch } from './LoginLanguageSwitch';
import { OAuthButtons } from './OAuthButtons';
import { SciPalMascot } from './SciPalMascot';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ArrowRightIcon, AtomOrbitMark, CloseIcon, ShieldCheckIcon } from './ScienceMotifs';
import './login.css';

function LoginContent() {
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();
  const destination = safeRedirect(searchParams.get('redirect'));
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get('mode') === 'signup' || searchParams.get('reason') === 'trial' ? 'signup' : 'signin',
  );
  const initialMode = useRef(mode);
  const signupPanel = useRef<HTMLDivElement>(null);
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null);
  const [signupSwitch, setSignupSwitch] = useState(true);
  const [notice, setNotice] = useState<(Bilingual & { tone: 'danger' | 'info' }) | null>(() => {
    const failure = searchParams.get('error');
    if (failure === 'oauth') {
      return { tone: 'danger', vi: 'Chưa đăng nhập được bằng Google. Bạn thử lại, hoặc dùng email.', en: 'Google sign-in did not finish. Try again, or use email.' };
    }
    if (failure === 'link') {
      return { tone: 'info', vi: 'Link xác nhận đã dùng rồi. Email của bạn có lẽ đã được xác nhận, hãy đăng nhập.', en: 'That confirmation link was already used. Your email is probably confirmed, so sign in.' };
    }
    return null;
  });

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const controller = new AbortController();
    if (url && key) {
      fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => setAuthSettings(readAuthSettings(body)))
        .catch(() => setAuthSettings(null));
    }
    void fetchSiteSettings().then((site) => setSignupSwitch(site.signupEnabled));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (initialMode.current !== 'signup' || window.matchMedia('(max-width: 767px)').matches) return;
    const frame = requestAnimationFrame(() => signupPanel.current?.querySelector('input')?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  function switchMode(next: AuthMode) {
    setMode(next);
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused.closest('[role="tabpanel"]')) {
      requestAnimationFrame(() => document.getElementById(`auth-tab-${next}`)?.focus());
    }
  }

  const providers = { google: authSettings?.google ?? true };
  const handleOAuthError = (message: Bilingual) => setNotice({ ...message, tone: 'danger' });

  return (
    <main id="main-content" className="katha-login-page" lang={lang}>
      <header className="login-topbar">
        <Link href="/" className="login-brand" aria-label={t({ vi: 'SciPal · Trang chủ', en: 'SciPal · Home' })}>
          <Image src="/logo.svg" alt="" width={38} height={38} priority />
          <span>SciPal<span className="login-brand-note">{t({ vi: 'Học bằng sự tò mò', en: 'Learn through curiosity' })}</span></span>
        </Link>
        <div className="login-topbar-controls">
          <LoginLanguageSwitch />
          <ThemeToggle tone="surface" />
        </div>
      </header>

      <div className="login-mode-control"><AuthModeTabs mode={mode} onChange={switchMode} /></div>
      {searchParams.get('reason') === 'trial' && <div className="login-global-notice"><TrialEndedNote /></div>}
      {notice && (
        <div role={notice.tone === 'danger' ? 'alert' : 'status'} className={`katha-auth-notice login-global-notice ${notice.tone === 'danger' ? 'is-danger' : 'is-info'}`}>
          <p>{t(notice)}</p>
          <button type="button" className="katha-auth-notice-close" onClick={() => setNotice(null)} aria-label={t({ vi: 'Đóng thông báo', en: 'Dismiss' })}><CloseIcon /></button>
        </div>
      )}

      <div className="katha-login-shell" data-mode={mode}>
        <div className="login-stage">
          <section id="auth-panel-signin" role="tabpanel" aria-labelledby="auth-tab-signin" className="login-form-panel login-signin-panel" aria-hidden={mode !== 'signin'} inert={mode !== 'signin'}>
            <div className="katha-login-card">
              <div className="katha-login-heading">
                <p className="login-form-eyebrow">{t({ vi: 'HÀNH TRÌNH TIẾP TỤC', en: 'YOUR JOURNEY CONTINUES' })}</p>
                <h1>{t({ vi: 'Chào bạn trở lại.', en: 'Welcome back.' })}</h1>
                <p>{t({ vi: 'Một chút tò mò. Một điều mới mỗi ngày.', en: 'A little curiosity. Something new every day.' })}</p>
              </div>
              <SignInForm redirect={destination} initiallyActive={initialMode.current === 'signin'} />
              <OAuthButtons providers={providers} redirect={destination} onError={handleOAuthError} />
            </div>
          </section>

          <section ref={signupPanel} id="auth-panel-signup" role="tabpanel" aria-labelledby="auth-tab-signup" className="login-form-panel login-signup-panel" aria-hidden={mode !== 'signup'} inert={mode !== 'signup'}>
            <div className="katha-login-card">
              <div className="katha-login-heading">
                <p className="login-form-eyebrow">{t({ vi: 'BẮT ĐẦU TỪ ĐÂY', en: 'START RIGHT HERE' })}</p>
                <h1>{t({ vi: 'Mở lối khám phá.', en: 'Make room for discovery.' })}</h1>
                <p>{t({ vi: 'Tạo tài khoản và tìm điều bạn muốn hiểu.', en: 'Create your account. Find what sparks your curiosity.' })}</p>
              </div>
              <SignUpForm redirect={destination} signupOpen={(authSettings?.signupOpen ?? true) && signupSwitch} />
              <OAuthButtons providers={providers} redirect={destination} onError={handleOAuthError} />
            </div>
          </section>

          <aside className="login-welcome" aria-labelledby="login-welcome-title">
            <div className="login-welcome-content">
              <p className="login-welcome-eyebrow"><AtomOrbitMark />{t({ vi: 'KHÔNG GIAN HỌC TẬP SONG NGỮ', en: 'YOUR BILINGUAL LEARNING SPACE' })}</p>
              <div className="login-professor-scene">
                <div className="login-orbit login-orbit-one" aria-hidden="true" />
                <div className="login-orbit login-orbit-two" aria-hidden="true" />
                <span className="login-science-label login-label-en" aria-hidden="true">Curiosity</span>
                <span className="login-science-label login-label-vi" aria-hidden="true">Sự tò mò</span>
                <SciPalMascot size={184} customMessages={{ vi: ['Mình ở đây để cùng bạn khám phá. Bắt đầu từ điều bạn tò mò nhé!'], en: ["I'm right here to explore with you. Start with what makes you curious!"] }} />
              </div>
              <div className="login-welcome-copy" key={mode}>
                <h2 id="login-welcome-title">{mode === 'signin' ? t({ vi: 'Điều hay đang\nchờ bạn.', en: 'Your next discovery\nstarts here.' }) : t({ vi: 'Rất vui được\ngặp lại bạn.', en: 'Good to have\nyou back.' })}</h2>
                <p>{mode === 'signin' ? t({ vi: 'Cùng Giáo sư SciPal khám phá bài học, mô phỏng và những ý tưởng mới bằng cả hai ngôn ngữ.', en: 'Explore lessons, simulations and new ideas in two languages with the SciPal Professor.' }) : t({ vi: 'Đã có tài khoản? Đăng nhập để tiếp tục khám phá cùng Giáo sư SciPal.', en: 'Already have an account? Sign in and keep exploring with the SciPal Professor.' })}</p>
              </div>
              <button type="button" className="login-welcome-switch" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
                <span>{mode === 'signin' ? t({ vi: 'Tạo tài khoản', en: 'Create account' }) : t({ vi: 'Đăng nhập', en: 'Sign in' })}</span><ArrowRightIcon />
              </button>
              <p className="login-welcome-footer"><span>EN</span><span className="login-language-bridge" aria-hidden="true" /><span>VI</span><span>{t({ vi: 'Hai ngôn ngữ. Một thế giới khám phá.', en: 'Two languages. One world to explore.' })}</span></p>
            </div>
          </aside>
        </div>
      </div>
      <footer className="login-footer">
        <span><ShieldCheckIcon />{t({ vi: 'Không gian học tập riêng tư của bạn', en: 'Your private learning space' })}</span>
        <Link href="/">{t({ vi: 'Về trang chủ', en: 'Back to home' })}<ArrowRightIcon /></Link>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="katha-login-page" />}><LoginContent /></Suspense>;
}
