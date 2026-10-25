'use client';

import { useEffect, useState } from 'react';
import type { NewBadge } from '@scipal/types';
import { Dialog } from '@/components/ui/dialog';
import { playSfx } from '../../lib/sfx';
import { TIER_TEXT } from './tiers';
import styles from '../lessons/practice.module.css';

type Bilingual = { en: string; vi: string };

/**
 * Unlock moments for badges the server just awarded, one at a time. `badges` only grows during a
 * visit; each badge is shown once. `paused` holds the queue while another moment (level up) is open.
 */
export function BadgeUnlockQueue({ badges, paused = false, fromStart = false, t }: { badges: NewBadge[]; paused?: boolean; fromStart?: boolean; t: (text: Bilingual) => string }) {
  // Badges already there when this mounted (switching parts) were shown before, unless they came
  // with what mounted it (`fromStart`: an exam result).
  const [shownCount, setShownCount] = useState(fromStart ? 0 : badges.length);
  const current = !paused && shownCount < badges.length ? badges[shownCount] : undefined;
  useEffect(() => {
    if (current) playSfx('levelUp');
  }, [current]);
  return (
    <Dialog
      open={!!current}
      onClose={() => setShownCount((n) => n + 1)}
      closeOnBackdrop
      title={t({ en: 'Badge unlocked!', vi: 'Mở khoá huy hiệu!' })}
      closeLabel={t({ en: 'Close', vi: 'Đóng' })}
      className="text-center"
    >
      {current && (
        <div aria-live="assertive" className="flex flex-col items-center gap-2">
          <span aria-hidden="true" className={`${styles.levelBadge} text-6xl`}>{current.icon}</span>
          <p className="text-lg font-bold text-ink">{t({ en: current.name_en, vi: current.name_vi })}</p>
          <p className="text-sm text-ink-muted">{t(TIER_TEXT[current.tier])}</p>
          {badges.length - shownCount > 1 && (
            <p className="text-xs text-ink-muted">{t({ en: `${badges.length - shownCount - 1} more`, vi: `Còn ${badges.length - shownCount - 1} huy hiệu nữa` })}</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
