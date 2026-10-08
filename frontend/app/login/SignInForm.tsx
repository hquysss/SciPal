'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';
import { callbackUrl } from '@/lib/authFlow';
import { ArrowRightIcon, CheckIcon, CloseIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, QuantumNodeMark } from './ScienceMotifs';
const SCIPAL_REMEMBERED_EMAIL_KEY = 'scipal-remembered-email-v1';
export function SignInForm({ redirect: targetDestination, initiallyActive }: {
  readonly redirect: string;
  readonly initiallyActive: boolean;
}) {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const autofocus = useRef(initiallyActive);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [resetError, setResetError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailFormatError, setEmailFormatError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalCloseBtnRef = useRef<HTMLButtonElement>(null);
  const resetEmailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autofocus.current || window.matchMedia('(max-width: 767px)').matches) return;
    let savedEmail: string | null = null;
    try {
      savedEmail = localStorage.getItem(SCIPAL_REMEMBERED_EMAIL_KEY);
    } catch {
      // Ignore localStorage read errors
    }

    const frame = requestAnimationFrame(() => {
      if (savedEmail) {
        setEmail(savedEmail);
        passwordInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  async function sendResetLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetStatus('sending');
    setResetError(null);
    try {
      const { error: resetFailure } = await createBrowserClient().auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${callbackUrl(window.location.origin, '/reset-password')}&flow=recovery`,
      });
      if (resetFailure) {
        setResetError(lang === 'en' ? 'Could not send the link. Check your connection and try again.' : 'Chưa gửi được link. Kiểm tra kết nối rồi thử lại.');
        setResetStatus('failed');
      } else {
        setResetStatus('sent');
      }
    } catch {
      setResetError(lang === 'en' ? 'Could not send the link. Check your connection and try again.' : 'Chưa gửi được link. Kiểm tra kết nối rồi thử lại.');
      setResetStatus('failed');
    }
  }

  function handleEmailBlur(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailFormatError(null);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmed.includes('@') && !emailRegex.test(trimmed)) {
      setEmailFormatError(
        lang === 'en'
          ? 'Invalid email format (e.g. name@gmail.com)'
          : 'Định dạng email chưa hợp lệ (vd: name@gmail.com)',
      );
    } else {
      setEmailFormatError(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setError(
        lang === 'en'
          ? 'Please enter both your account identifier and password.'
          : 'Vui lòng điền đầy đủ tài khoản và mật khẩu.',
      );
      return;
    }

    setSubmitting(true);
    try {
      if (rememberMe) {
        localStorage.setItem(SCIPAL_REMEMBERED_EMAIL_KEY, emailTrimmed);
      } else {
        localStorage.removeItem(SCIPAL_REMEMBERED_EMAIL_KEY);
      }
    } catch {
      // Ignore storage errors
    }

    try {
      const supabase = createBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });

      if (signInError) {
        setError(
          signInError.message.includes('Invalid login credentials')
            ? lang === 'en'
              ? 'Wrong email or password. Please check and try again.'
              : 'Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.'
            : /failed to fetch|fetch failed|network/i.test(signInError.message)
              ? lang === 'en'
                ? 'Cannot connect to sign-in. Please check your connection and try again.'
                : 'Không thể kết nối để đăng nhập. Vui lòng kiểm tra mạng và thử lại.'
              : signInError.message,
        );
      } else if (data.session) {
        router.replace(targetDestination);
        router.refresh();
      } else {
        setError(
          lang === 'en'
            ? 'Sign-in did not create a session. Please try again.'
            : 'Đăng nhập chưa tạo được phiên làm việc. Vui lòng thử lại.',
        );
      }
    } catch {
      setError(
        lang === 'en'
          ? 'Cannot connect to sign-in. Please check your connection and try again.'
          : 'Không thể kết nối để đăng nhập. Vui lòng kiểm tra mạng và thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!showHelp) return;

    const helpTrigger = helpTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frameId = window.requestAnimationFrame(() => {
      resetEmailRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowHelp(false);
      if (event.key === 'Tab') {
        const controls = modalRef.current?.querySelectorAll<HTMLButtonElement>('button');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      helpTrigger?.focus();
    };
  }, [showHelp]);


  return <>
            <form className="katha-login-form" onSubmit={handleSubmit} noValidate>
              <label className="katha-login-label" htmlFor="login-email">
                <span>{lang === 'en' ? 'Email' : 'Email'}</span>
                <div className="katha-login-input-wrap">
                  <MailIcon className="katha-login-input-icon" />
                  <input
                    ref={emailInputRef}
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (emailFormatError) setEmailFormatError(null);
                    }}
                    onBlur={(event) => handleEmailBlur(event.target.value)}
                    placeholder="name@gmail.com"
                    disabled={submitting}
                    aria-invalid={Boolean(error || emailFormatError)}
                    aria-describedby={emailFormatError ? 'login-email-error' : undefined}
                  />
                </div>
                {emailFormatError && (
                  <p id="login-email-error" className="katha-login-field-error" role="alert">
                    {emailFormatError}
                  </p>
                )}
              </label>

              <label className="katha-login-label" htmlFor="login-password">
                <span>{lang === 'en' ? 'Password' : 'Mật khẩu'}</span>
                <div className="katha-login-input-wrap">
                  <LockIcon className="katha-login-input-icon" />
                  <input
                    ref={passwordInputRef}
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    disabled={submitting}
                    aria-invalid={Boolean(error)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="katha-login-password-toggle"
                    aria-controls="login-password"
                    aria-label={showPassword ? t({ vi: 'Ẩn mật khẩu', en: 'Hide password' }) : t({ vi: 'Hiện mật khẩu', en: 'Show password' })}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </label>

              {/* Auxiliary row: remember me & account help */}
              <div className="katha-login-aux">
                <label className="katha-login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <span className={`katha-login-checkbox-box ${rememberMe ? 'checked' : ''}`}>
                    {rememberMe && <CheckIcon />}
                  </span>
                  <span className="katha-login-remember-text">
                    {lang === 'en' ? 'Remember login' : 'Ghi nhớ đăng nhập'}
                  </span>
                </label>

                <button
                  ref={helpTriggerRef}
                  type="button"
                  onClick={() => { setResetEmail(email); setResetStatus('idle'); setResetError(null); setShowHelp(true); }}
                  className="katha-login-help-trigger"
                >
                  {lang === 'en' ? 'Need account help?' : 'Cần hỗ trợ tài khoản?'}
                </button>
              </div>

              {/* Error alert */}
              {error && (
                <div id="login-error" role="alert" className="katha-login-error">
                  <span aria-hidden="true">!</span>
                  <p>{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button type="submit" disabled={submitting} className="katha-login-submit">
                <span>
                  {submitting
                    ? lang === 'en'
                      ? 'Signing in...'
                      : 'Đang xác thực...'
                    : lang === 'en'
                      ? 'Sign In'
                      : 'Đăng nhập'}
                </span>
                {submitting ? (
                  <span className="katha-login-spinner" aria-hidden="true" />
                ) : (
                  <ArrowRightIcon className="katha-login-submit-arrow" />
                )}
              </button>

            </form>
      {/* Account help modal */}
      {showHelp && (
        <div
          className="katha-login-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="katha-help-title"
          aria-describedby="katha-help-body"
          onClick={() => setShowHelp(false)}
        >
          <div
            ref={modalRef}
            className="katha-login-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="katha-login-modal-header">
              <h3 id="katha-help-title">
                <QuantumNodeMark className="katha-login-eyebrow-mark text-action" />
                {lang === 'en' ? 'Account help' : 'Hỗ trợ tài khoản'}
              </h3>
              <button
                ref={modalCloseBtnRef}
                type="button"
                onClick={() => setShowHelp(false)}
                className="katha-login-modal-close"
                aria-label={lang === 'en' ? 'Close' : 'Đóng'}
              >
                <CloseIcon />
              </button>
            </div>
            <p id="katha-help-body" className="katha-login-modal-body">
              {t({ vi: 'Nhập email tài khoản. Nếu email này có tài khoản SciPal, mình sẽ gửi link đặt lại mật khẩu cho bạn.', en: 'Enter your account email. If it belongs to a SciPal account, we will send you a password reset link.' })}
              {' '}{t({ vi: 'Với tài khoản do trường cấp, bạn liên hệ quản trị viên của trường.', en: 'For a school-issued account, contact your school administrator.' })}
            </p>
            <form className="katha-login-form" onSubmit={(event) => void sendResetLink(event)}>
              <label className="katha-login-label" htmlFor="reset-email">
                <span>Email</span>
                <div className="katha-login-input-wrap">
                  <MailIcon className="katha-login-input-icon" />
                  <input ref={resetEmailRef} id="reset-email" type="email" autoComplete="email" inputMode="email" required value={resetEmail} onChange={(event) => { setResetEmail(event.target.value); setResetStatus('idle'); setResetError(null); }} placeholder="name@gmail.com" disabled={resetStatus === 'sending'} />
                </div>
              </label>
              {resetStatus === 'sent' && <p className="katha-reset-success" role="status">{t({ vi: 'Nếu email này có tài khoản, link đặt lại mật khẩu đã được gửi. Kiểm tra cả thư mục Spam nhé.', en: 'If this email has an account, the password reset link is on its way. Check your Spam folder too.' })}</p>}
              {resetError && <div className="katha-login-error" role="alert"><p>{resetError}</p></div>}
              <div className="katha-login-modal-footer">
                <button type="submit" disabled={resetStatus === 'sending'} className="katha-login-modal-btn">
                  {resetStatus === 'sending' ? t({ vi: 'Đang gửi…', en: 'Sending…' }) : resetStatus === 'sent' ? t({ vi: 'Gửi lại link', en: 'Resend link' }) : t({ vi: 'Gửi link đặt lại', en: 'Send reset link' })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  </>;
}
