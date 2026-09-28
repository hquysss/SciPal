'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

const TABS = [
  { id: 'lessons', href: '/admin/lessons/review', label: { en: 'Lessons', vi: 'Bài giảng' } },
  { id: 'exams', href: '/admin/lessons/review?tab=exams', label: { en: 'Exams', vi: 'Đề thi' } },
] as const;

/** The admin review queue's two parts: lessons and exams. */
export function ReviewTabs({ active }: { active: 'lessons' | 'exams' }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t({ en: 'Review queue', vi: 'Hàng chờ duyệt' })} className="flex gap-1 border-b border-line">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? 'page' : undefined}
          className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${
            tab.id === active ? 'border-action text-ink' : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          {t(tab.label)}
        </Link>
      ))}
    </nav>
  );
}
