import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { StreakCalendar } from '@/features/progress/StreakCalendar';
import { BadgeWall } from '@/features/progress/BadgeWall';
import { getUserProgress } from '@/features/progress/progressQueries';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const supabase = createServerClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fprogress');

  const { completedLessons, streaks, totalXP, badges, loadFailed } = await getUserProgress(user.id);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="font-semibold text-emerald-700">Tiến trình học tập</span>
        </nav>

        {loadFailed && (
          <LoadErrorNotice
            message={{
              en: 'We could not load your progress. Please reload the page.',
              vi: 'Chưa tải được tiến trình học tập. Vui lòng tải lại trang.',
            }}
          />
        )}

        {/* Gamified Header Card */}
        <header className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-lg relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute -right-8 -bottom-8 text-9xl opacity-10 select-none">
            🌟
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-mono font-bold tracking-wider uppercase text-emerald-100 backdrop-blur-xs">
                Cấp độ 1 · Nhà thám hiểm khoa học
              </span>
              <span className="text-sm font-mono text-emerald-200">
                Mục tiêu tuần: 80%
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-6">
              <span className="text-5xl sm:text-6xl font-black tracking-tight text-white">
                {totalXP.toLocaleString()}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-emerald-300">
                XP Tích lũy
              </span>
            </div>

            {/* Level Progress bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-black/25 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-200 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, totalXP % 500 / 5))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-emerald-200/80">
                <span>{totalXP} XP</span>
                <span>500 XP (Cấp độ tiếp theo)</span>
              </div>
            </div>
          </div>
        </header>

        {/* Streak Calendar */}
        <StreakCalendar streaks={streaks as never} />

        {/* Badge Wall */}
        <BadgeWall badges={badges as never} />

        {/* Completed Lessons Activity Card */}
        <section className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">
              Lịch sử bài học đã hoàn thành ({completedLessons.length})
            </h3>
            <span className="text-xs font-mono text-gray-400">Gần nhất</span>
          </div>

          <ul className="divide-y divide-gray-100">
            {completedLessons.slice(0, 10).map((p: any) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-3.5 first:pt-1 text-sm group"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">
                    ✓
                  </span>
                  <div>
                    <span className="font-semibold text-gray-900 block">
                      {p.lessons?.title_vi ?? 'Bài học'}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {p.lessons?.subjects?.name_vi ?? 'Tin học'}
                    </span>
                  </div>
                </div>

                {p.score != null && (
                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full text-xs font-mono">
                    +{p.score} XP
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
