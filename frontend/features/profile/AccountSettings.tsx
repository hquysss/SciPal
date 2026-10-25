'use client';

import { useEffect, useState } from 'react';
import { setSfxEnabled, sfxEnabled } from '@/lib/sfx';
import { DAILY_GOALS, saveDailyGoal, useHabit } from '@/features/habit/habitApi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, CreditCard, Gauge, GraduationCap, Languages, LifeBuoy, LogOut, Palette, Target, UserRound, Volume2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase';
import { AccountHelpModal } from '@/features/auth/AccountHelpModal';
import { EducationLevelSetting } from './EducationLevelSetting';
import { LeaderboardNameSwitch } from './LeaderboardNameSwitch';
import { tint } from './ProfileHero';
import { GradeSetting } from './GradeSetting';
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
  const [sounds, setSounds] = useState(false);
  useEffect(() => setSounds(sfxEnabled()), []);
  const toggleSounds = () => {
    setSfxEnabled(!sounds);
    setSounds(!sounds);
  };
  const { habit, reload: reloadHabit } = useHabit();
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState(false);
  const chooseGoal = async (goal: (typeof DAILY_GOALS)[number]) => {
    setGoalSaving(true);
    setGoalError(false);
    const saved = await saveDailyGoal(goal);
    setGoalSaving(false);
    if (saved) await reloadHabit();
    else setGoalError(true);
  };

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

  const rowLabel = 'flex items-center gap-1.5 text-sm font-semibold text-pretty text-ink';
  const rowHint = 'text-sm text-pretty text-ink-muted';
  const langButton = (active: boolean) =>
    `min-h-11 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
      active ? 'bg-action text-action-ink' : 'text-ink-muted hover:text-ink'
    }`;

  const group = 'flex flex-col gap-4 border-t border-edge pt-6';
  const groupTitle = 'flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink';
  const row = 'flex flex-col justify-between gap-3 sm:flex-row sm:items-center';

  return (
    <>
      <section aria-labelledby="settings-title" className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <div>
          <h2 id="settings-title" className="text-lg font-bold text-ink">{t({ en: 'Settings', vi: 'Cài đặt' })}</h2>
          <p className={rowHint}>
            {t({ en: 'Account details and learning preferences', vi: 'Thông tin tài khoản và tùy chọn học tập' })}
          </p>
        </div>

        <div className={group}>
          <h3 className={groupTitle}>
            <span aria-hidden="true" className={`grid size-7 place-items-center rounded-md text-ink ${tint(0)}`}><Palette className="h-4 w-4" /></span>
            {t({ en: 'Appearance', vi: 'Giao diện' })}
          </h3>
          <div className={row}>
            <div>
              <div className={rowLabel}>{t({ en: 'Theme', vi: 'Chế độ sáng / tối' })}</div>
              <div className={rowHint}>{t({ en: 'Follow the device, or pick light or dark', vi: 'Theo thiết bị, hoặc chọn sáng hay tối' })}</div>
            </div>
            <ThemeToggle />
          </div>
          <div className={row}>
            <div>
              <div className={rowLabel}>
                <Languages aria-hidden="true" className="h-4 w-4" />
                <span>{t({ en: 'Language', vi: 'Ngôn ngữ' })}</span>
              </div>
              <div className={rowHint}>{t({ en: 'Language of the interface', vi: 'Ngôn ngữ hiển thị' })}</div>
            </div>
            <div className="flex items-center gap-1 self-start rounded-lg border border-edge bg-surface p-1 sm:self-auto">
              <button type="button" aria-pressed={lang === 'vi'} onClick={() => setLang('vi')} className={langButton(lang === 'vi')}>
                Tiếng Việt (VI)
              </button>
              <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={langButton(lang === 'en')}>
                English (EN)
              </button>
            </div>
          </div>
        </div>

        <div className={group}>
          <h3 className={groupTitle}>
            <span aria-hidden="true" className={`grid size-7 place-items-center rounded-md text-ink ${tint(1)}`}><GraduationCap className="h-4 w-4" /></span>
            {t({ en: 'Learning', vi: 'Học tập' })}
          </h3>
          <EducationLevelSetting preference={educationPreference} isAuthenticated={isAuthenticated} />
          {isAuthenticated && <GradeSetting />}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
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
          {isAuthenticated && habit && (
            <div className={`${row} border-t border-line pt-4`}>
              <div>
                <div className={rowLabel}>
                  <Target aria-hidden="true" className="h-4 w-4" />
                  <span id="daily-goal-label">{t({ en: 'Daily goal', vi: 'Mục tiêu mỗi ngày' })}</span>
                </div>
                <div className={rowHint}>
                  {goalError
                    ? <span className="text-danger">{t({ en: 'Could not save the goal. Try again.', vi: 'Chưa lưu được mục tiêu. Thử lại nhé.' })}</span>
                    : t({ en: 'XP to earn each day', vi: 'Số XP cần đạt mỗi ngày' })}
                </div>
              </div>
              <div role="group" aria-labelledby="daily-goal-label" className="flex items-center gap-1 self-start rounded-lg border border-edge bg-surface p-1 sm:self-auto">
                {DAILY_GOALS.map((goal) => (
                  <button key={goal} type="button" disabled={goalSaving} aria-pressed={habit.goal_xp === goal} onClick={() => chooseGoal(goal)} className={langButton(habit.goal_xp === goal)}>
                    {`${goal} XP`}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isAuthenticated && <LeaderboardNameSwitch rowLabel={rowLabel} rowHint={rowHint} />}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              <div className={rowLabel}>
                <Volume2 aria-hidden="true" className="h-4 w-4" />
                <span id="practice-sounds-label">{t({ en: 'Practice sounds', vi: 'Âm thanh khi luyện tập' })}</span>
              </div>
              <div className={rowHint}>
                {t({ en: 'Short sounds for right, wrong and level up', vi: 'Tiếng ngắn khi đúng, sai và lên cấp' })}
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSounds}
              role="switch"
              aria-checked={sounds}
              aria-labelledby="practice-sounds-label"
              className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors motion-reduce:transition-none ${sounds ? 'bg-action' : 'bg-edge'}`}>
                <span className={`inline-block h-5 w-5 rounded-full bg-surface transition-transform motion-reduce:transition-none ${sounds ? 'translate-x-5' : 'translate-x-0'}`} />
              </span>
            </button>
          </div>
        </div>

        <div className={group}>
          <h3 className={groupTitle}>
            <span aria-hidden="true" className={`grid size-7 place-items-center rounded-md text-ink ${tint(2)}`}><UserRound className="h-4 w-4" /></span>
            {t({ en: 'Account', vi: 'Tài khoản' })}
          </h3>
          <div>
            <div className={rowLabel}>
              {t({ en: 'SciPal role', vi: 'Vai trò trong SciPal' })}:{' '}
              {currentRole === 'teacher'
                ? t({ en: 'Teacher', vi: 'Giáo viên' })
                : currentRole === 'admin'
                  ? 'Admin'
                  : t({ en: 'Student', vi: 'Học sinh' })}
            </div>
            <p className={rowHint}>
              {t({ en: 'This role reflects SciPal access and does not verify a school or class.', vi: 'Vai trò này phản ánh quyền trong SciPal, không xác minh trường hoặc lớp học.' })}
            </p>
          </div>

          {isAuthenticated && (
            <div className={row}>
              <div><div className={rowLabel}><CreditCard aria-hidden="true" className="h-4 w-4" /><span>{t({en:'Payment methods',vi:'Phương thức thanh toán'})}</span></div><p className={rowHint}>{t({en:'Choose a payment provider and manage auto-renewal',vi:'Chọn cổng thanh toán và quản lý tự gia hạn'})}</p></div>
              <Link href="/profile/payment-methods" className={buttonVariants({variant:'outline',className:'self-start sm:self-auto'})}>{t({en:'Manage',vi:'Quản lý'})}</Link>
            </div>
          )}
          {isAuthenticated && (
            <div className={row}>
              <div>
                <div className={rowLabel}>
                  <Gauge aria-hidden="true" className="h-4 w-4" />
                  <span>{t({ en: 'My plan', vi: 'Gói của tôi' })}</span>
                </div>
                <div className={rowHint}>
                  {t({ en: 'Your plan and how many AI Professor and exam turns are left', vi: 'Gói đang dùng và số lượt Giáo sư AI, lượt thi còn lại' })}
                </div>
              </div>
              <Link href="/profile/plan" className={buttonVariants({ variant: 'outline', className: 'self-start sm:self-auto' })}>
                {t({ en: 'View', vi: 'Xem' })}
              </Link>
            </div>
          )}

          <div className={row}>
            <div>
              <div className={rowLabel}>
                <LifeBuoy aria-hidden="true" className="h-4 w-4" />
                <span>{t({ en: 'Help', vi: 'Hỗ trợ' })}</span>
              </div>
              <div className={rowHint}>
                {t({ en: 'Need help with your account or password?', vi: 'Cần hỗ trợ về tài khoản hoặc mật khẩu?' })}
              </div>
            </div>
            <button type="button" onClick={() => setShowHelpModal(true)} className={buttonVariants({ variant: 'outline', className: 'self-start sm:self-auto' })}>
              {t({ en: 'Get help', vi: 'Liên hệ hỗ trợ' })}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className={buttonVariants({ variant: 'destructive', className: 'w-full' })}
        >
          <LogOut aria-hidden="true" />
          {signingOut ? t({ en: 'Signing out…', vi: 'Đang đăng xuất…' }) : t({ en: 'Sign out', vi: 'Đăng xuất' })}
        </button>
      </section>

      <AccountHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </>
  );
}
