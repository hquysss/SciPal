'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';
import { AccountHelpModal } from './AccountHelpModal';

const SCIPAL_REMEMBERED_EMAIL_KEY = 'scipal-remembered-email-v1';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthCard() {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedDestination = searchParams.get('redirect');
  const targetDestination = requestedDestination?.startsWith('/') &&
    !requestedDestination.startsWith('//') && !requestedDestination.includes('\\')
    ? requestedDestination
    : '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [emailFormatError, setEmailFormatError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Restore remembered email on mount (à la Katha)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedEmail = localStorage.getItem(SCIPAL_REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        setIdentifier(savedEmail);
        passwordInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, []);

  const handleIdentifierBlur = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailFormatError(null);
      return;
    }
    // Only check email format if user entered an email address containing '@'
    if (trimmed.includes('@') && !EMAIL_REGEX.test(trimmed)) {
      setEmailFormatError(
        t({
          en: 'Invalid email address format (e.g. name@gmail.com)',
          vi: 'Định dạng email chưa hợp lệ (vd: name@gmail.com)',
        }),
      );
    } else {
      setEmailFormatError(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const emailToUse = identifier.trim();
    const passToUse = password;

    if (!emailToUse || !passToUse) {
      setErrorMsg(
        t({
          en: 'Please enter both your issued account and password.',
          vi: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu được cấp.',
        }),
      );
      return;
    }

    setSubmitting(true);

    try {
      // Remember me handling
      try {
        if (rememberMe) {
          localStorage.setItem(SCIPAL_REMEMBERED_EMAIL_KEY, emailToUse);
        } else {
          localStorage.removeItem(SCIPAL_REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // Ignore localStorage write error
      }

      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: passToUse,
      });

      if (error) {
        setErrorMsg(
          error.message.includes('Invalid login credentials')
            ? t({
                en: 'Invalid credentials. Please verify your issued account details.',
                vi: 'Thông tin tài khoản hoặc mật khẩu không chính xác.',
              })
            : /failed to fetch|fetch failed|network/i.test(error.message)
              ? t({
                  en: 'Cannot connect to sign-in. Please check your connection and try again.',
                  vi: 'Không thể kết nối để đăng nhập. Vui lòng kiểm tra mạng và thử lại.',
                })
              : error.message,
        );
      } else if (data.session) {
        router.replace(targetDestination);
        router.refresh();
      } else {
        setErrorMsg(t({
          en: 'Sign-in did not create a session. Please try again.',
          vi: 'Đăng nhập chưa tạo được phiên làm việc. Vui lòng thử lại.',
        }));
      }
    } catch {
      setErrorMsg(t({
        en: 'Cannot connect to sign-in. Please check your connection and try again.',
        vi: 'Không thể kết nối để đăng nhập. Vui lòng kiểm tra mạng và thử lại.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-200/90 bg-white/95 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-gray-900/95">
        {/* Header Row (Branding & Identity Stamp) */}
        <div className="border-b border-gray-100 bg-emerald-50/50 p-6 sm:p-8 dark:border-gray-800 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="SciPal Logo"
                width={44}
                height={44}
                className="h-11 w-11 rounded-2xl shadow-md"
                priority
              />
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-800 dark:text-emerald-300">
                  SciPal · Lab Access
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white">
                  {t({ en: 'Sign In', vi: 'Đăng nhập' })}{' '}
                  <span className="text-base font-normal text-emerald-600">✨</span>
                </h2>
              </div>
            </div>
            <span className="rounded-full border border-emerald-300 bg-white px-3 py-1 font-mono text-xs font-bold text-emerald-800 shadow-2xs dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300">
              SEC-ID: 2026
            </span>
          </div>

          <p className="mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {t({
              en: 'Enter your credentials issued by your school administration.',
              vi: 'Đăng nhập bằng tài khoản học sinh hoặc giáo viên do nhà trường cấp.',
            })}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
            >
              <span className="text-base leading-none">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="block text-sm font-bold text-gray-800 dark:text-gray-200"
              >
                {t({ en: 'School Email or Username', vi: 'Email trường cấp hoặc Tên tài khoản' })}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  ✉️
                </span>
                <input
                  ref={emailInputRef}
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (emailFormatError) setEmailFormatError(null);
                  }}
                  onBlur={(e) => handleIdentifierBlur(e.target.value)}
                  placeholder={
                    lang === 'en'
                      ? 'e.g. student.11a1@scipal.edu.vn'
                      : 'vd: hocsinh.11a1@scipal.edu.vn'
                  }
                  autoComplete="username"
                  disabled={submitting}
                  aria-invalid={Boolean(emailFormatError || errorMsg)}
                  aria-describedby={emailFormatError ? 'identifier-format-error' : undefined}
                  className="w-full rounded-2xl border border-gray-300/90 bg-white py-3 pl-10 pr-4 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
              </div>
              {emailFormatError && (
                <p id="identifier-format-error" className="text-xs font-semibold text-red-600">
                  {emailFormatError}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-bold text-gray-800 dark:text-gray-200"
              >
                {t({ en: 'Password', vi: 'Mật khẩu' })}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  🔒
                </span>
                <input
                  ref={passwordInputRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={submitting}
                  className="w-full rounded-2xl border border-gray-300/90 bg-white py-3 pl-10 pr-12 text-base font-medium text-gray-900 placeholder:text-gray-400 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Auxiliary Row: Remember Me & Need Help? (Katha Style) */}
            <div className="flex items-center justify-between text-xs sm:text-sm pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>{t({ en: 'Remember account', vi: 'Ghi nhớ tài khoản' })}</span>
              </label>

              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 dark:text-emerald-400 transition"
              >
                {t({ en: 'Need help?', vi: 'Cần trợ giúp?' })}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 py-3.5 text-center text-base font-bold text-white shadow-md hover:bg-emerald-600 active:scale-[0.99] disabled:opacity-50 transition duration-150 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>{t({ en: 'Verifying credentials...', vi: 'Đang xác thực...' })}</span>
                </>
              ) : (
                <>
                  <span>{t({ en: 'Sign In', vi: 'Đăng nhập' })}</span>
                  <span className="text-lg leading-none">→</span>
                </>
              )}
            </button>
          </form>

          {/* Institutional Footnote */}
          <div className="border-t border-gray-100 pt-4 text-center dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              🛡️{' '}
              {t({
                en: 'Secured educational environment for verified teachers and students.',
                vi: 'Môi trường giáo dục bảo mật dành riêng cho học sinh & giáo viên.',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Account Help Modal */}
      <AccountHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </>
  );
}
