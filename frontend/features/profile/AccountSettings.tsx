'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';

interface AccountSettingsProps {
  currentRole?: string;
  onRoleChange?: (role: 'student' | 'teacher') => void;
}

export function AccountSettings({ currentRole = 'student', onRoleChange }: AccountSettingsProps) {
  const { lang, setLang, t } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      router.push('/');
      router.refresh();
    }
  };

  const toggleRole = (newRole: 'student' | 'teacher') => {
    setRole(newRole);
    onRoleChange?.(newRole);
    try {
      localStorage.setItem('scipal_demo_role', newRole);
    } catch {}
    router.refresh();
  };

  return (
    <div className="rounded-3xl border border-gray-200/80 bg-white/90 p-6 sm:p-8 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {t({ en: 'Account & Workspace Settings', vi: 'Cài đặt tài khoản & Không gian học tập' })}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t({
              en: 'Personalize language, learning mode and role experience',
              vi: 'Tùy biến ngôn ngữ, chế độ hiển thị và trải nghiệm vai trò',
            })}
          </p>
        </div>
        <span className="font-mono text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2.5 py-1 rounded-full font-bold">
          S8
        </span>
      </div>

      <div className="space-y-4">
        {/* Language setting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              🌐 {t({ en: 'Display Language', vi: 'Ngôn ngữ hiển thị chính' })}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t({
                en: 'Toggle standard bilingual lesson delivery (EN / VI)',
                vi: 'Chuyển đổi ngôn ngữ hiển thị bài học và thuật ngữ khoa học',
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

        {/* Demo Role Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              🎭 {t({ en: 'User Role Mode (Demo Preview)', vi: 'Chế độ trải nghiệm vai trò' })}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t({
                en: 'Switch between Student and Teacher perspectives to inspect S10 & S11 tools',
                vi: 'Chuyển giữa góc nhìn Học sinh và Giáo viên để trải nghiệm công cụ S10 & S11',
              })}
            </div>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => toggleRole('student')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                role === 'student'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300'
              }`}
            >
              👨‍🎓 {t({ en: 'Student', vi: 'Học sinh' })}
            </button>
            <button
              onClick={() => toggleRole('teacher')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                role === 'teacher'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300'
              }`}
            >
              👩‍🏫 {t({ en: 'Teacher', vi: 'Giáo viên' })}
            </button>
          </div>
        </div>
      </div>

      {/* Sign out section */}
      <div className="pt-2">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full rounded-2xl border border-red-200 bg-red-50/50 py-3 text-center text-sm font-bold text-red-600 transition hover:bg-red-100/80 active:scale-[0.99] disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
        >
          {signingOut
            ? t({ en: 'Signing out...', vi: 'Đang đăng xuất...' })
            : t({ en: 'Sign Out of SciPal', vi: 'Đăng xuất khỏi tài khoản SciPal' })}
        </button>
      </div>
    </div>
  );
}
