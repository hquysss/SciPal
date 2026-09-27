'use client';

import { useEffect, useRef } from 'react';
import type { EducationLevel } from '../educationLevel';
import { HeroIllustration } from './HeroIllustration';
import styles from './hero.module.css';

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * Feeds the pointer position over the hero into --px/--py (-1…1) for the scene's tilt and depth.
 * Only on hover-capable fine pointers without reduced motion; one frame per pointer move, no loop.
 */
function usePointerDepth(stageRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const area = stage.closest('section') ?? stage;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      stage.style.setProperty('--px', x.toFixed(3));
      stage.style.setProperty('--py', y.toFixed(3));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onMove = (event: PointerEvent) => {
      const box = stage.getBoundingClientRect();
      x = clamp(((event.clientX - box.left) / box.width) * 2 - 1);
      y = clamp(((event.clientY - box.top) / box.height) * 2 - 1);
      schedule();
    };
    const onLeave = () => {
      x = 0;
      y = 0;
      schedule();
    };

    area.addEventListener('pointermove', onMove);
    area.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener('pointermove', onMove);
      area.removeEventListener('pointerleave', onLeave);
      stage.style.removeProperty('--px');
      stage.style.removeProperty('--py');
    };
  }, [stageRef]);
}

export function HeroStage({ level }: { level: EducationLevel }) {
  const stageRef = useRef<HTMLDivElement>(null);
  usePointerDepth(stageRef);

  return (
    <div ref={stageRef} className={styles.stage} data-hero-art>
      <HeroIllustration key={level} level={level} />
    </div>
  );
}
