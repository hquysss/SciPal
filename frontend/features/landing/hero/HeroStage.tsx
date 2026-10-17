'use client';

import { useEffect, useRef } from 'react';
import type { EducationLevel } from '../educationLevel';
import { HeroCards } from './HeroCards';
import styles from './hero.module.css';

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * Feeds the pointer position over the hero into --px/--py (-1…1) on the hero section, for the
 * cards' tilt and depth and the hero's pointer glow. Only on hover-capable fine pointers without
 * reduced motion; one frame per pointer move, no loop.
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
      area.style.setProperty('--px', x.toFixed(3));
      area.style.setProperty('--py', y.toFixed(3));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onMove = (event: PointerEvent) => {
      const box = area.getBoundingClientRect();
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
      area.style.removeProperty('--px');
      area.style.removeProperty('--py');
    };
  }, [stageRef]);
}

export function HeroStage({ level }: { level: EducationLevel }) {
  const stageRef = useRef<HTMLDivElement>(null);
  usePointerDepth(stageRef);

  return (
    <div ref={stageRef} className={styles.stage} data-hero-art>
      <HeroCards key={level} level={level} />
    </div>
  );
}
