'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { SubjectProvider } from '@scipal/ui';
import { SUBJECT_CONFIG } from '@/lib/subject-config';
import styles from './subject-grid.module.css';

export function SubjectGrid() {
  const { t, lang } = useLanguage();

  return (
    <div
      className={styles.grid}
      role="region"
      aria-label={t({ en: 'Subjects', vi: 'Các môn học' })}
    >
      <div className={styles.track}>
        {[false, true].map((isDuplicate) => (
          <div
            className={isDuplicate ? `${styles.group} ${styles.duplicateGroup}` : styles.group}
            aria-hidden={isDuplicate || undefined}
            key={isDuplicate ? 'duplicate' : 'primary'}
          >
            {Object.values(SUBJECT_CONFIG).map((subject) => {
              const isActive = subject.status === 'active';

              return (
                <SubjectProvider
                  key={`${isDuplicate ? 'duplicate' : 'primary'}-${subject.slug}`}
                  slug={subject.slug}
                >
                  <article
                    className={styles.card + (isActive ? ' ' + styles.activeCard : '')}
                    data-landing-reveal={isDuplicate ? undefined : ''}
                  >
                    <div className={styles.cardTopline}>
                      <span className={styles.grade}>
                        {t({ en: 'GRADES 10–12', vi: 'THPT 10–12' })}
                      </span>
                      <span className={isActive ? styles.statusActive : styles.statusUpcoming}>
                        {isActive
                          ? t({ en: 'Available', vi: 'Sẵn sàng' })
                          : t({ en: 'In development', vi: 'Đang biên soạn' })}
                      </span>
                    </div>

                    <div className={styles.subjectInfo}>
                      <span className={styles.subjectIcon} aria-hidden="true">
                        {subject.icon}
                      </span>
                      <h3>{lang === 'en' ? subject.nameEn : subject.nameVi}</h3>
                      <p>{lang === 'en' ? subject.nameVi : subject.nameEn}</p>
                    </div>

                    <div className={styles.cardAction}>
                      {isActive ? (
                        <Link
                          href={'/' + subject.slug}
                          className={styles.activeAction}
                          tabIndex={isDuplicate ? -1 : undefined}
                        >
                          {t({ en: 'Start learning', vi: 'Bắt đầu học' })}
                          <span aria-hidden="true">→</span>
                        </Link>
                      ) : (
                        <button className={styles.disabledAction} type="button" disabled>
                          {t({ en: 'Being prepared', vi: 'Đang biên soạn' })}
                        </button>
                      )}
                    </div>
                  </article>
                </SubjectProvider>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
