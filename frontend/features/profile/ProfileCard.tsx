'use client';

import Link from 'next/link';
import { ClipboardCheck, Flame, NotebookPen, School } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Badge } from '../../components/ui/badge';
import { buttonVariants } from '../../components/ui/button';

interface ProfileCardProps {
  displayName: string;
  role: 'student' | 'teacher' | 'admin';
  avatarUrl?: string | null;
  stats: { totalXP: number; completedLessons: number; longestStreak: number };
}

export function ProfileCard({ displayName, role, avatarUrl, stats }: ProfileCardProps) {
  const { t } = useLanguage();

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'SP';

  const roleBadge =
    role === 'admin'
      ? { variant: 'default' as const, label: t({ en: 'Admin', vi: 'Quản trị viên' }) }
      : role === 'teacher'
        ? { variant: 'outline' as const, label: t({ en: 'Teacher', vi: 'Giáo viên' }) }
        : { variant: 'secondary' as const, label: t({ en: 'Student', vi: 'Học sinh' }) };

  const stat = 'rounded-lg bg-surface-sunken p-3';
  const statValue = 'text-2xl font-bold tabular-nums text-ink';
  const statLabel = 'mt-1 text-sm text-ink-muted';

  return (
    <section className="rounded-xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-sunken text-2xl font-bold text-ink">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold text-ink">{displayName}</h2>
          <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
        </div>
      </div>

      {/* Stats summary row */}
      <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-6 text-center">
        <div className={stat}>
          <dt className="sr-only">{t({ en: 'Total XP', vi: 'Tổng điểm XP' })}</dt>
          <dd className={statValue}>{stats.totalXP.toLocaleString()}</dd>
          <dd aria-hidden="true" className={statLabel}>{t({ en: 'Total XP', vi: 'Tổng điểm XP' })}</dd>
        </div>
        <div className={stat}>
          <dt className="sr-only">{t({ en: 'Lessons done', vi: 'Bài đã học' })}</dt>
          <dd className={statValue}>{stats.completedLessons}</dd>
          <dd aria-hidden="true" className={statLabel}>{t({ en: 'Lessons done', vi: 'Bài đã học' })}</dd>
        </div>
        <div className={stat}>
          <dt className="sr-only">{t({ en: 'Best streak', vi: 'Chuỗi ngày kỉ lục' })}</dt>
          <dd className={`${statValue} inline-flex items-center justify-center gap-1`}>
            <Flame aria-hidden="true" className="h-5 w-5 text-warning" />
            {stats.longestStreak}
          </dd>
          <dd aria-hidden="true" className={statLabel}>{t({ en: 'Best streak', vi: 'Chuỗi ngày kỉ lục' })}</dd>
        </div>
      </dl>

      {/* Teacher workspace action panel */}
      {role === 'teacher' && (
        <div className="mt-6 rounded-lg border border-line bg-surface-sunken p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">
            {t({ en: 'Teaching studio', vi: 'Không gian sư phạm giáo viên' })}
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Link href="/teacher/classes" className={buttonVariants()}>
              <School aria-hidden="true" />
              {t({ en: 'Classroom management', vi: 'Quản lý lớp học' })}
            </Link>
            <Link href="/teacher/lessons" className={buttonVariants({ variant: 'outline' })}>
              <NotebookPen aria-hidden="true" />
              {t({ en: 'Lesson authoring studio', vi: 'Soạn thảo bài học' })}
            </Link>
          </div>
        </div>
      )}

      {role === 'admin' && (
        <div className="mt-6 rounded-lg border border-line bg-surface-sunken p-4">
          <h3 className="mb-3 text-sm font-semibold text-ink">{t({ en: 'Content review', vi: 'Kiểm duyệt nội dung' })}</h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Link href="/admin/lessons/review" className={buttonVariants()}>
              <ClipboardCheck aria-hidden="true" />
              {t({ en: 'Review submitted lessons', vi: 'Duyệt bài giáo viên gửi' })}
            </Link>
            <Link href="/teacher/lessons" className={buttonVariants({ variant: 'outline' })}>
              <NotebookPen aria-hidden="true" />
              {t({ en: 'Open lesson studio', vi: 'Mở Studio bài học' })}
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
