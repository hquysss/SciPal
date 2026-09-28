'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

export type TeacherArea = 'lessons' | 'exams' | 'simulations';

const AREAS: Array<{ id: TeacherArea; href: string; label: { en: string; vi: string } }> = [
  { id: 'lessons', href: '/teacher/lessons', label: { en: 'Lessons', vi: 'Bài giảng' } },
  { id: 'exams', href: '/teacher/exams', label: { en: 'Exams', vi: 'Đề thi' } },
  { id: 'simulations', href: '/teacher/simulation-requests', label: { en: 'Simulation requests', vi: 'Đề xuất mô phỏng' } },
];

/** The teacher area's three parts: Bài giảng · Đề thi · Đề xuất mô phỏng. */
export function TeacherAreaTabs({ active }: { active: TeacherArea }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t({ en: 'Teacher area', vi: 'Khu giáo viên' })} className="flex gap-1 overflow-x-auto border-b border-line">
      {AREAS.map((area) => (
        <Link
          key={area.id}
          href={area.href}
          aria-current={area.id === active ? 'page' : undefined}
          className={`-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${
            area.id === active ? 'border-action text-ink' : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          {t(area.label)}
        </Link>
      ))}
    </nav>
  );
}
