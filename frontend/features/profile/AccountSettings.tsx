'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
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

  return (
    <>
      <div className="rounded-3xl border border-gray-200/80 bg-white/90 p-6 sm:p-8 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {t({
                en: 'Account',
                vi: 'Tài khoản',
              })}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t({
                en: 'Account details and learning preferences',
                vi: 'Thông tin tài khoản và tùy chọn học tập',
              })}
            </p>
          </div>
          <span className="font-mono text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2.5 py-1 rounded-full font-bold">
            PROFILE
          </span>
        </div>

        <div className="space-y-5">
          <ThemeToggle tone="surface" />
          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              {t({ en: 'SciPal role', vi: 'Vai trò trong SciPal' })}
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {currentRole === 'teacher'
                ? t({ en: 'Teacher', vi: 'Giáo viên' })
                : currentRole === 'admin'
                  ? t({ en: 'Admin', vi: 'Quản trị viên' })
                  : t({ en: 'Student', vi: 'Học sinh' })}
            </p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              {t({ en: 'This role reflects SciPal access and does not verify a school or class.', vi: 'Vai trò này phản ánh quyền trong SciPal, không xác minh trường hoặc lớp học.' })}
            </p>
          </div>

          <EducationLevelSetting preference={educationPreference} isAuthenticated={isAuthenticated} />

          {/* Display Language setting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>🌐</span>
                <span>{t({ en: 'Language', vi: 'Ngôn ngữ' })}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t({
                  en: 'Language switching',
                  vi: 'Chuyển đổi ngôn ngữ',
                })}
              </div>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
              <button
                onClick={() => setLang('vi')}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                  lang === 'vi'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300'
                }`}
              >
                Tiếng Việt (VI)
              </button>
              <button
                onClick={() => setLang('en')}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                  lang === 'en'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300'
                }`}
              >
                English (EN)
              </button>
            </div>
          </div>

          {/* Bilingual Term Tooltips Preference */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>📖</span>
                <span>
                  {t({ en: 'Bilingual Scientific Terms', vi: 'Hiển thị chú giải thuật ngữ' })}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t({
                  en: 'Highlight and expand international terms in lesson theory',
                  vi: 'Làm nổi bật và hiển thị thẻ từ vựng song ngữ trong bài giảng',
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBilingualTooltips(!bilingualTooltips)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                bilingualTooltips ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
              }`}
              role="switch"
              aria-checked={bilingualTooltips}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  bilingualTooltips ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Support and Assistance (Katha Style) */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {t({
                en: 'Need help with your account or password?',
                vi: 'Cần hỗ trợ về tài khoản hoặc mật khẩu?',
              })}
            </span>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="font-bold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 dark:text-emerald-400 transition"
            >
              {t({ en: 'Support', vi: 'Hỗ trợ' })}
            </button>
          </div>
        </div>

        {/* Sign out section */}
        <div className="pt-2">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full rounded-2xl border border-red-200 bg-red-50/50 py-3.5 text-center text-sm font-bold text-red-600 transition hover:bg-red-100/80 active:scale-[0.99] disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 cursor-pointer"
          >
            {signingOut
              ? t({ en: 'Signing out...', vi: 'Đang đăng xuất...' })
              : t({ en: 'Sign Out', vi: 'Đăng Xuất' })}
          </button>
        </div>
      </div>

      <AccountHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </>
  );
}
