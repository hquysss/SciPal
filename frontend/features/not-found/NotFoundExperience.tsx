'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { notFoundCopy } from './notFoundCopy';
import styles from './NotFoundExperience.module.css';

const BlackHoleCanvas = dynamic(
  () => import('./BlackHoleCanvas').then((module) => module.BlackHoleCanvas),
  { ssr: false }
);

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className={styles.arrowIcon}>
      <path d="M3 9h11M9.5 4.5 14 9l-4.5 4.5" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className={styles.backIcon}>
      <path d="M14 9H4M8.5 4.5 4 9l4.5 4.5" />
    </svg>
  );
}

function SoundWaveIcon({ isPlaying }: { isPlaying: boolean }) {
  return (
    <span className={styles.soundWave} aria-hidden="true" data-playing={isPlaying}>
      <span className={styles.soundBar} />
      <span className={styles.soundBar} />
      <span className={styles.soundBar} />
      <span className={styles.soundBar} />
    </span>
  );
}

export function NotFoundExperience() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [sceneState, setSceneState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const buttonRef = useRef<HTMLAnchorElement>(null);

  const handleSceneReady = useCallback(() => setSceneState('ready'), []);
  const handleSceneFallback = useCallback(() => setSceneState('fallback'), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = 0.55;
    return () => {
      audio?.pause();
      audio?.removeAttribute('src');
    };
  }, []);

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, []);

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  }

  function moveButton(event: React.PointerEvent<HTMLAnchorElement>) {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect || event.pointerType === 'touch') return;
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    buttonRef.current?.style.setProperty('--button-x', `${(x * 4).toFixed(2)}px`);
    buttonRef.current?.style.setProperty('--button-y', `${(y * 3).toFixed(2)}px`);
    buttonRef.current?.style.setProperty('--light-x', `${50 + x * 28}%`);
    buttonRef.current?.style.setProperty('--light-y', `${50 + y * 24}%`);
  }

  function resetButton() {
    buttonRef.current?.style.setProperty('--button-x', '0px');
    buttonRef.current?.style.setProperty('--button-y', '0px');
    buttonRef.current?.style.setProperty('--light-x', '50%');
    buttonRef.current?.style.setProperty('--light-y', '50%');
  }

  return (
    <main id="main-content" tabIndex={-1} lang={lang} className={styles.root} data-scene-state={sceneState}>
      <div className={styles.sceneLayer} aria-hidden="true">
        <BlackHoleCanvas onReady={handleSceneReady} onFallback={handleSceneFallback} />
        <div className={styles.fallbackScene}>
          <span className={styles.fallbackDigits}>404</span>
          <div className={styles.fallbackDisk} />
          <div className={styles.fallbackCore} />
        </div>
        <div className={styles.vignette} />
      </div>

      <div className={styles.topBar}>
        <p className={styles.errorLabel}>{t(notFoundCopy.errorLabel)}</p>
        <div className={styles.topRightControls}>
          <button
            type="button"
            className={styles.audioToggle}
            onClick={toggleAudio}
            aria-pressed={isPlaying}
            aria-label={t(isPlaying ? notFoundCopy.muteAudio : notFoundCopy.playAudio)}
            title={t(isPlaying ? notFoundCopy.muteAudio : notFoundCopy.playAudio)}
          >
            <SoundWaveIcon isPlaying={isPlaying} />
            <span className={styles.audioLabel}>
              {t(isPlaying ? notFoundCopy.audioOn : notFoundCopy.audioOff)}
            </span>
          </button>
          <p className={styles.signalLabel} aria-hidden="true">
            {t(notFoundCopy.signalLabel)}
          </p>
        </div>
      </div>

      <section className={styles.copy} aria-labelledby="not-found-heading">
        <p className={styles.copyIndex} aria-hidden="true">
          {t(notFoundCopy.copyIndex)}
        </p>
        <h1 id="not-found-heading">{t(notFoundCopy.title)}</h1>
        <p className={styles.description}>{t(notFoundCopy.description)}</p>
        <div className={styles.actions}>
          <Link
            ref={buttonRef}
            href="/"
            className={styles.primaryAction}
            onPointerMove={moveButton}
            onPointerLeave={resetButton}
          >
            <span>{t(notFoundCopy.returnHome)}</span>
            <ArrowIcon />
          </Link>
          <button type="button" className={styles.secondaryAction} onClick={goBack}>
            <BackIcon />
            <span>{t(notFoundCopy.goBack)}</span>
          </button>
        </div>
      </section>

      <p className={styles.sceneStatus} aria-live="polite">
        <span className={styles.statusDot} aria-hidden="true" />
        {t(sceneState === 'fallback' ? notFoundCopy.fallbackStatus : notFoundCopy.sceneStatus)}
      </p>

      <p className={styles.srOnly}>
        {t(notFoundCopy.accessibilityDescription)}
      </p>
      <audio ref={audioRef} src="/not-found/interstellar-theme.mp3" loop preload="none"
        onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onError={() => setIsPlaying(false)} />
    </main>
  );
}
