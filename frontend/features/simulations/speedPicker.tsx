'use client';

import { pick, type Lang } from './types';

export const SPEED_NAMES = {
  slow: { en: 'Slow', vi: 'Chậm' },
  medium: { en: 'Medium', vi: 'Vừa' },
  fast: { en: 'Fast', vi: 'Nhanh' },
} as const;
export type Speed = keyof typeof SPEED_NAMES;
const SPEEDS = Object.keys(SPEED_NAMES) as Speed[];

/** The Slow / Medium / Fast switch the algorithm and complexity simulations share. */
export function SpeedPicker({ speed, onChange, lang }: { speed: Speed; onChange: (speed: Speed) => void; lang: Lang }) {
  const t = pick(lang);
  return (
    <div role="group" aria-label={t({ en: 'Speed', vi: 'Tốc độ' })} className="ml-auto inline-flex rounded-lg border border-line p-0.5 text-xs">
      {SPEEDS.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={speed === s}
          onClick={() => onChange(s)}
          className={`min-h-9 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            speed === s ? 'bg-[color-mix(in_oklch,var(--accent,var(--action))_16%,transparent)] text-ink' : 'text-ink-muted hover:bg-surface-sunken'
          }`}
        >
          {t(SPEED_NAMES[s])}
        </button>
      ))}
    </div>
  );
}
