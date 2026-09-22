'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

interface ProfileCardProps {
  displayName: string;
  role: 'student' | 'teacher';
  avatarUrl?: string | null;
  stats: { totalXP: number; completedLessons: number; longestStreak: number };
}

export function ProfileCard({ displayName, role, avatarUrl, stats }: ProfileCardProps) {
  const { lang, t } = useLanguage();

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'SP';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-950/10 bg-white/90 p-6 sm:p-8 shadow-xs backdrop-blur-md transition hover:shadow-md dark:border-white/10 dark:bg-card/90">
      {/* Subtle field notebook background badge */}
      <div className="pointer-events-none absolute -right-6 -top-6 select-none font-mono text-8xl font-black text-emerald-900/5 dark:text-emerald-100/5">
        SP
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative flex h-18 w-18 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-600/30 bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl font-black text-emerald-800 shadow-inner dark:from-emerald-950 dark:to-teal-900 dark:text-emerald-200">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
            <span
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[10px] text-white shadow-xs"
              title="Online"
            >
              ✓
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                {displayName}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  role === 'teacher'
                    ? 'border border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                    : 'border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                }`}
              >
                {role === 'teacher'
                  ? t({ en: 'Teacher', vi: 'Giáo viên' })
                  : t({ en: 'Student', vi: 'Học sinh' })}
              </span>
            </div>
            <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {t({ en: 'SciPal Academy Explorer', vi: 'Thành viên khám phá SciPal' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats summary row */}
      <div className="relative z-10 mt-6 grid grid-cols-3 gap-3 border-t border-dashed border-gray-200 pt-6 text-center dark:border-gray-800">
        <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-card/50">
          <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.totalXP.toLocaleString()}
          </div>
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            {t({ en: 'Total XP', vi: 'Tổng điểm XP' })}
          </div>
        </div>

        <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-card/50">
          <div className="font-mono text-2xl font-black text-gray-900 dark:text-white">
            {stats.completedLessons}
          </div>
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            {t({ en: 'Lessons Done', vi: 'Bài đã học' })}
          </div>
        </div>

        <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-card/50">
          <div className="font-mono text-2xl font-black text-amber-500">
            🔥 {stats.longestStreak}
          </div>
          <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            {t({ en: 'Best Streak', vi: 'Chuỗi ngày kỉ lục' })}
          </div>
        </div>
      </div>

      {/* Teacher workspace action panel */}
      {role === 'teacher' && (
        <div className="relative z-10 mt-6 rounded-2xl border border-purple-200 bg-purple-50/80 p-4 shadow-inner dark:border-purple-900/50 dark:bg-purple-950/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
              🛠️ {t({ en: 'Teacher Teaching Studio', vi: 'Không gian sư phạm giáo viên' })}
            </span>
            <span className="rounded-full bg-purple-200/80 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-900 dark:bg-purple-900 dark:text-purple-200">
              S10 & S11
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Link
              href="/teacher/classes"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-purple-800 active:scale-[0.98] transition"
            >
              <span>🏫 {t({ en: 'Classroom Management', vi: 'Quản lý lớp học' })}</span>
              <span className="font-mono text-[10px]">→</span>
            </Link>
            <Link
              href="/teacher/lessons"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-300 bg-white py-2.5 px-4 text-xs font-bold text-purple-800 hover:bg-purple-100/80 active:scale-[0.98] transition dark:border-purple-800 dark:bg-card dark:text-purple-300"
            >
              <span>📝 {t({ en: 'Lesson Authoring Studio', vi: 'Soạn thảo bài học' })}</span>
              <span className="font-mono text-[10px]">→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
