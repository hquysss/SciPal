'use client';

import { useLanguage } from '@scipal/hooks';
import { NewsletterSignup } from '@/features/newsletter/NewsletterSignup';
import styles from './sections.module.css';

/** Sign-up for news of new lessons and levels, open to visitors. */
export function NewsletterSection() {
  const { t } = useLanguage();
  return (
    <section className={styles.section} id="nhan-tin" aria-labelledby="newsletter-title">
      <h2 id="newsletter-title" className={styles.sectionTitle} data-landing-reveal>
        {t({ en: 'Hear about new lessons', vi: 'Nhận tin bài học mới' })}
      </h2>
      <div className="max-w-xl" data-landing-reveal>
        <NewsletterSignup />
      </div>
    </section>
  );
}
