'use client';

import { useEffect, useRef, useState } from 'react';
import ParticleText from '@/components/ParticleText';
import styles from './hero.module.css';

// Keep in step with .heroTitle in landing.module.css: the particles are sampled at this size.
const TITLE_SIZE = 'clamp(2.1rem, 3.6vw, 3.1rem)';

/**
 * Whether the hero headline is drawn as particles: a mouse-and-keyboard device that has not asked for
 * less motion. Phones and tablets keep the plain headline: a canvas redrawn every frame is what made
 * them stutter, and particle text is hard to read at that size.
 */
export function useParticleTitle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: no-preference)');
    const update = () => setOn(fine.matches && calm.matches);
    update();
    fine.addEventListener('change', update);
    calm.addEventListener('change', update);
    return () => {
      fine.removeEventListener('change', update);
      calm.removeEventListener('change', update);
    };
  }, []);
  return on;
}

/**
 * One particle row per headline line, laid over the real <h1> (which stays in the page, only its ink
 * hidden, so search engines and screen readers still read it). The first line takes the text color,
 * the second the accent; particles light up in the sun color while they move.
 */
export function ParticleLines({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sun, setSun] = useState<string | null>(null);

  // Canvas cannot read var(--sun); a probe element lets the browser turn it into a color value.
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const probe = document.createElement('span');
    probe.style.color = 'var(--sun)';
    host.appendChild(probe);
    setSun(getComputedStyle(probe).color);
    probe.remove();
  }, []);

  return (
    <div ref={ref} className={styles.titleParticles} aria-hidden="true">
      {sun &&
        lines.map((line, index) => (
          <ParticleText
            key={line}
            text={line}
            align="left"
            fontSize={TITLE_SIZE}
            fontWeight={800}
            color="currentColor"
            highlightColor={sun}
            style={index === 0 ? undefined : { color: 'var(--action)' }}
            particleSize={2.6}
            density={3}
            intro="gather"
            scatter={120}
            gatherDuration={1200}
            stagger={300}
            idleDrift={0}
            pointerRepel={36}
            repelRadius={90}
            glow={false}
          />
        ))}
    </div>
  );
}
