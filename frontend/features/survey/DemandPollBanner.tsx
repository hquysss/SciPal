'use client';

import { useCallback, useState } from 'react';
import { ArrowRight, Vote } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { SubjectDemandModal } from './SubjectDemandModal';
import styles from './demand-poll.module.css';

/** The subject poll, set as a glass strip inside the landing page's closing call to action. */
export function DemandPollBanner() {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <>
      <section className={styles.poll} aria-labelledby="demand-poll-title">
        <span className={styles.icon} aria-hidden="true">
          <Vote size={22} strokeWidth={1.8} />
        </span>
        <div className={styles.copy}>
          <h2 id="demand-poll-title" className={styles.title}>
            {t({ en: 'Which subjects are you interested in?', vi: 'Bạn quan tâm đến những môn học nào?' })}
          </h2>
          <p className={styles.note}>
            {t({ en: 'Your vote tells SciPal which subject to write next.', vi: 'Bình chọn giúp SciPal biết nên biên soạn môn nào trước.' })}
          </p>
        </div>
        <button type="button" className={styles.vote} onClick={() => setModalOpen(true)}>
          {t({ en: 'Vote now', vi: 'Bình chọn môn tiếp theo' })}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>

      <SubjectDemandModal open={modalOpen} onClose={closeModal} />
    </>
  );
}
