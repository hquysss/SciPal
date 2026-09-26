import type { ReactNode } from 'react';
import type { EducationLevel } from '../educationLevel';
import { SCENE_OBJECTS } from './sceneObjects';
import styles from './hero.module.css';

/** Flat drawing of the same desk composition as the WebGL scene, colored by theme tokens. */
const LEVEL_ART: Record<EducationLevel, ReactNode> = {
  primary: (
    <>
      <g transform="rotate(-24 70 205)">
        <rect x="30" y="198" width="92" height="12" rx="2" className={styles.nav} />
        <polygon points="30,198 30,210 14,204" className={styles.surface} />
        <polygon points="19,202 19,206 14,204" className={styles.ink} />
      </g>
      <g transform="rotate(-12 330 100)">
        <rect x="286" y="92" width="96" height="18" rx="2" className={styles.surface} />
        <rect x="286" y="106" width="96" height="4" className={styles.action} />
        {[296, 308, 320, 332, 344, 356, 368].map((x) => (
          <rect key={x} x={x} y="92" width="1.5" height="7" className={styles.ink} />
        ))}
      </g>
      <g>
        <rect x="302" y="200" width="60" height="38" rx="3" className={styles.action} />
        <rect x="314" y="184" width="6" height="22" rx="2" className={styles.surface} />
        <rect x="328" y="180" width="6" height="26" rx="2" className={styles.navInk} />
        <rect x="342" y="186" width="6" height="20" rx="2" className={styles.paper} />
      </g>
    </>
  ),
  lower_secondary: (
    <>
      <g>
        <line x1="72" y1="150" x2="50" y2="232" className={styles.strokeInk} />
        <line x1="72" y1="150" x2="96" y2="232" className={styles.strokeInk} />
        <circle cx="72" cy="148" r="7" className={styles.action} />
      </g>
      <g transform="rotate(10 330 110)">
        <polygon points="294,140 366,140 294,74" className={styles.action} />
        <polygon points="306,130 340,130 306,99" className={styles.line} />
      </g>
      <g transform="rotate(-8 330 220)">
        <rect x="304" y="186" width="52" height="68" rx="5" className={styles.ink} />
        <rect x="312" y="194" width="36" height="12" rx="2" className={styles.surface} />
        {[0, 1, 2].flatMap((row) =>
          [0, 1, 2].map((col) => (
            <rect key={`${row}-${col}`} x={313 + col * 12} y={214 + row * 12} width="9" height="8" rx="1.5" className={styles.nav} />
          )),
        )}
      </g>
    </>
  ),
  upper_secondary: (
    <>
      <g>
        <polygon points="52,236 100,236 84,190 68,190" className={styles.nav} />
        <rect x="68" y="160" width="16" height="32" className={styles.surface} />
        <rect x="64" y="156" width="24" height="6" rx="2" className={styles.surface} />
      </g>
      <g transform="rotate(-20 320 105)">
        <circle cx="316" cy="104" r="22" className={styles.surface} />
        <circle cx="316" cy="104" r="22" className={styles.strokeInkThick} />
        <rect x="338" y="100" width="40" height="8" rx="3" className={styles.action} />
      </g>
      <g transform="rotate(-10 330 220)">
        <rect x="278" y="200" width="104" height="40" rx="5" className={styles.ink} />
        {[208, 218, 228].map((y) => (
          <rect key={y} x="286" y={y} width="88" height="6" rx="1.5" className={styles.surface} />
        ))}
      </g>
    </>
  ),
};

export function HeroFallback({ level }: { level: EducationLevel }) {
  return (
    <svg
      className={styles.fallback}
      viewBox="0 0 400 300"
      aria-hidden="true"
      focusable="false"
      data-level-objects={SCENE_OBJECTS[level].map((object) => object.id).join(' ')}
    >
      <polygon points="36,56 364,56 400,292 0,292" className={styles.line} />
      <polygon points="118,98 282,98 300,226 100,226" className={styles.nav} />
      <polygon points="124,102 198,108 198,220 108,220" className={styles.surface} />
      <polygon points="202,108 276,102 292,220 202,220" className={styles.surface} />
      {[128, 146, 164, 182, 200].map((y) => (
        <g key={y}>
          <line x1="124" y1={y} x2="190" y2={y} className={styles.strokeLine} />
          <line x1="210" y1={y} x2="278" y2={y} className={styles.strokeLine} />
        </g>
      ))}
      <circle cx="250" cy="130" r="9" className={styles.action} />
      {LEVEL_ART[level]}
    </svg>
  );
}
