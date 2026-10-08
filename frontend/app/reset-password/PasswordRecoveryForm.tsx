'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';
import { ArrowRightIcon, LockIcon } from '../login/ScienceMotifs';
import '../login/login.css';

type ResetView = 'checking' | 'ready' | 'invalid' | 'complete';
type PasswordRecoveryFormProps = { readonly recoveryVerified: boolean };

export function PasswordRecoveryForm({ recoveryVerified }: PasswordRecoveryFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [view, setView] = useState<ResetView>(recoveryVerified ? 'checking' : 'invalid');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!recoveryVerified) return;
    let current = true;
    const supabase = createBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (current && event === 'PASSWORD_RECOVERY' && session) setView('ready');
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (current) setView(!sessionError && data.session ? 'ready' : 'invalid');
    }).catch(() => {
      if (current) setView('invalid');
    });
    return () => {
      current = false;
      subscription.unsubscribe();
    };
  }, [recoveryVerified]);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t({ vi: 'Mật khẩu cần ít nhất 8 ký tự.', en: 'Use at least 8 characters.' }));
      return;
    }
    if (password !== confirmPassword) {
      setError(t({ vi: 'Hai mật khẩu chưa khớp.', en: 'The passwords do not match.' }));
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await createBrowserClient().auth.updateUser({ password });
      if (updateError) {
        setError(t({ vi: 'Chưa cập nhật được mật khẩu. Link có thể đã hết hạn, bạn hãy yêu cầu link mới nhé.', en: 'Could not update the password. The link may have expired; request a new one and try again.' }));
      } else {
        setPassword('');
        setConfirmPassword('');
        setView('complete');
      }
    } catch {
      setError(t({ vi: 'Chưa kết nối được. Kiểm tra mạng rồi thử lại nhé.', en: 'Could not connect. Check your connection and try again.' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="katha-login-page">
      <header className="login-topbar">
        <Link href="/" className="login-brand" aria-label={t({ vi: 'SciPal · Trang chủ', en: 'SciPal · Home' })}>
          <Image src="/logo.svg" alt="" width={38} height={38} priority />
          <span>SciPal</span>
        </Link>
        <Link href="/login" className="reset-password-back"><ArrowRightIcon />{t({ vi: 'Về đăng nhập', en: 'Back to sign in' })}</Link>
      </header>

      <section className="reset-password-shell" aria-labelledby="reset-password-title">
        <span className="reset-password-lock"><LockIcon /></span>
        <div className="katha-login-heading">
          <h1 id="reset-password-title">{view === 'complete' ? t({ vi: 'Mật khẩu đã cập nhật.', en: 'Password updated.' }) : t({ vi: 'Đặt lại mật khẩu.', en: 'Reset your password.' })}</h1>
          <p>
            {view === 'complete'
              ? t({ vi: 'Mật khẩu mới đã được lưu an toàn. Bạn có thể tiếp tục học.', en: 'Your new password is saved. You can continue learning.' })
              : t({ vi: 'Chọn một mật khẩu mới cho tài khoản SciPal của bạn.', en: 'Choose a new password for your SciPal account.' })}
          </p>
        </div>

        {view === 'checking' && <p className="katha-login-trial-note" role="status">{t({ vi: 'Đang xác thực link đặt lại mật khẩu…', en: 'Checking your password reset link…' })}</p>}
        {view === 'invalid' && (
          <div className="reset-password-result" role="alert">
            <p>{t({ vi: 'Link không hợp lệ hoặc đã hết hạn. Hãy quay lại đăng nhập để yêu cầu một link mới.', en: 'This link is invalid or expired. Return to sign in and request a new link.' })}</p>
            <Link href="/login" className="katha-login-submit">{t({ vi: 'Về đăng nhập', en: 'Back to sign in' })}<ArrowRightIcon /></Link>
          </div>
        )}
        {view === 'ready' && (
          <form className="katha-login-form" onSubmit={(event) => void savePassword(event)}>
            <label className="katha-login-label" htmlFor="new-password">
              <span>{t({ vi: 'Mật khẩu mới', en: 'New password' })}</span>
              <div className="katha-login-input-wrap"><LockIcon className="katha-login-input-icon" /><input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t({ vi: 'Ít nhất 8 ký tự', en: 'At least 8 characters' })} /></div>
            </label>
            <label className="katha-login-label" htmlFor="confirm-password">
              <span>{t({ vi: 'Nhập lại mật khẩu', en: 'Confirm password' })}</span>
              <div className="katha-login-input-wrap"><LockIcon className="katha-login-input-icon" /><input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" /></div>
            </label>
            {error && <div className="katha-login-error" role="alert"><p>{error}</p></div>}
            <button type="submit" className="katha-login-submit" disabled={saving}>
              <span>{saving ? t({ vi: 'Đang lưu mật khẩu…', en: 'Saving password…' }) : t({ vi: 'Lưu mật khẩu mới', en: 'Save new password' })}</span>
              {saving ? <span className="katha-login-spinner" aria-hidden="true" /> : <ArrowRightIcon className="katha-login-submit-arrow" />}
            </button>
          </form>
        )}
        {view === 'complete' && <Link href="/" className="katha-login-submit reset-password-continue">{t({ vi: 'Tiếp tục học', en: 'Continue learning' })}<ArrowRightIcon /></Link>}
      </section>
      <footer className="login-footer"><span>EN <span className="login-language-bridge" aria-hidden="true" /> VI</span><span>{t({ vi: 'Không gian học tập riêng tư của bạn', en: 'Your private learning space' })}</span></footer>
    </main>
  );
}
