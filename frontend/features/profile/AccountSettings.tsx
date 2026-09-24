'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';
import { AccountHelpModal } from '@/features/auth/AccountHelpModal';

interface AccountSettingsProps {
  currentRole?: string;
  onRoleChange?: (role: 'student' | 'teacher') => void;
}

export function AccountSettings({ currentRole = 'student' }: AccountSettingsProps) {
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
                en: 'Institutional credentials and bilingual delivery options',
                vi: 'Thông tin tài khoản trường cấp và tùy chọn hiển thị song ngữ',
              })}
            </p>
          </div>
          <span className="font-mono text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2.5 py-1 rounded-full font-bold">
            PROFILE
          </span>
        </div>

        <div className="space-y-5">
          {/* Read-Only Institutional Record Box (Katha Style) */}
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <span>🏛️</span>
                <span>
                  {t({ en: 'Institutional Record', vi: 'Hồ sơ Định danh Trường học' })}
                </span>
              </span>
              <span className="rounded-full bg-emerald-200/60 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                🔒
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-mono text-[11px]">
                  {t({ en: 'ROLE', vi: 'VAI TRÒ' })}
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {currentRole === 'teacher'
                    ? t({ en: 'Teacher', vi: 'Giáo viên' })
                    : t({ en: 'Student', vi: 'Học sinh' })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block font-mono text-[11px]">
                  {t({ en: 'SECURITY STATUS', vi: 'TRẠNG THÁI BẢO MẬT' })}
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  ● {t({ en: 'Verified', vi: 'Xác thực' })}
                </span>
              </div>
            </div>
          </div>

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
                en: 'Need to update class or reset password?',
                vi: 'Cần cập nhật lớp hoặc cấp lại mật khẩu?',
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

      {/* Institutional Help Modal */}
      <AccountHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </>
  );
}
