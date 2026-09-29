'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { SubjectProvider } from '@scipal/ui';
import type { EducationLevel } from '../landing/educationLevel';
import type { LandingCatalog, LandingSubject } from '../landing/getLandingData';
import { getSubjectAction } from './subjectAvailability';
import styles from './subject-marquee.module.css';

// The landing page's subjects as one strip that keeps running sideways. Subjects with lessons lead
// and stand out; the rest follow as quieter cards. Readers and keyboards get each subject once: the
// copies that make the loop seamless are aria-hidden and inert. Hover or focus pauses the strip;
// with reduced motion it stops and scrolls by hand instead.

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

function MarqueeCard({ subject }: { subject: LandingSubject }) {
  const { lang, t } = useLanguage();
  const href = getSubjectAction(subject);
  const name = lang === 'en' ? subject.name_en : subject.name_vi;
  const other = lang === 'en' ? subject.name_vi : subject.name_en;

  if (!href) {
    return (
      <article className={styles.card}>
        <span className={styles.icon} aria-hidden="true">{subject.icon}</span>
        <span className={styles.names}>
          <h3>{name}</h3>
          <span lang={lang === 'en' ? 'vi' : 'en'}>{other}</span>
        </span>
        <span className={styles.soon}>{t({ en: 'In development', vi: 'Đang biên soạn' })}</span>
      </article>
    );
  }

  return (
    <SubjectProvider slug={subject.slug} accentColor={subject.accent_color ?? undefined}>
      <article className={`${styles.card} ${styles.live}`}>
        <span className={styles.icon} aria-hidden="true">{subject.icon}</span>
        <span className={styles.names}>
          <h3>{name}</h3>
          <span lang={lang === 'en' ? 'vi' : 'en'}>{other}</span>
        </span>
        <Link href={href} className={styles.go}>
          {t({ en: 'Start now', vi: 'Học ngay' })}
          <span aria-hidden="true">→</span>
        </Link>
      </article>
    </SubjectProvider>
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
      aria-label={label}
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
              <MarqueeCard subject={subject} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
