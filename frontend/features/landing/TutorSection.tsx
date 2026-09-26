'use client';

import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { TutorDemoCard } from './TutorDemoCard';
import styles from './sections.module.css';

/** AI Tutor showcase. The try button appears once a tutor page exists and its href is passed in. */
export function TutorSection({ href }: { href?: string }) {
  const { t } = useLanguage();

  return (
    <section className={`${styles.section} ${styles.tutorSection}`} aria-labelledby="tutor-title">
      <div className={styles.tutorIntro} data-landing-reveal>
        <h2 id="tutor-title" className={styles.sectionTitle}>
          {t({ en: 'Ask anytime', vi: 'Hỏi bất cứ lúc nào' })}
        </h2>
        {href && (
          <a href={href} className={styles.primaryAction}>
            {t({ en: 'Try it', vi: 'Thử ngay' })}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        )}
      </div>
      <div className={styles.tutorStage} data-landing-reveal>
        <TutorDemoCard />
      </div>
    </section>
  );
}
