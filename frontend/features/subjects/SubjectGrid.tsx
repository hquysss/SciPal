'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { SubjectProvider } from '@scipal/ui';
import type { EducationLevel } from '../landing/educationLevel';
import type { InformaticsAvailability, LandingCatalog, LandingSubject } from '../landing/getLandingData';
import { getSubjectAction } from './subjectAvailability';
import styles from './subject-grid.module.css';

interface SubjectGridProps {
  level: EducationLevel;
  catalog: LandingCatalog;
  informatics: InformaticsAvailability;
}

function levelLabel(level: EducationLevel, lang: 'en' | 'vi') {
  if (level === 'primary') {
    return lang === 'en' ? 'Primary · Grades 1–5' : 'Tiểu học · Lớp 1–5';
  }
  if (level === 'lower_secondary') {
    return lang === 'en' ? 'Lower secondary · Grades 6–9' : 'THCS · Lớp 6–9';
  }
  return lang === 'en' ? 'Upper secondary · Grades 10–12' : 'THPT · Lớp 10–12';
}

function statusText(
  subject: LandingSubject,
  informatics: InformaticsAvailability,
  lang: 'en' | 'vi',
) {
  if (subject.slug === 'informatics' && subject.education_level === 'upper_secondary') {
    if (informatics.kind === 'available' && subject.status === 'active') {
      return lang === 'en' ? 'Published lessons' : 'Có bài học đã xuất bản';
    }
    if (informatics.kind === 'error') {
      return lang === 'en' ? 'Could not verify lessons' : 'Chưa kiểm tra được bài học';
    }
    return lang === 'en' ? 'Lessons are being prepared' : 'Học liệu đang được bổ sung';
  }

  return lang === 'en' ? 'In development' : 'Đang biên soạn';
}

function SubjectCard({
  subject,
  level,
  informatics,
  duplicate = false,
}: {
  subject: LandingSubject;
  level: EducationLevel;
  informatics: InformaticsAvailability;
  duplicate?: boolean;
}) {
  const { lang, t } = useLanguage();
  const href = getSubjectAction(level, subject, informatics);
  const cardClassName = [styles.card, href ? styles.activeCard : ''].filter(Boolean).join(' ');
  const card = (
    <article className={cardClassName} data-landing-reveal={duplicate ? undefined : ''}>
      <div className={styles.cardTopline}>
        <span className={styles.grade}>{levelLabel(level, lang)}</span>
        <span className={href ? styles.statusActive : styles.statusUpcoming}>
          {statusText(subject, informatics, lang)}
        </span>
      </div>

      <div className={styles.subjectInfo}>
        <span className={styles.subjectIcon} aria-hidden="true">{subject.icon}</span>
        <h3>{lang === 'en' ? subject.name_en : subject.name_vi}</h3>
        <p lang={lang === 'en' ? 'vi' : 'en'}>
          {lang === 'en' ? subject.name_vi : subject.name_en}
        </p>
      </div>

      <div className={styles.cardAction}>
        {href ? (
          <Link href={href} className={styles.activeAction} tabIndex={duplicate ? -1 : undefined}>
            {t({ en: 'Explore subject', vi: 'Khám phá môn học' })}
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className={styles.disabledAction}>
            {t({ en: 'In development', vi: 'Đang biên soạn' })}
          </span>
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

function CatalogMessage({
  kind,
  lang,
}: {
  kind: 'empty' | 'error';
  lang: 'en' | 'vi';
}) {
  if (kind === 'error') {
    return (
      <div className={styles.catalogMessage} role="alert">
        <p>
          {lang === 'en'
            ? 'We could not load this subject list. Please try again.'
            : 'Chưa tải được danh sách môn học. Hãy thử lại.'}
        </p>
        <button type="button" className={styles.retryAction} onClick={() => window.location.reload()}>
          {lang === 'en' ? 'Reload subjects' : 'Tải lại danh sách'}
        </button>
      </div>
    );
  }

  return (
    <p className={styles.catalogMessage}>
      {lang === 'en'
        ? 'The subject list for this level is being prepared.'
        : 'Danh sách môn học của cấp này đang được chuẩn bị.'}
    </p>
  );
}

export function SubjectGrid({ level, catalog, informatics }: SubjectGridProps) {
  const { lang, t } = useLanguage();
  const subjects = catalog.kind === 'ready'
    ? catalog.subjects.filter((subject) => subject.education_level === level)
    : [];

  if (catalog.kind === 'error') {
    return (
      <div className={styles.levelCatalog} role="region" aria-label={t({ en: 'Subjects', vi: 'Các môn học' })}>
        <CatalogMessage kind="error" lang={lang} />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className={styles.levelCatalog} role="region" aria-label={t({ en: 'Subjects', vi: 'Các môn học' })}>
        <CatalogMessage kind="empty" lang={lang} />
      </div>
    );
  }

  const cards = (duplicate = false) => subjects.map((subject) => (
    <SubjectCard
      key={(duplicate ? 'duplicate-' : '') + subject.slug}
      subject={subject}
      level={level}
      informatics={informatics}
      duplicate={duplicate}
    />
  ));

  if (level === 'upper_secondary') {
    return (
      <div className={styles.highSchoolCatalog} role="region" aria-label={t({ en: 'Subjects', vi: 'Các môn học' })}>
        <div className={styles.grid} aria-label={t({ en: 'Upper-secondary subjects', vi: 'Các môn THPT' })}>
          <div className={styles.track}>
            {[false, true].map((duplicate) => (
              <div
                className={duplicate ? styles.duplicateGroup : styles.group}
                aria-hidden={duplicate || undefined}
                key={duplicate ? 'duplicate' : 'primary'}
              >
                {cards(duplicate)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.levelCatalog} role="region" aria-label={t({ en: 'Subjects', vi: 'Các môn học' })}>
      <div className={styles.levelGrid}>{cards()}</div>
    </div>
  );
}
