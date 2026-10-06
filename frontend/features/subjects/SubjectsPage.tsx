'use client';

import { SubjectIcon } from '@/components/subject/SubjectIcon';
import { useEffect, useState } from 'react';
import { StaffLinks } from '@/features/nav/StaffLinks';
import Link from 'next/link';
import { LevelScope, SubjectProvider } from '@scipal/ui';
import { useLanguage } from '@scipal/hooks';
import {
  EDUCATION_LEVEL_LABELS,
  levelOfGrade,
  readSessionEducationLevel,
  type EducationLevel,
} from '../landing/educationLevel';
import type { InformaticsAvailability, LandingCatalog, LandingSubject } from '../landing/getLandingData';
import styles from './subject-grid.module.css';

const GRADE_GROUPS: { level: EducationLevel; grades: number[] }[] = [
  { level: 'primary', grades: [1, 2, 3, 4, 5] },
  { level: 'lower_secondary', grades: [6, 7, 8, 9] },
  { level: 'upper_secondary', grades: [10, 11, 12] },
];

const FIRST_GRADE: Record<EducationLevel, number> = { primary: 1, lower_secondary: 6, upper_secondary: 10 };

interface SubjectsPageProps {
  accountLevel: EducationLevel | null;
  catalog: LandingCatalog;
  /** Kept for the route's data contract; grade cards read availability from `liveGrades`. */
  informatics?: InformaticsAvailability;
}

/** Subjects taught in one grade: catalog rows of that grade's level that list the grade. */
export function subjectsForGrade(catalog: LandingCatalog, grade: number): LandingSubject[] {
  if (catalog.kind !== 'ready') return [];
  const level = levelOfGrade(grade);
  return catalog.subjects.filter((subject) => subject.education_level === level && subject.grades?.includes(grade));
}

function GradeSubjectCard({ subject, grade }: { subject: LandingSubject; grade: number }) {
  const { lang, t } = useLanguage();
  const live = subject.liveGrades?.includes(grade) ?? false;
  const href = live ? `/${subject.slug}#lop-${grade}` : null;

  const card = (
    <article className={[styles.card, href ? styles.activeCard : ''].filter(Boolean).join(' ')}>
      <div className={styles.cardTopline}>
        <span className={styles.grade}>{t({ en: `Grade ${grade}`, vi: `Lớp ${grade}` })}</span>
        <span className={href ? styles.statusActive : styles.statusUpcoming}>
          {href ? t({ en: 'Published lessons', vi: 'Có bài học' }) : t({ en: 'In development', vi: 'Đang biên soạn' })}
        </span>
      </div>
      <div className={styles.subjectInfo}>
        <span className={styles.subjectIcon} aria-hidden="true"><SubjectIcon slug={subject.slug} glyph={subject.icon} level={levelOfGrade(grade)} /></span>
        <h3>{lang === 'en' ? subject.name_en : subject.name_vi}</h3>
        <p lang={lang === 'en' ? 'vi' : 'en'}>{lang === 'en' ? subject.name_vi : subject.name_en}</p>
      </div>
      <div className={styles.cardAction}>
        {href ? (
          <Link href={href} className={styles.activeAction}>
            {t({ en: 'Start learning', vi: 'Vào học' })}
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className={styles.disabledAction}>{t({ en: 'In development', vi: 'Đang biên soạn' })}</span>
        )}
      </div>
    </article>
  );

  if (!href) return card;
  return (
    <SubjectProvider slug={subject.slug} accentColor={subject.accent_color ?? undefined}>
      <div className={styles.cardScope}>{card}</div>
    </SubjectProvider>
  );
}

/**
 * The navbar's Subjects page: pick a grade, see its subjects. Follows the chosen level (account
 * level, else the one picked this session): only that level's grades are offered, opening on
 * its first. With no level chosen yet, every grade is offered, opening on grade 10.
 */
export function SubjectsPage({ accountLevel, catalog }: SubjectsPageProps) {
  const { lang, t } = useLanguage();
  const [level, setLevel] = useState<EducationLevel | null>(accountLevel);
  const [grade, setGrade] = useState<number>(FIRST_GRADE[accountLevel ?? 'upper_secondary']);

  useEffect(() => {
    if (accountLevel) return;
    try {
      const sessionLevel = readSessionEducationLevel(window.sessionStorage);
      if (sessionLevel) {
        setLevel(sessionLevel);
        setGrade(FIRST_GRADE[sessionLevel]);
      }
    } catch {
      // Storage blocked: offer every grade.
    }
  }, [accountLevel]);

  const groups = level ? GRADE_GROUPS.filter((group) => group.level === level) : GRADE_GROUPS;
  const subjects = subjectsForGrade(catalog, grade);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
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
          <li aria-current="page" className="font-semibold text-ink">{t({ en: 'Subjects', vi: 'Môn học' })}</li>
        </ol>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{t({ en: 'Subjects', vi: 'Môn học' })}</h1>
        <p className="max-w-prose text-ink-muted">
          {level
            ? t({
                en: `${EDUCATION_LEVEL_LABELS[level].en}: choose your grade to see its subjects.`,
                vi: `${EDUCATION_LEVEL_LABELS[level].vi}: chọn lớp của bạn để xem các môn học.`,
              })
            : t({ en: 'Choose your grade to see its subjects.', vi: 'Chọn lớp của bạn để xem các môn học.' })}
        </p>
        <StaffLinks place="subjects" />
      </header>

      <div role="group" aria-label={t({ en: 'Grade', vi: 'Lớp' })} className="flex flex-wrap gap-x-6 gap-y-4">
        {groups.map((group) => (
          <LevelScope key={group.level} level={group.level} className="flex flex-col gap-2">
            {level ? null : (
              <span className="text-xs font-semibold text-ink-muted">{t(EDUCATION_LEVEL_LABELS[group.level])}</span>
            )}
            <div className="flex flex-wrap gap-2">
              {group.grades.map((option) => {
                const selected = option === grade;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    aria-label={lang === 'en' ? `Grade ${option}` : `Lớp ${option}`}
                    onClick={() => setGrade(option)}
                    className={`grid h-11 min-w-11 place-items-center rounded-xl border px-3 text-base font-bold tabular-nums transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px ${
                      selected
                        ? 'border-transparent bg-nav text-nav-ink shadow-[0_10px_22px_-12px_var(--nav)]'
                        : 'border-edge bg-surface text-ink hover:-translate-y-0.5 hover:border-[var(--nav)] hover:shadow-[0_10px_22px_-16px_var(--nav)]'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </LevelScope>
        ))}
      </div>

      <LevelScope level={levelOfGrade(grade)} className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-ink">{t({ en: `Grade ${grade} subjects`, vi: `Môn học lớp ${grade}` })}</h2>
        {catalog.kind === 'error' ? (
          <div className={styles.catalogMessage} role="alert">
            <p>{t({ en: 'We could not load the subject list. Please try again.', vi: 'Chưa tải được danh sách môn học. Hãy thử lại.' })}</p>
            <button type="button" className={styles.retryAction} onClick={() => window.location.reload()}>
              {t({ en: 'Reload subjects', vi: 'Tải lại danh sách' })}
            </button>
          </div>
        ) : subjects.length === 0 ? (
          <p className={styles.catalogMessage}>
            {t({ en: 'Subjects for this grade are being prepared.', vi: 'Các môn của lớp này đang được chuẩn bị.' })}
          </p>
        ) : (
          <div key={grade} className={styles.levelGrid}>
            {subjects.map((subject) => (
              <GradeSubjectCard key={subject.slug} subject={subject} grade={grade} />
            ))}
          </div>
        )}
      </LevelScope>
    </main>
  );
}
