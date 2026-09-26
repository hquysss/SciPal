'use client';

import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { LoadErrorNotice } from '../../components/feedback/LoadErrorNotice';
import { Progress, ProgressLabel, ProgressValue } from '../../components/ui/progress';
import { EmptyState } from '../../components/ui/empty-state';
import { StreakCalendar } from './StreakCalendar';
import { BadgeWall } from './BadgeWall';
import type { ProgressSummary } from './progressQueries';

const LEVEL_XP = 500;

export function ProgressView({ completedLessons, streaks, totalXP, badges, loadFailed }: ProgressSummary) {
  const { lang, t } = useLanguage();
  const levelPercent = Math.min(100, Math.max(15, (totalXP % LEVEL_XP) / 5));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link
              href="/"
              className="rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {t({ en: 'Home', vi: 'Trang chủ' })}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li aria-current="page" className="font-semibold text-ink">
            {t({ en: 'Learning progress', vi: 'Tiến trình học tập' })}
          </li>
        </ol>
      </nav>

      {loadFailed && (
        <LoadErrorNotice
          message={{
            en: 'We could not load your progress. Please reload the page.',
            vi: 'Chưa tải được tiến trình học tập. Vui lòng tải lại trang.',
          }}
        />
      )}

      <header className="rounded-xl border border-line bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ink">{t({ en: 'Learning progress', vi: 'Tiến trình học tập' })}</h1>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-5xl font-bold tabular-nums text-ink">{totalXP.toLocaleString()}</span>
          <span className="text-lg font-semibold text-ink-muted">{t({ en: 'XP earned', vi: 'XP tích lũy' })}</span>
        </div>
        <Progress value={levelPercent} className="mt-6">
          <ProgressLabel>{t({ en: 'Next level', vi: 'Cấp độ tiếp theo' })}</ProgressLabel>
          <ProgressValue>{() => `${totalXP % LEVEL_XP} / ${LEVEL_XP} XP`}</ProgressValue>
        </Progress>
      </header>

      <StreakCalendar streaks={streaks} />

      <BadgeWall badges={badges} />

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-4 text-lg font-bold text-ink">
          {t({
            en: `Completed lessons (${completedLessons.length})`,
            vi: `Lịch sử bài học đã hoàn thành (${completedLessons.length})`,
          })}
        </h2>

        {completedLessons.length === 0 ? (
          <EmptyState
            title={t({ en: 'No completed lessons yet', vi: 'Chưa có bài học hoàn thành' })}
            description={t({
              en: 'Lessons you mark as complete will show up here.',
              vi: 'Bài học bạn đánh dấu hoàn thành sẽ hiện ở đây.',
            })}
          />
        ) : (
          <ul className="divide-y divide-line">
            {completedLessons.slice(0, 10).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3.5 text-sm first:pt-1">
                <div className="flex items-center gap-3">
                  <CircleCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-success" />
                  <div>
                    <span className="block font-semibold text-ink">
                      {(lang === 'en' ? p.lessons?.title_en : p.lessons?.title_vi) ??
                        p.lessons?.title_vi ??
                        t({ en: 'Lesson', vi: 'Bài học' })}
                    </span>
                    <span className="text-sm text-ink-muted">
                      {(lang === 'en' ? p.lessons?.subjects?.name_en : p.lessons?.subjects?.name_vi) ??
                        p.lessons?.subjects?.name_vi ??
                        ''}
                    </span>
                  </div>
                </div>

                {p.score != null && (
                  <span className="shrink-0 rounded-md bg-surface-sunken px-3 py-1 text-sm font-bold tabular-nums text-ink">
                    +{p.score} XP
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
