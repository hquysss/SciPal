'use client';

import { useLanguage } from '@scipal/hooks';
import roleColors from '@/components/ui/roleColors.module.css';
import { WeeklyTrophy } from '@/features/progress/WeeklyTrophy';

type Role = 'admin' | 'teacher' | 'student';

/** The role, then the trophy when the person is first on this week's leaderboard. */
export function ProfileBadges({ role, weekRank }: { role: string | null | undefined; weekRank?: number | null }) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <RoleBadge role={role} />
      {weekRank === 1 && (
        <span className="inline-flex items-center gap-1 text-sm font-bold text-ink" title={t({ en: 'First on the leaderboard this week', vi: 'Hạng nhất bảng xếp hạng tuần này' })}>
          <WeeklyTrophy size="2.25rem" />
          {t({ en: 'Top of the week', vi: 'Thủ khoa tuần' })}
        </span>
      )}
    </span>
  );
}

/** "Admin" in red, "Giáo viên" in purple, "Học sinh" in the theme colour. Anything unknown counts as a student. */
export function RoleBadge({ role }: { role: string | null | undefined }) {
  const { t } = useLanguage();
  const r: Role = role === 'admin' || role === 'teacher' ? role : 'student';
  const label = r === 'admin' ? 'Admin' : r === 'teacher' ? t({ en: 'Teacher', vi: 'Giáo viên' }) : t({ en: 'Student', vi: 'Học sinh' });
  return <span className={`${roleColors.pill} ${roleColors[r]}`}>{label}</span>;
}
