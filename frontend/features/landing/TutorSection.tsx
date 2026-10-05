'use client';

import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { EducationLevel } from './educationLevel';
import { TutorDemoCard } from './TutorDemoCard';
import styles from './sections.module.css';

/** SciPal Professor showcase. The try button appears once a tutor page exists and its href is passed in. */
export function TutorSection({ href, level = 'upper_secondary' }: { href?: string; level?: EducationLevel }) {
  const { t } = useLanguage();

  return (
    <section className={`${styles.section} ${styles.tutorSection}`} aria-labelledby="tutor-title">
      <div className={styles.tutorIntro} data-landing-reveal>
        <h2 id="tutor-title" className={styles.sectionTitle}>
          {t({ en: 'Ask anytime', vi: 'Hỏi bất cứ lúc nào' })}
        </h2>
        <p className={styles.sectionLead}>
          {t({
            en: 'Stuck on a step? The Professor answers with a hint, so you work out the rest yourself.',
            vi: 'Bí ở bước nào, hỏi ngay: Giáo sư Quý gợi ý để bạn tự tìm ra phần còn lại.',
          })}
        </p>
        {href && (
          <a href={href} className={styles.primaryAction}>
            {t({ en: 'Try it', vi: 'Thử ngay' })}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        )}
      </div>
      <div className={styles.tutorStage} data-landing-reveal>
        <TutorDemoCard level={level} />
      </div>
    </section>
  );
}
