'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

type Tab<Id extends string> = { id: Id; href: string; label: { en: string; vi: string } };

function Tabs<Id extends string>({ tabs, active, label }: { tabs: Array<Tab<Id>>; active: Id; label: { en: string; vi: string } }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t(label)} className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? 'page' : undefined}
          className={`-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${
            tab.id === active ? 'border-action text-ink' : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          {t(tab.label)}
        </Link>
      ))}
    </nav>
  );
}

export type TeacherArea = 'lessons' | 'simulations';

const AREAS: Array<Tab<TeacherArea>> = [
  { id: 'lessons', href: '/teacher/lessons', label: { en: 'Lessons', vi: 'Bài giảng' } },
  { id: 'simulations', href: '/teacher/simulation-requests', label: { en: 'Simulation requests', vi: 'Đề xuất mô phỏng' } },
];

/** The lesson side of the teacher area: Bài giảng · Đề xuất mô phỏng. Exams live under Thi thử. */
export function TeacherAreaTabs({ active }: { active: TeacherArea }) {
  return <Tabs tabs={AREAS} active={active} label={{ en: 'Teacher area', vi: 'Khu giáo viên' }} />;
}

export type ExamManageArea = 'exams' | 'questions';

const EXAM_AREAS: Array<Tab<ExamManageArea>> = [
  { id: 'exams', href: '/exam/manage', label: { en: 'Exams', vi: 'Đề thi' } },
  { id: 'questions', href: '/exam/manage/questions', label: { en: 'Question bank', vi: 'Ngân hàng câu hỏi' } },
];

/** Exam management under Thi thử: the exams and their question bank. */
export function ExamManageTabs({ active }: { active: ExamManageArea }) {
  return <Tabs tabs={EXAM_AREAS} active={active} label={{ en: 'Exam management', vi: 'Quản lý đề thi' }} />;
}
