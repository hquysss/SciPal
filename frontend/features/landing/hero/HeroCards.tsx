import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { EducationLevel } from '../educationLevel';
import styles from './hero.module.css';

type Copy = { en: string; vi: string };

interface LevelScene {
  subject: Copy;
  term: Copy;
  definition: Copy;
  question: Copy;
  options: [Copy, Copy, Copy];
}

/** The right answer is always the middle option; the CSS loop taps [data-correct]. */
const SCENES: Record<EducationLevel, LevelScene> = {
  primary: {
    subject: { vi: 'Toán', en: 'Maths' },
    term: { vi: 'Phân số', en: 'Fraction' },
    definition: { vi: 'Một phần của tổng thể, ví dụ 1/2.', en: 'A part of a whole, like 1/2.' },
    question: { vi: '1/2 + 1/4 = ?', en: '1/2 + 1/4 = ?' },
    options: [
      { vi: '2/6', en: '2/6' },
      { vi: '3/4', en: '3/4' },
      { vi: '1/8', en: '1/8' },
    ],
  },
  lower_secondary: {
    subject: { vi: 'Khoa học tự nhiên', en: 'Natural Science' },
    term: { vi: 'Quang hợp', en: 'Photosynthesis' },
    definition: {
      vi: 'Cây dùng ánh sáng biến CO₂ và nước thành chất hữu cơ.',
      en: 'Plants use light to turn CO₂ and water into food.',
    },
    question: { vi: 'Quang hợp diễn ra chủ yếu ở đâu?', en: 'Where does photosynthesis mainly happen?' },
    options: [
      { vi: 'Rễ', en: 'Roots' },
      { vi: 'Lá', en: 'Leaves' },
      { vi: 'Thân', en: 'Stem' },
    ],
  },
  upper_secondary: {
    subject: { vi: 'Tin học', en: 'Informatics' },
    term: { vi: 'Thuật toán', en: 'Algorithm' },
    definition: {
      vi: 'Dãy hữu hạn các bước để giải một bài toán.',
      en: 'A finite list of steps that solves a problem.',
    },
    question: { vi: 'Độ phức tạp của tìm kiếm nhị phân?', en: 'Time complexity of binary search?' },
    options: [
      { vi: 'O(n)', en: 'O(n)' },
      { vi: 'O(log n)', en: 'O(log n)' },
      { vi: 'O(n²)', en: 'O(n²)' },
    ],
  },
};

const at = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

interface Beat {
  tap?: boolean;
  answered?: boolean;
  xp?: boolean;
  en?: boolean;
}

/** One loop of the story; each beat holds for its duration. CSS transitions animate between beats. */
const BEATS: Array<[Beat, number]> = [
  [{}, 1000],
  [{ tap: true }, 700],
  [{ tap: true, answered: true }, 400],
  [{ answered: true, xp: true }, 1400],
  [{ answered: true, xp: true, en: true }, 2600],
];

/** The resting state: server render, reduced motion, and before the loop starts. */
const RESTING: Beat = { answered: true, xp: true };

/**
 * Plays BEATS on one clock so every card stays in step, after the entrance and only while on screen.
 * Reduced motion keeps the resting state.
 */
function useStoryBeat(rootRef: React.RefObject<HTMLDivElement | null>) {
  const [beat, setBeat] = useState<Beat>(RESTING);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let index = 0;
    let timer = 0;
    let visible = false;
    let started = false;
    const step = () => {
      const [next, hold] = BEATS[index];
      setBeat(next);
      index = (index + 1) % BEATS.length;
      timer = window.setTimeout(step, hold);
    };
    const resume = () => {
      if (visible && started && !timer) step();
    };
    const pause = () => {
      window.clearTimeout(timer);
      timer = 0;
    };
    const startTimer = window.setTimeout(() => {
      started = true;
      resume();
    }, 2200);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) resume();
      else pause();
    });
    observer.observe(root);
    return () => {
      window.clearTimeout(startTimer);
      pause();
      observer.disconnect();
    };
  }, [rootRef]);

  return beat;
}

const flag = (on?: boolean) => (on ? '' : undefined);

/**
 * Three glass SciPal cards floating over the hero photo: a term that flips Vietnamese ↔ English,
 * a quick question that answers itself, and the XP it earns. Decorative; the hero copy carries the message.
 */
export function HeroCards({ level }: { level: EducationLevel }) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const beat = useStoryBeat(rootRef);
  const scene = SCENES[level];

  return (
    <div
      ref={rootRef}
      className={styles.cards}
      aria-hidden="true"
      data-hero-cards={level}
      data-tap={flag(beat.tap)}
      data-answered={flag(beat.answered)}
      data-xp={flag(beat.xp)}
      data-en={flag(beat.en)}
    >
      <div className={`${styles.layer} ${styles.layerBack}`}>
        <div className={`${styles.card} ${styles.termCard}`} style={at(650)}>
          <p className={styles.cardLabel}>
            <BookOpen size={14} strokeWidth={2.25} />
            {t(scene.subject)}
          </p>
          <div className={styles.flip}>
            <div className={styles.flipInner}>
              <span className={styles.face} lang="vi">{scene.term.vi}</span>
              <span className={`${styles.face} ${styles.faceBack}`} lang="en">{scene.term.en}</span>
            </div>
          </div>
          <p className={styles.definition}>{t(scene.definition)}</p>
          <span className={styles.langSwitch}>
            <span>VI</span>
            <span>EN</span>
          </span>
        </div>
      </div>

      <div className={`${styles.layer} ${styles.layerMid}`}>
        <div className={`${styles.card} ${styles.quizCard}`} style={at(800)}>
          <p className={styles.cardLabel}>{t({ vi: 'Câu hỏi nhanh', en: 'Quick check' })}</p>
          <p className={styles.question}>{t(scene.question)}</p>
          <ul className={styles.options}>
            {scene.options.map((option, index) => (
              <li key={option.en} data-correct={index === 1 ? '' : undefined}>
                {t(option)}
                {index === 1 && (
                  <>
                    <svg className={styles.check} viewBox="0 0 24 24" focusable="false">
                      <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
                    </svg>
                    <span className={styles.tap} />
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`${styles.layer} ${styles.layerFront}`}>
        <div className={styles.xp} style={at(950)}>
          <span className={styles.xpInner}>
            <Sparkles size={16} strokeWidth={2.25} />
            +10 XP
          </span>
        </div>
      </div>
    </div>
  );
}
