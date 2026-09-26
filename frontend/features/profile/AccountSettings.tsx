'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Languages } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase';
import { AccountHelpModal } from '@/features/auth/AccountHelpModal';
import { EducationLevelSetting } from './EducationLevelSetting';
import type { resolveEducationLevel } from '@/features/landing/educationLevel';
import { ThemeToggle } from '@/components/nav/ThemeToggle';
import { forgetAccountLevel, getShell, safeSessionStorage } from '@/lib/theme/shellTheme';

interface AccountSettingsProps {
  currentRole?: string;
  educationPreference: ReturnType<typeof resolveEducationLevel>;
  isAuthenticated: boolean;
  onRoleChange?: (role: 'student' | 'teacher') => void;
}

export function AccountSettings({ currentRole = 'student', educationPreference, isAuthenticated }: AccountSettingsProps) {
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [bilingualTooltips, setBilingualTooltips] = useState(true);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      if (typeof document !== 'undefined') {
        document.cookie = 'scipal_session=; path=/; max-age=0; SameSite=Lax';
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('scipal_demo_user');
        localStorage.removeItem('scipal_demo_role');
      }
      forgetAccountLevel(safeSessionStorage(), getShell());
      router.push('/login');
      router.refresh();
    }
  };

  const rowLabel = 'flex items-center gap-1.5 text-sm font-semibold text-ink';
  const rowHint = 'text-sm text-ink-muted';
  const langButton = (active: boolean) =>
    `min-h-11 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
      active ? 'bg-action text-action-ink' : 'text-ink-muted hover:text-ink'
    }`;

  return (
    <>
      <section className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
        {/* Header */}
        <div className="border-b border-line pb-4">
          <h2 className="text-lg font-bold text-ink">{t({ en: 'Account', vi: 'Tài khoản' })}</h2>
          <p className={rowHint}>
            {t({ en: 'Account details and learning preferences', vi: 'Thông tin tài khoản và tùy chọn học tập' })}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <ThemeToggle tone="surface" />
          <div className="rounded-lg border border-line bg-surface-sunken p-4">
            <div className="text-sm font-semibold text-ink-muted">{t({ en: 'SciPal role', vi: 'Vai trò trong SciPal' })}</div>
            <p className="mt-1 text-sm font-semibold text-ink">
              {currentRole === 'teacher'
                ? t({ en: 'Teacher', vi: 'Giáo viên' })
                : currentRole === 'admin'
                  ? t({ en: 'Admin', vi: 'Quản trị viên' })
                  : t({ en: 'Student', vi: 'Học sinh' })}
            </p>
            <p className={`mt-1 ${rowHint}`}>
              {t({ en: 'This role reflects SciPal access and does not verify a school or class.', vi: 'Vai trò này phản ánh quyền trong SciPal, không xác minh trường hoặc lớp học.' })}
            </p>
          </div>

          <EducationLevelSetting preference={educationPreference} isAuthenticated={isAuthenticated} />

          {/* Display Language setting */}
          <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
            <div>
              <div className={rowLabel}>
                <Languages aria-hidden="true" className="h-4 w-4" />
                <span>{t({ en: 'Language', vi: 'Ngôn ngữ' })}</span>
              </div>
              <div className={rowHint}>{t({ en: 'Language switching', vi: 'Chuyển đổi ngôn ngữ' })}</div>
            </div>
            <div className="flex items-center gap-1 self-start rounded-lg border border-edge bg-surface-sunken p-1 sm:self-auto">
              <button type="button" aria-pressed={lang === 'vi'} onClick={() => setLang('vi')} className={langButton(lang === 'vi')}>
                Tiếng Việt (VI)
              </button>
              <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={langButton(lang === 'en')}>
                English (EN)
              </button>
            </div>
          </div>

          {/* Bilingual Term Tooltips Preference */}
          <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <div className={rowLabel}>
                <BookOpen aria-hidden="true" className="h-4 w-4" />
                <span id="bilingual-terms-label">
                  {t({ en: 'Bilingual scientific terms', vi: 'Hiển thị chú giải thuật ngữ' })}
                </span>
              </div>
              <div className={rowHint}>
                {t({
                  en: 'Highlight and expand international terms in lesson theory',
                  vi: 'Làm nổi bật và hiển thị thẻ từ vựng song ngữ trong bài giảng',
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBilingualTooltips(!bilingualTooltips)}
              role="switch"
              aria-checked={bilingualTooltips}
              aria-labelledby="bilingual-terms-label"
              className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span
                className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors motion-reduce:transition-none ${
                  bilingualTooltips ? 'bg-action' : 'bg-edge'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-surface transition-transform motion-reduce:transition-none ${
                    bilingualTooltips ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Support and Assistance */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-muted">
            <span>
              {t({ en: 'Need help with your account or password?', vi: 'Cần hỗ trợ về tài khoản hoặc mật khẩu?' })}
            </span>
            <button type="button" onClick={() => setShowHelpModal(true)} className={buttonVariants({ variant: 'link' })}>
              {t({ en: 'Support', vi: 'Hỗ trợ' })}
            </button>
          </div>
        </div>

        {/* Sign out section */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className={buttonVariants({ variant: 'destructive', className: 'w-full' })}
        >
          {signingOut ? t({ en: 'Signing out…', vi: 'Đang đăng xuất…' }) : t({ en: 'Sign out', vi: 'Đăng xuất' })}
        </button>
      </section>

      <AccountHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </>
  );
}
