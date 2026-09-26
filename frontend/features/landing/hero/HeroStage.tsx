'use client';

import dynamic from 'next/dynamic';
import { useEffect, useReducer, useRef } from 'react';
import type { EducationLevel } from '../educationLevel';
import { canRunHeroScene, readSceneEnv } from './canRunHeroScene';
import { HeroFallback } from './HeroFallback';
import { HeroSceneBoundary } from './HeroSceneBoundary';
import { heroStageReducer } from './heroStageState';
import styles from './hero.module.css';

// three.js lives only in this chunk, requested after the page is idle and the hero is on screen.
const HeroScene = dynamic(() => import('./HeroScene').then((module) => module.HeroScene), { ssr: false });

function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(run, 200);
  return () => clearTimeout(id);
}

export function HeroStage({ level }: { level: EducationLevel }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(heroStageReducer, 'fallback');

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let cancelIdle = () => {};
    const begin = () => {
      cancelIdle = whenIdle(() => {
        if (canRunHeroScene(readSceneEnv(window))) dispatch('start');
      });
    };

    if (!('IntersectionObserver' in window)) {
      begin();
      return () => cancelIdle();
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      begin();
    });
    observer.observe(stage);
    return () => {
      observer.disconnect();
      cancelIdle();
    };
  }, []);

  const running = state === 'loading' || state === 'ready';

  return (
    <div ref={stageRef} className={styles.stage} data-hero-state={state}>
      <HeroFallback level={level} />
      {running && (
        <HeroSceneBoundary onError={() => dispatch('fail')}>
          <HeroScene
            key={level}
            level={level}
            onFirstFrame={() => dispatch('first-frame')}
            onFailure={() => dispatch('fail')}
          />
        </HeroSceneBoundary>
      )}
    </div>
  );
}
