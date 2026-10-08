'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';
import { PASSWORD_MIN, authErrorText, callbackUrl, validateSignUp, type Bilingual, type SignUpErrors, type SignUpFields } from '@/lib/authFlow';
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from './ScienceMotifs';

// Anyone can make a free student account with e-mail and password. If the project asks for e-mail
// confirmation, Supabase returns no session and the visitor finishes from the link in the mail.

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" className="katha-login-input-icon" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  );
}

function Field({
  id,
  label,
  icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="katha-login-label" htmlFor={id}>
      <span>{label}</span>
      <div className="katha-login-input-wrap">
        {icon}
        {children}
      </div>
      {error && <p id={`${id}-error`} className="katha-login-field-error" role="alert">{error}</p>}
    </label>
  );
}

type Resend = 'idle' | 'sending' | 'sent' | 'failed';

export function SignUpSent({ email, resend, onResend }: { email: string; resend: Resend; onResend: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="katha-signup-sent" role="status">
      <MailIcon className="katha-signup-sent-icon" />
      <p className="katha-signup-sent-title">{t({ vi: 'Kiểm tra hộp thư của bạn', en: 'Check your inbox' })}</p>
      <p>
        {t({ vi: 'SciPal đã gửi link xác nhận tới ', en: 'SciPal sent a confirmation link to ' })}
        <strong>{email}</strong>
        {t({ vi: '. Mở email và bấm link để bắt đầu học. Không thấy thì xem thư mục Spam.', en: '. Open it and follow the link to start learning. Not there? Check Spam.' })}
      </p>
      <button type="button" className="katha-login-help-trigger" disabled={resend === 'sending' || resend === 'sent'} onClick={onResend}>
        {resend === 'sent'
          ? t({ vi: 'Đã gửi lại', en: 'Sent again' })
          : resend === 'sending'
            ? t({ vi: 'Đang gửi…', en: 'Sending…' })
            : t({ vi: 'Gửi lại email', en: 'Resend email' })}
      </button>
      {resend === 'failed' && (
        <p className="katha-login-field-error" role="alert">
          {t({ vi: 'Chưa gửi lại được, thử lại sau ít phút.', en: 'Could not resend. Try again in a few minutes.' })}
        </p>
      )}
    </div>
  );
}

export function SignUpForm({
  redirect,
  signupOpen,
  onSwitchToSignIn,
}: {
  redirect: string;
  signupOpen: boolean;
  onSwitchToSignIn?: () => void;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [fields, setFields] = useState<SignUpFields>({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [error, setError] = useState<Bilingual | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resend, setResend] = useState<Resend>('idle');

  const set = (key: keyof SignUpFields) => (value: string) => {
    setFields((previous) => ({ ...previous, [key]: value }));
    if (errors[key]) setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const found = validateSignUp(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    const email = fields.email.trim();
    try {
      const { data, error: signUpError } = await createBrowserClient().auth.signUp({
        email,
        password: fields.password,
        options: { data: { full_name: fields.name.trim() }, emailRedirectTo: callbackUrl(window.location.origin, redirect) },
      });
      if (signUpError) {
        setError(authErrorText(signUpError.message, signUpError.status, signUpError.code));
      } else if (data.session) {
        router.replace(redirect);
        router.refresh();
        return;
      } else if (data.user && data.user.identities?.length === 0) {
        // With confirmation on, Supabase answers an existing e-mail with a user that has no identities.
        setError(authErrorText('User already registered'));
      } else {
        setSentTo(email);
      }
    } catch {
      setError(authErrorText('network'));
    }
    setSubmitting(false);
  }

  async function resendEmail() {
    if (!sentTo) return;
    setResend('sending');
    try {
      const { error: resendError } = await createBrowserClient().auth.resend({
        type: 'signup',
        email: sentTo,
        options: { emailRedirectTo: callbackUrl(window.location.origin, redirect) },
      });
      setResend(resendError ? 'failed' : 'sent');
    } catch {
      setResend('failed');
    }
  }

  if (sentTo) return <SignUpSent email={sentTo} resend={resend} onResend={() => void resendEmail()} />;

  const disabled = submitting || !signupOpen;
  const input = (id: string, key: keyof SignUpFields) => ({
    id,
    value: fields[key],
    onChange: (event: { target: { value: string } }) => set(key)(event.target.value),
    disabled,
    'aria-invalid': Boolean(errors[key]),
    'aria-describedby': errors[key] ? `${id}-error` : undefined,
  });

  return (
    <form className="katha-login-form" onSubmit={submit} noValidate>
      {!signupOpen && (
        <div role="status" className="katha-login-trial-note">
          {t({ vi: 'SciPal đang tạm đóng đăng ký bằng email. Bạn quay lại sau nhé.', en: 'SciPal is not taking email sign-ups right now. Please come back later.' })}
        </div>
      )}

      <Field id="signup-name" label={t({ vi: 'Họ và tên', en: 'Full name' })} icon={<UserIcon />} error={errors.name && t(errors.name)}>
        <input {...input('signup-name', 'name')} type="text" autoComplete="name" maxLength={80} placeholder={t({ vi: 'Nguyễn Văn An', en: 'Alex Nguyen' })} />
      </Field>

      <Field id="signup-email" label="Email" icon={<MailIcon className="katha-login-input-icon" />} error={errors.email && t(errors.email)}>
        <input {...input('signup-email', 'email')} type="email" autoComplete="email" inputMode="email" placeholder="name@gmail.com" />
      </Field>

      <Field id="signup-password" label={t({ vi: 'Mật khẩu', en: 'Password' })} icon={<LockIcon className="katha-login-input-icon" />} error={errors.password && t(errors.password)}>
        <input
          {...input('signup-password', 'password')}
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder={t({ vi: `Ít nhất ${PASSWORD_MIN} ký tự`, en: `At least ${PASSWORD_MIN} characters` })}
        />
        <button
          type="button"
          onClick={() => setShowPassword((previous) => !previous)}
          className="katha-login-password-toggle"
          aria-controls="signup-password signup-confirm"
          aria-label={showPassword ? t({ vi: 'Ẩn mật khẩu', en: 'Hide password' }) : t({ vi: 'Hiện mật khẩu', en: 'Show password' })}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </Field>

      <Field id="signup-confirm" label={t({ vi: 'Nhập lại mật khẩu', en: 'Repeat password' })} icon={<LockIcon className="katha-login-input-icon" />} error={errors.confirm && t(errors.confirm)}>
        <input {...input('signup-confirm', 'confirm')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" />
      </Field>

      {error && (
        <div role="alert" className="katha-login-error">
          <span aria-hidden="true">!</span>
          <p>{t(error)}</p>
        </div>
      )}

      <button type="submit" disabled={disabled} className="katha-login-submit">
        <span>{submitting ? t({ vi: 'Đang tạo tài khoản…', en: 'Creating account…' }) : t({ vi: 'Tạo tài khoản miễn phí', en: 'Create free account' })}</span>
        {submitting ? <span className="katha-login-spinner" aria-hidden="true" /> : <ArrowRightIcon className="katha-login-submit-arrow" />}
      </button>

      <p className="katha-signup-fineprint">
        {t({ vi: 'Tài khoản mới là tài khoản học sinh, gói Free. Giáo viên cần tài khoản giáo viên xin cấp từ quản trị viên.', en: 'New accounts are student accounts on the Free plan. Teachers get a teacher account from an administrator.' })}
      </p>

      {onSwitchToSignIn && (
        <div className="katha-auth-toggle-prompt">
          <span>{t({ vi: 'Đã có tài khoản?', en: 'Already have an account?' })}</span>
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="katha-auth-toggle-btn"
          >
            {t({ vi: 'Đăng nhập ngay', en: 'Sign in now' })}
          </button>
        </div>
      )}
    </form>
  );
}
