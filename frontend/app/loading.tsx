'use client';

import { useEffect, useState } from 'react';
import { Atom } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import styles from './loading.module.css';

export default function Loading() {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(88);
      return;
    }

    const intervalId = window.setInterval(() => {
      setProgress((current) => Math.min(92, current + Math.max(1, (92 - current) * 0.12)));
    }, 180);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <main className={styles.screen} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <section className={styles.content}>
        <div className={styles.mark} aria-hidden="true">
          <Atom size={31} strokeWidth={1.7} />
        </div>

        <p className={styles.brand}>
          <span>SciPal</span>
          <span className={styles.brandDivider} aria-hidden="true">·</span>
          {t({ en: 'Science learning space', vi: 'Không gian học khoa học' })}
        </p>

        <h1>{t({ en: 'Preparing your page', vi: 'Đang chuẩn bị trang học tập' })}</h1>
        <p className={styles.message}>
          {t({
            en: 'Loading your learning space…',
            vi: 'Đang tải nội dung, chờ một chút nhé…',
          })}
        </p>

        <div className={styles.progressWrap}>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={t({ en: 'Page loading progress', vi: 'Tiến trình tải trang' })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>{t({ en: 'Please wait', vi: 'Vui lòng chờ' })}</span>
            <span aria-hidden="true">{Math.round(progress)}%</span>
          </div>
        </div>

        <div className={styles.loadingDots} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </main>
  );
}
