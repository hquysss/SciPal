'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { SubjectProvider } from '@scipal/ui';
import { Mascot } from '@/components/mascot/Mascot';
import { SubjectIcon } from '@/components/subject/SubjectIcon';
import { marqueeOrder } from '@/features/subjects/SubjectMarquee';
import { getSubjectAction } from '@/features/subjects/subjectAvailability';
import type { EducationLevel } from './educationLevel';
import type { LandingCatalog } from './getLandingData';
import styles from './landing.module.css';

type Copy = { en: string; vi: string };

/** The fixed ghost words: top row "Học … Song", the right end of the bottom row "Ngữ". */
const LEARN: Copy = { en: 'Learn', vi: 'Học' };
const BI: [Copy, Copy] = [
  { en: 'In two', vi: 'Song' },
  { en: 'Languages', vi: 'Ngữ' },
];

/** Short forms for names too long to sit in the ghost heading; the card caption keeps the full name. */
const SHORT_NAME: Record<string, { en: string; vi: string }> = {
  'experiential-career': { en: 'Career Activities', vi: 'HĐTNHN' },
  'experiential-activities': { en: 'Experiences', vi: 'HĐTN' },
  'national-defence': { en: 'Defence Ed.', vi: 'GDQP&AN' },
  'physical-education': { en: 'Phys. Ed.', vi: 'GDTC' },
  'economic-law-education': { en: 'Economics & Law', vi: 'GDKTPL' },
};

function GhostWord({ word, i, ink }: { word: string; i: number; ink?: boolean }) {
  return (
    <span className={styles.ghostWord} data-par="" data-ink={ink ? '' : undefined}>
      <span className={styles.clipLine} style={{ '--i': i } as React.CSSProperties}>
        <span>{word}</span>
      </span>
    </span>
  );
}

/**
 * The oversized ghost heading as a subject carousel: the second row is the active subject's name,
 * and the tilted card shows its picture on the subject's --accent. Changing subject replays the
 * clip-mask reveal (the rows remount) and fades the card in. Subjects come from the catalog.
 */
export function SubjectSpotlight({ level, catalog }: { level: EducationLevel; catalog: LandingCatalog }) {
  const { t, lang } = useLanguage();
  const subjects = catalog?.kind === 'ready' ? marqueeOrder(catalog.subjects.filter((s) => s.education_level === level)) : [];
  const [index, setIndex] = useState(0);
  const [moved, setMoved] = useState(false);
  const subject = subjects.length ? subjects[index % subjects.length] : null;
  const name = subject ? (lang === 'en' ? subject.name_en : subject.name_vi) : t({ en: 'Every subject', vi: 'Mọi môn học' });
  const headline = subject && SHORT_NAME[subject.slug] ? t(SHORT_NAME[subject.slug]) : name;
  const other = subject ? (lang === 'en' ? subject.name_vi : subject.name_en) : '';
  const [bi1, bi2] = BI.map((word) => t(word));

  // The words are new elements after a change: have the page write their scroll progress again.
  useEffect(() => {
    window.dispatchEvent(new Event('scroll'));
  }, [index]);

  const go = (next: number) => {
    setIndex((next + subjects.length) % subjects.length);
    setMoved(true);
  };

  return (
    <>
      <div className={styles.spotStage}>
        <h2
          id="trust-title"
          className={`${styles.ghost} ${moved ? styles.clipIn : ''}`}
          aria-label={`${t(LEARN)} ${name} ${bi1} ${bi2}`}
          data-clip
        >
          <span className={styles.ghostRow} aria-hidden="true" key={`a-${index}`}>
            <GhostWord word={t(LEARN)} i={0} />
            <GhostWord word={bi1} i={1} />
          </span>
          <span className={styles.ghostRow} aria-hidden="true" key={`b-${index}`}>
            <GhostWord word={headline} i={2} ink />
            <GhostWord word={bi2} i={3} />
          </span>
        </h2>

        <figure className={styles.coachCard} data-landing-reveal>
          {subject ? (
            <SubjectProvider slug={subject.slug} accentColor={subject.accent_color}>
              <div className={`${styles.coachTilt} ${styles.spotCard}`} key={subject.slug}>
                <span className={styles.spotIcon} aria-hidden="true">
                  <SubjectIcon slug={subject.slug} glyph={subject.icon} level={level} />
                </span>
                <figcaption className={styles.glassCaption}>
                  <strong>{name}</strong>
                  <span>
                    <span lang={lang === 'en' ? 'vi' : 'en'}>{other}</span>
                    {' · '}
                    {getSubjectAction(subject) ? t({ en: 'Open now', vi: 'Đang mở' }) : t({ en: 'In development', vi: 'Đang biên soạn' })}
                  </span>
                </figcaption>
              </div>
            </SubjectProvider>
          ) : (
            <div className={styles.coachTilt}>
              <Mascot
                directions="/mascots/kamran-directions.webp"
                reactions="/mascots/kamran-reactions.webp"
                size={180}
                ariaLabel={t({ en: 'Say hello to Professor Quys', vi: 'Chào Giáo sư Quý' })}
              />
              <figcaption className={styles.glassCaption}>
                <strong>{t({ en: 'Professor Quys', vi: 'Giáo sư Quý' })}</strong>
                <span>{t({ en: 'Your AI tutor', vi: 'Gia sư AI của bạn' })}</span>
              </figcaption>
            </div>
          )}
        </figure>
      </div>

      {subjects.length > 1 && (
        <div className={styles.controls}>
          <button type="button" className={styles.arrowOutline} onClick={() => go(index - 1)} aria-label={t({ en: 'Previous subject', vi: 'Môn trước' })}>
            <ArrowRight size={20} aria-hidden="true" className={styles.flipX} />
          </button>
          <div className={styles.dots} role="group" aria-label={t({ en: 'Subjects', vi: 'Môn học' })}>
            {subjects.map((s, i) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => go(i)}
                aria-label={lang === 'en' ? s.name_en : s.name_vi}
                aria-current={i === index ? 'true' : undefined}
              >
                <span />
              </button>
            ))}
          </div>
          <button type="button" className={styles.arrowSolid} onClick={() => go(index + 1)} aria-label={t({ en: 'Next subject', vi: 'Môn tiếp theo' })}>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <p className={styles.srOnly} aria-live="polite">{name}</p>
        </div>
      )}
    </>
  );
}
