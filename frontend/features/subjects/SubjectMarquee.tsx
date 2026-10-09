'use client';

import { SubjectIcon } from '@/components/subject/SubjectIcon';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import type { EducationLevel } from '../landing/educationLevel';
import type { LandingCatalog, LandingSubject } from '../landing/getLandingData';
import { getSubjectAction } from './subjectAvailability';
import styles from './subject-marquee.module.css';

/** Cards per half of the loop at least, so a short catalog still fills a wide screen. */
const MIN_PER_LOOP = 8;
/** Seconds each card takes to cross, so long and short strips move at the same pace. */
const SECONDS_PER_CARD = 3.2;

/** Subjects with lessons first, each group in catalog order. */
export function marqueeOrder(subjects: LandingSubject[]): LandingSubject[] {
  const live = subjects.filter((s) => getSubjectAction(s) !== null);
  const rest = subjects.filter((s) => getSubjectAction(s) === null);
  return [...live, ...rest];
}

function MarqueeCard({ subject, copy, level }: { subject: LandingSubject; copy: boolean; level: EducationLevel }) {
  const { lang, t } = useLanguage();
  const href = getSubjectAction(subject);
  const name = lang === 'en' ? subject.name_en : subject.name_vi;
  const other = lang === 'en' ? subject.name_vi : subject.name_en;

  if (!href) {
    return (
      <article className={styles.card}>
        <span className={styles.icon} aria-hidden="true"><SubjectIcon slug={subject.slug} glyph={subject.icon} level={level} /></span>
        <span className={styles.names}>
          <h3>{name}</h3>
          <span lang={lang === 'en' ? 'vi' : 'en'}>{other}</span>
        </span>
        <span className={styles.soon}>{t({ en: 'In development', vi: 'Đang biên soạn' })}</span>
      </article>
    );
  }

  return (
    <article className={`${styles.card} ${styles.live}`}>
      <span className={styles.icon} aria-hidden="true"><SubjectIcon slug={subject.slug} glyph={subject.icon} level={level} /></span>
      <span className={styles.names}>
        <h3>{name}</h3>
        <span lang={lang === 'en' ? 'vi' : 'en'}>{other}</span>
      </span>
      {copy ? (
        <span className={styles.soon}>{t({ en: 'Available', vi: 'Đang mở' })}</span>
      ) : (
        <Link href={href} className={styles.go}>
          {t({ en: 'Start now', vi: 'Học ngay' })}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </article>
  );
}

function CatalogMessage({ kind }: { kind: 'empty' | 'error' }) {
  const { t } = useLanguage();
  if (kind === 'error') {
    return (
      <div className={styles.message} role="alert">
        <p>{t({ en: 'We could not load this subject list. Please try again.', vi: 'Chưa tải được danh sách môn học. Hãy thử lại.' })}</p>
        <button type="button" className={styles.retry} onClick={() => window.location.reload()}>
          {t({ en: 'Reload subjects', vi: 'Tải lại danh sách' })}
        </button>
      </div>
    );
  }
  return (
    <p className={styles.message}>
      {t({ en: 'The subject list for this level is being prepared.', vi: 'Danh sách môn học của cấp này đang được chuẩn bị.' })}
    </p>
  );
}

export function SubjectMarquee({ level, catalog }: { level: EducationLevel; catalog: LandingCatalog }) {
  const { t } = useLanguage();
  const label = t({ en: 'Subjects', vi: 'Các môn học' });
  const carouselLabel = t({ en: 'Subjects; focus here to pause', vi: 'Các môn học; đưa tiêu điểm vào để dừng' });

  if (catalog.kind === 'error') {
    return <div role="region" aria-label={label}><CatalogMessage kind="error" /></div>;
  }
  const subjects = marqueeOrder(catalog.subjects.filter((s) => s.education_level === level));
  if (subjects.length === 0) {
    return <div role="region" aria-label={label}><CatalogMessage kind="empty" /></div>;
  }

  // One loop half: the subjects, repeated until it is long enough; then the same half again.
  const repeats = Math.ceil(MIN_PER_LOOP / subjects.length);
  const half = Array.from({ length: repeats }, () => subjects).flat();
  const cards = [...half, ...half];
  const liveCount = subjects.filter((s) => getSubjectAction(s) !== null).length;

  return (
    <div
      className={styles.marquee}
      role="region"
      aria-label={carouselLabel}
      aria-roledescription={t({ en: 'carousel', vi: 'băng chuyền' })}
      tabIndex={0}
      style={{ '--marquee-duration': `${half.length * SECONDS_PER_CARD}s` } as CSSProperties}
    >
      {liveCount > 0 && (
        <p className={styles.srOnly}>
          {t({ en: `${liveCount} subjects have lessons; they come first.`, vi: `${liveCount} môn đã có bài học, xếp ở đầu dải.` })}
        </p>
      )}
      <ul className={styles.rail}>
        {cards.map((subject, index) => {
          const copy = index >= subjects.length;
          return (
            <li key={`${subject.slug}-${index}`} aria-hidden={copy || undefined} inert={copy || undefined} data-copy={copy || undefined}>
              <MarqueeCard subject={subject} copy={copy} level={level} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
