'use client';

import { useEffect, useRef } from 'react';
import type { EducationLevel } from '../educationLevel';
import { createHeroScene } from './createHeroScene';
import { readSceneColors } from './readSceneColors';
import styles from './hero.module.css';

interface HeroSceneProps {
  level: EducationLevel;
  onFirstFrame: () => void;
  onFailure: () => void;
}

/** Owns one canvas for one level; the parent keys it by level so a level change gets a fresh context. */
export function HeroScene({ level, onFirstFrame, onFailure }: HeroSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onFirstFrame, onFailure });
  callbacks.current = { onFirstFrame, onFailure };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = createHeroScene(canvas, {
      level,
      colors: readSceneColors(getComputedStyle(canvas)),
      onFirstFrame: () => callbacks.current.onFirstFrame(),
      onFailure: () => callbacks.current.onFailure(),
    });

    let visible = true;
    const update = () => scene.setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', update);
    update();

    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const onPointerMove = (event: PointerEvent) => {
      scene.setPointer((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
    };
    if (finePointer) window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      if (finePointer) window.removeEventListener('pointermove', onPointerMove);
      scene.dispose();
    };
  }, [level]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
