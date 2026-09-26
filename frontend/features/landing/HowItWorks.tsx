'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, Languages, MessageCircleQuestion, RotateCw } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { FlagIcon } from '@/components/nav/FlagIcon';
import styles from './sections.module.css';

const SENTENCE = {
  vi: 'Khi Mặt Trời lên cao, bóng ngắn lại.',
  en: 'As the Sun rises, shadows grow shorter.',
} as const;

const LANG_OPTIONS = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
] as const;

/** Local EN ⇄ VI switch: shows the bilingual idea without changing the app language. */
export function BilingualCard({ initial = 'vi' }: { initial?: 'en' | 'vi' }) {
  const { t } = useLanguage();
  const [shown, setShown] = useState<'en' | 'vi'>(initial);

  return (
    <article className={styles.card} data-landing-reveal>
      <span className={styles.cardIcon} aria-hidden="true"><Languages size={20} /></span>
      <h3 className={styles.cardLabel}>{t({ en: 'Bilingual', vi: 'Song ngữ' })}</h3>
      <p className={styles.sentence} lang={shown} aria-live="polite">{SENTENCE[shown]}</p>
      <div className={styles.flagSwitch} role="group" aria-label={t({ en: 'Sentence language', vi: 'Ngôn ngữ của câu' })}>
        {LANG_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.flagButton}
            aria-label={option.label}
            aria-pressed={shown === option.value}
            title={option.label}
            onClick={() => setShown(option.value)}
          >
            <FlagIcon lang={option.value} />
          </button>
        ))}
      </div>
    </article>
  );
}

export function TermCard({ initialFlipped = false }: { initialFlipped?: boolean }) {
  const { t } = useLanguage();
  const [flipped, setFlipped] = useState(initialFlipped);

  return (
    <article className={styles.card} data-landing-reveal>
      <span className={styles.cardIcon} aria-hidden="true"><BookOpen size={20} /></span>
      <h3 className={styles.cardLabel}>{t({ en: 'Look up terms', vi: 'Tra thuật ngữ' })}</h3>
      <button
        type="button"
        className={styles.term}
        data-flipped={flipped ? 'true' : undefined}
        aria-expanded={flipped}
        aria-controls="term-definition"
        onClick={() => setFlipped((value) => !value)}
      >
        <span className={styles.termFace} aria-hidden={flipped}>
          <span className={styles.termWord}>{t({ en: 'Photosynthesis', vi: 'Quang hợp' })}</span>
          <RotateCw size={16} aria-hidden="true" />
        </span>
        <span className={`${styles.termFace} ${styles.termBack}`} id="term-definition" aria-hidden={!flipped}>
          {flipped && t({ en: 'Plants use light to make food.', vi: 'Cây dùng ánh sáng để tạo chất dinh dưỡng.' })}
        </span>
      </button>
      <Link href="/glossary" className={styles.cardLink}>
        {t({ en: 'Open glossary', vi: 'Mở từ điển' })}
        <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}

export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section className={styles.section} id="cach-hoc" aria-labelledby="how-title">
      <h2 id="how-title" className={styles.sectionTitle} data-landing-reveal>
        {t({ en: 'How it works', vi: 'Học thế nào' })}
      </h2>
      <div className={styles.cards}>
        <article className={styles.card} data-landing-reveal>
          <span className={styles.cardIcon} aria-hidden="true"><MessageCircleQuestion size={20} /></span>
          <h3 className={styles.cardLabel}>{t({ en: 'Ask', vi: 'Hỏi' })}</h3>
          <p className={styles.question}>{t({ en: 'Why do shadows shrink?', vi: 'Vì sao bóng ngắn lại?' })}</p>
        </article>
        <BilingualCard />
        <TermCard />
      </div>
    </section>
  );
}
