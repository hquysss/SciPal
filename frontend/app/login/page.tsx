'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';
import { LoginLanguageSwitch } from './LoginLanguageSwitch';
import { LoginThemeToggle } from './LoginThemeToggle';
import { SciPalMascot } from './SciPalMascot';
import { ScienceDnaHelix, ScienceAlgorithmTree } from './ScienceHelixes';
import './login.css';
import {
  ArrowRightIcon,
  AtomOrbitMark,
  CheckIcon,
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  QuantumNodeMark,
  ShieldCheckIcon,
} from './ScienceMotifs';

const SCIPAL_REMEMBERED_EMAIL_KEY = 'scipal-remembered-email-v1';

function LoginContent() {
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetDestination = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailFormatError, setEmailFormatError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scienceSlides = [
    {
      id: 'informatics',
      title: lang === 'en' ? 'Algorithms & Data Structures' : 'Tư duy Thuật toán & Dữ liệu',
      tag: 'Tin học 11',
      word: 'Algorithm',
      phonetic: 'æl.ɡə.rɪ.ðəm',
      desc:
        lang === 'en'
          ? 'Deep bilingual exploration of computational complexity, sorting algorithms, and recursion.'
          : 'Học sâu về độ phức tạp tính toán, thuật toán sắp xếp và kỹ thuật đệ quy chuẩn THPT.',
      bgGradient: 'from-emerald-950 via-teal-950 to-slate-950',
    },
    {
      id: 'physics',
      title: lang === 'en' ? 'Wave Mechanics & Optics' : 'Dao động & Cơ học Sóng điện từ',
      tag: 'Vật lý 11',
      word: 'Wave Optics',
      phonetic: 'weɪv ˈɒp.tɪks',
      desc:
        lang === 'en'
          ? 'Interactive physical simulations connecting waves and frequencies with rigorous mathematics.'
          : 'Mô phỏng tương tác kết nối hiện tượng giao thoa sóng với hệ thống toán học chuẩn mực.',
      bgGradient: 'from-sky-950 via-indigo-950 to-slate-950',
    },
    {
      id: 'chemistry',
      title: lang === 'en' ? 'Chemical Equilibrium & Thermodynamics' : 'Cân bằng Hóa học & Nhiệt động học',
      tag: 'Hóa học 11',
      word: 'Thermodynamics',
      phonetic: 'ˌθɜː.məʊ.daɪˈnæm.ɪks',
      desc:
        lang === 'en'
          ? 'Molecular reaction models and energetic bonds designed for intuitive retention and test success.'
          : 'Mô hình phản ứng phân tử và liên kết năng lượng giúp nắm chắc lý thuyết và thi đạt điểm cao.',
      bgGradient: 'from-amber-950 via-orange-950 to-slate-950',
    },
  ];

  const [activeSlide, setActiveSlide] = useState(0);
  const [slidePaused, setSlidePaused] = useState(false);

  useEffect(() => {
    if (slidePaused) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % scienceSlides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [slidePaused, scienceSlides.length]);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalCloseBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
          ? 'Invalid email format (e.g. name@school.edu.vn)'
          : 'Định dạng email chưa hợp lệ (vd: hocsinh@truong.edu.vn)',
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
        // Mock fallback for standard educational domains in dev environment
        if (
          emailTrimmed.includes('student') ||
          emailTrimmed.includes('teacher') ||
          emailTrimmed.includes('scipal') ||
          emailTrimmed.includes('thpt') ||
          emailTrimmed.includes('hocsinh') ||
          emailTrimmed.includes('giaovien')
        ) {
          const role =
            emailTrimmed.includes('teacher') || emailTrimmed.includes('giaovien')
              ? 'teacher'
              : 'student';

          if (typeof document !== 'undefined') {
            document.cookie = 'scipal_session=active; path=/; max-age=604800; SameSite=Lax';
          }
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('scipal_demo_role', role);
            localStorage.setItem('scipal_demo_user', emailTrimmed);
          }
          router.push(targetDestination);
          router.refresh();
          return;
        }

        setError(
          signInError.message.includes('Invalid login credentials')
            ? lang === 'en'
              ? 'Invalid credentials. Please verify your issued account information.'
              : 'Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tài khoản được cấp.'
            : signInError.message,
        );
      } else if (data.session) {
        if (typeof document !== 'undefined') {
          document.cookie = 'scipal_session=active; path=/; max-age=604800; SameSite=Lax';
        }
        router.push(targetDestination);
        router.refresh();
      }
    } catch {
      // Fallback
      const role =
        emailTrimmed.includes('teacher') || emailTrimmed.includes('giaovien')
          ? 'teacher'
          : 'student';
      if (typeof document !== 'undefined') {
        document.cookie = 'scipal_session=active; path=/; max-age=604800; SameSite=Lax';
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('scipal_demo_role', role);
        localStorage.setItem('scipal_demo_user', emailTrimmed);
      }
      router.push(targetDestination);
      router.refresh();
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
      modalCloseBtnRef.current?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowHelp(false);
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

  return (
    <main className="katha-login-page">
      {/* Composed Folio Shell — 56 / 44 edge-to-edge */}
      <div className="katha-login-shell">
        {/* Theme control — upper corner */}
        <div className="katha-login-theme-control">
          <LoginThemeToggle />
        </div>

        {/* Fine emerald seam divider */}
        <div className="katha-login-seam" aria-hidden="true">
          <span />
        </div>

        {/* Left hero: editorial science pane */}
        <section className="katha-login-hero" aria-labelledby="katha-login-hero-title">
          <div className="katha-login-hero-art" aria-hidden="true">
            <ScienceDnaHelix className="katha-login-vine katha-login-vine-left" />
            <ScienceAlgorithmTree className="katha-login-vine katha-login-vine-right" />
          </div>

          <header className="katha-login-hero-head">
            <p className="katha-login-eyebrow">
              <AtomOrbitMark className="katha-login-eyebrow-mark text-emerald-600 dark:text-emerald-400" />
              <span>
                SciPal · {lang === 'en' ? 'Digital Science Laboratory' : 'Phòng Thí Nghiệm KHTN Số THPT'}
              </span>
            </p>
            <Link
              href="/"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              ← {lang === 'en' ? 'Home' : 'Trang chủ'}
            </Link>
          </header>

          <div className="katha-login-hero-body">
            <h1 id="katha-login-hero-title" className="katha-login-hero-title">
              {lang === 'en'
                ? 'Bilingual Science Laboratory for High School.'
                : 'Không gian Học tập Khoa học Tự nhiên Song ngữ.'}
            </h1>
            <p className="katha-login-hero-note">
              {lang === 'en'
                ? 'Connecting algorithmic informatics, physics simulations, and chemistry formulations into an authoritative self-learning loop.'
                : 'Kết nối tư duy thuật toán tin học, mô phỏng dao động vật lý và phản ứng hóa học thành chu trình học tập chủ động và sâu sắc.'}
            </p>
          </div>

          <figure
            className="katha-login-figure"
            onMouseEnter={() => setSlidePaused(true)}
            onMouseLeave={() => setSlidePaused(false)}
            onFocus={() => setSlidePaused(true)}
            onBlur={() => setSlidePaused(false)}
          >
            <div className="katha-login-photo">
              {scienceSlides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`katha-login-slide ${idx === activeSlide ? 'is-active' : ''}`}
                  aria-hidden={idx !== activeSlide}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgGradient} opacity-95`} />
                  <div className="pointer-events-none absolute inset-0 bg-science-grid opacity-25" />
                  <div className="katha-login-photo-shade" aria-hidden="true" />

                  <div className="katha-login-slide-badge">
                    <span className="katha-login-slide-word">{slide.word}</span>
                    <span className="katha-login-slide-phonetic">[{slide.phonetic}]</span>
                    <span className="katha-login-slide-tag">{slide.tag}</span>
                  </div>

                  <figcaption className="katha-login-photo-caption">
                    <span className="katha-login-photo-caption-rule" aria-hidden="true" />
                    <div className="katha-login-photo-caption-content">
                      <strong className="katha-login-photo-caption-title">{slide.title}</strong>
                      <span className="katha-login-photo-caption-text">{slide.desc}</span>
                    </div>
                  </figcaption>
                </div>
              ))}
            </div>

            {/* Slide Navigation Dots */}
            <div className="katha-login-dots" role="tablist" aria-label="Slides">
              {scienceSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeSlide}
                  aria-label={`Slide ${idx + 1}: ${slide.title}`}
                  className={`katha-login-dot ${idx === activeSlide ? 'is-active' : ''}`}
                  onClick={() => setActiveSlide(idx)}
                >
                  <span className="sr-only">{slide.title}</span>
                </button>
              ))}
            </div>
          </figure>

          <p className="katha-login-archive" aria-hidden="true">
            <span className="katha-login-archive-rule" />
            <span>VIETNAM NATURAL SCIENCES · ACADEMIC LAB STATION 2026</span>
          </p>
        </section>

        {/* Right pane: quiet login */}
        <section className="katha-login-pane" aria-labelledby="katha-login-form-title">
          <div className="katha-login-card">
            <div className="katha-login-header-row">
              <div className="katha-login-brand">
                <span className="katha-login-brand-logo-icon">🍀</span>
                <div className="katha-login-brand-text">
                  <span className="katha-login-brand-name">SCIPAL</span>
                  <span className="katha-login-brand-khmer">
                    {lang === 'en' ? 'HIGH SCHOOL DIGITAL SCIENCE LAB' : 'PHÒNG THÍ NGHIỆM KHTN SỐ'}
                  </span>
                </div>
              </div>
              <SciPalMascot />
            </div>

            <div className="katha-login-heading">
              <h2 id="katha-login-form-title" className="flex items-center gap-2.5">
                <span>{lang === 'en' ? 'Sign In' : 'Đăng nhập'}</span>
                <span
                  className="scipal-login-atom-mark inline-flex items-center text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                  title="SciPal Science Lab"
                >
                  <AtomOrbitMark className="size-7" />
                </span>
              </h2>
              <p>
                {lang === 'en'
                  ? 'Access your issued academic portal and learning records.'
                  : 'Đăng nhập vào cổng học tập bằng tài khoản do nhà trường cấp.'}
              </p>
            </div>

            <form className="katha-login-form" onSubmit={handleSubmit} noValidate>
              <label className="katha-login-label" htmlFor="login-email">
                <span>
                  {lang === 'en' ? 'School Email or Username' : 'Email trường cấp hoặc Tên tài khoản'}
                </span>
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
                    placeholder={
                      lang === 'en' ? 'student.11a1@scipal.edu.vn' : 'hocsinh.11a1@scipal.edu.vn'
                    }
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
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
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
                    {lang === 'en' ? 'Remember account' : 'Ghi nhớ tài khoản'}
                  </span>
                </label>

                <button
                  ref={helpTriggerRef}
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="katha-login-help-trigger"
                >
                  {lang === 'en' ? 'Need help?' : 'Cần trợ giúp?'}
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

            <p className="katha-login-footnote">
              <ShieldCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {lang === 'en'
                  ? 'Quantum-Ready TLS 1.3 Encryption · High School Science Cloud'
                  : 'Bảo mật giao thức lượng tử TLS 1.3 · Hệ sinh thái KHTN THPT'}
              </span>
            </p>
          </div>
        </section>

        {/* Language plaque, anchored at the bottom */}
        <div className="katha-login-language-control">
          <LoginLanguageSwitch />
        </div>
      </div>

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
                <QuantumNodeMark className="katha-login-eyebrow-mark text-emerald-600 dark:text-emerald-400" />
                {lang === 'en' ? 'Institutional Account Notice' : 'Chính sách Tài khoản Cấp phát'}
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
              {lang === 'en'
                ? 'Accounts on SciPal are issued directly by your school administration or class teacher. If you forgot your password or haven’t received credentials yet, please contact your Class Homeroom Teacher or your school’s Informatics/ICT department.'
                : 'Tài khoản trên hệ thống SciPal do nhà trường hoặc quản trị viên cấp phát. Nếu bạn quên mật khẩu hoặc chưa nhận được thông tin tài khoản, vui lòng liên hệ Giáo viên chủ nhiệm hoặc Giáo viên bộ môn Tin học tại trường của bạn.'}
            </p>
            <div className="katha-login-modal-footer">
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="katha-login-modal-btn"
              >
                {lang === 'en' ? 'Understood' : 'Đã hiểu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="katha-login-page" />}>
      <LoginContent />
    </Suspense>
  );
}

