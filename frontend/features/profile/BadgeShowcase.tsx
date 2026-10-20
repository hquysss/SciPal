'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { getBadges, type CommunityBadge } from './profileApi';

/** The badge shelf of a profile: earned badges in colour, the rest dimmed with how to earn them. */
export function BadgeShowcase({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [badges, setBadges] = useState<CommunityBadge[] | null>(null);

  useEffect(() => {
    let live = true;
    void getBadges(userId).then((result) => {
      if (live && result.ok) setBadges(result.data.badges);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  if (!badges || badges.length === 0) return null;
  const earned = badges.filter((b) => b.unlocked).length;

  return (
    <section aria-labelledby="badge-shelf" className="flex flex-col gap-2">
      <h2 id="badge-shelf" className="text-sm font-bold text-ink">
        {t({ en: 'Badges', vi: 'Danh hiệu' })} <span className="font-normal text-ink-muted">{earned}/{badges.length}</span>
      </h2>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {badges.map((b) => {
          const name = t({ en: b.name_en, vi: b.name_vi });
          return (
            <li
              key={b.id}
              className={`flex items-start gap-2 rounded-xl border p-2.5 ${b.unlocked ? 'border-edge bg-surface' : 'border-line bg-surface-sunken opacity-60'}`}
            >
              <span aria-hidden="true" className={`text-2xl ${b.unlocked ? '' : 'grayscale'}`}>{b.icon}</span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-ink">{name}</span>
                <span className="text-xs text-ink-muted">{b.unlocked && b.reason ? b.reason : t({ en: b.description_en, vi: b.description_vi })}</span>
                <span className="sr-only">{b.unlocked ? t({ en: 'Earned', vi: 'Đã đạt' }) : t({ en: 'Not earned yet', vi: 'Chưa đạt' })}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
