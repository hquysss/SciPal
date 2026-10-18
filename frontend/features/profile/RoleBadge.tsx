'use client';

import { useLanguage } from '@scipal/hooks';
import roleColors from '@/components/ui/roleColors.module.css';

type Role = 'admin' | 'teacher' | 'student';

/** "Admin" in red, "Giáo viên" in purple, "Học sinh" in the theme colour. Anything unknown counts as a student. */
export function RoleBadge({ role }: { role: string | null | undefined }) {
  const { t } = useLanguage();
  const r: Role = role === 'admin' || role === 'teacher' ? role : 'student';
  const label = r === 'admin' ? 'Admin' : r === 'teacher' ? t({ en: 'Teacher', vi: 'Giáo viên' }) : t({ en: 'Student', vi: 'Học sinh' });
  return <span className={`${roleColors.pill} ${roleColors[r]}`}>{label}</span>;
}
