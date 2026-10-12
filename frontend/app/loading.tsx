'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import styles from './loading.module.css';

// Three isometric slabs (the layers of a lesson) float one after another with a blinking light on each.
// After Juanes200122's Uiverse server stack, redrawn small and coloured with theme tokens.
const SLABS = [
  { y: 150, tone: 'sun' },
  { y: 108, tone: 'action' },
  { y: 66, tone: 'sky' },
] as const;
const THICKNESS = 22;

function Slab({ y, tone, index }: { y: number; tone: (typeof SLABS)[number]['tone']; index: number }) {
  const top = `M100 ${y - 40} L180 ${y} L100 ${y + 40} L20 ${y} Z`;
  const left = `M20 ${y} L100 ${y + 40} L100 ${y + 40 + THICKNESS} L20 ${y + THICKNESS} Z`;
  const right = `M180 ${y} L100 ${y + 40} L100 ${y + 40 + THICKNESS} L180 ${y + THICKNESS} Z`;
  const inner = `M100 ${y - 24} L148 ${y} L100 ${y + 24} L52 ${y} Z`;
  return (
    <g className={styles.slab} data-tone={tone} style={{ '--i': index } as React.CSSProperties}>
      <path className={styles.slabLeft} d={left} />
      <path className={styles.slabRight} d={right} />
      <path className={styles.slabTop} d={top} />
      <path className={styles.slabInner} d={inner} />
      {[34, 46, 58].map((x, led) => (
        <circle key={x} className={styles.led} style={{ '--l': led } as React.CSSProperties} cx={x} cy={y + (x - 20) / 2 + THICKNESS / 2} r="2.6" />
      ))}
    </g>
  );
}


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
        <svg className={styles.stack} viewBox="0 0 200 224" aria-hidden="true" focusable="false">
          <ellipse className={styles.stackShadow} cx="100" cy="214" rx="62" ry="8" />
          {SLABS.map((slab, index) => (
            <Slab key={slab.tone} {...slab} index={index} />
          ))}
        </svg>

        <p className={styles.brand}>
          <span>SciPal</span>
          <span className={styles.brandDivider} aria-hidden="true">·</span>
          {t({ en: 'Bilingual learning', vi: 'Học song ngữ' })}
        </p>

        <h1>{t({ en: 'Loading the page', vi: 'Đang tải trang' })}</h1>
        <p className={styles.message}>
          {t({
            en: 'Just a moment…',
            vi: 'Chờ chút nhé…',
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
            <div className={styles.progressFill} style={{ transform: `translateX(${progress - 100}%)` }} />
          </div>
          <div className={styles.progressMeta}>
            <span>{t({ en: 'Loading', vi: 'Đang tải' })}</span>
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
