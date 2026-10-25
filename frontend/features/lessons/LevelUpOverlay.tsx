'use client';

import { useEffect, useId } from 'react';
import { xpForLevel } from '@scipal/types';
import { Dialog } from '@/components/ui/dialog';
import styles from './practice.module.css';

type Bilingual = { en: string; vi: string };

/** Shown once when this visit's server XP crosses into a new level; closes itself after 2.5 s. */
export function LevelUpOverlay({ level, onClose, t }: { level: number | null; onClose: () => void; t: (text: Bilingual) => string }) {
  const descId = useId();
  useEffect(() => {
    if (level === null) return;
    const timer = window.setTimeout(onClose, 2500);
    return () => window.clearTimeout(timer);
  }, [level, onClose]);
  return (
    <Dialog
      open={level !== null}
      onClose={onClose}
      closeOnBackdrop
      title={t({ en: 'Level up!', vi: 'Lên cấp!' })}
      closeLabel={t({ en: 'Close', vi: 'Đóng' })}
      descriptionId={descId}
      className="text-center"
    >
      <p aria-live="assertive" className={`${styles.levelBadge} mx-auto flex size-24 items-center justify-center rounded-full border-4 border-accent bg-surface-sunken text-4xl font-bold tabular-nums text-ink`}>
        {level}
      </p>
      <p id={descId} className="mt-4 text-ink">
        {level !== null && t({
          en: `You reached level ${level}. Next level at ${xpForLevel(level + 1)} XP.`,
          vi: `Bạn đã lên cấp ${level}. Cấp sau ở mốc ${xpForLevel(level + 1)} XP.`,
        })}
      </p>
    </Dialog>
  );
}
