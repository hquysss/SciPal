'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { INTRO_COOKIE } from './educationLevel';
import type { EducationLevel } from './educationLevel';
import styles from './landing.module.css';

const MIN_VISIBLE_MS = 1400;
const MAX_VISIBLE_MS = 2600;
const EXIT_MS = 850;

/** Set once the curtain has lifted, so changing level in place does not replay it. */
let played = false;

export const introPlayed = () => played;

/**
 * A dark curtain with the wordmark and a filling bar. Once the page has loaded (and at least
 * MIN_VISIBLE_MS has passed, at most MAX_VISIBLE_MS) it calls onReady, which lets the hero
 * play its entrance, and slides up out of the way. Scroll is locked while it covers the page.
 */
export function IntroCurtain({ level, onReady }: { level: EducationLevel; onReady: () => void }) {
  const [phase, setPhase] = useState<'show' | 'exit' | 'gone'>('show');
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const html = document.documentElement;
    const timers: number[] = [];
    let done = false;
    html.style.overflow = 'hidden';

    const reveal = () => {
      if (done) return;
      done = true;
      played = true;
      document.cookie = `${INTRO_COOKIE}=1; path=/; SameSite=Lax`;
      html.style.removeProperty('overflow');
      readyRef.current();
      if (reduce) return setPhase('gone');
      setPhase('exit');
      timers.push(window.setTimeout(() => setPhase('gone'), EXIT_MS));
    };
    const start = () => timers.push(window.setTimeout(reveal, reduce ? 200 : MIN_VISIBLE_MS));

    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    timers.push(window.setTimeout(reveal, MAX_VISIBLE_MS));

    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener('load', start);
      html.style.removeProperty('overflow');
    };
  }, []);

  if (phase === 'gone') return null;
  return (
    <div className={styles.intro} data-phase={phase} data-scipal-level={level} aria-hidden="true">
      <div className={styles.introMark}>
        <Image src="/logo.svg" width={30} height={30} alt="" />
        SciPal
      </div>
      <div className={styles.introTrack}>
        <span />
      </div>
    </div>
  );
}
