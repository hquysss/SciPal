'use client';

import { useEffect, useId, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { CATEGORY_TEXT } from '../badges/tiers';
import { getBadges, type CommunityBadge } from './profileApi';

type Filter = 'all' | 'earned' | 'locked';
const FILTERS: Array<{ id: Filter; label: { en: string; vi: string } }> = [
  { id: 'all', label: { en: 'All', vi: 'Tất cả' } },
  { id: 'earned', label: { en: 'Earned', vi: 'Đã mở' } },
  { id: 'locked', label: { en: 'Not yet', vi: 'Chưa mở' } },
];
const CATEGORY_ORDER = ['learning', 'streak', 'exam', 'excellence', 'community', 'honor'];

/** Badges grouped by category in catalogue order, categories with none left out. */
export function groupBadges(badges: CommunityBadge[]): Array<[string, CommunityBadge[]]> {
  const groups = new Map<string, CommunityBadge[]>();
  for (const b of badges) groups.set(b.category, [...(groups.get(b.category) ?? []), b]);
  const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b));
}

/**
 * The badge collection of a profile, all from the server: earned badges in colour with their date,
 * the rest dimmed with how to earn them and, on your own list, how far you are.
 */
export function BadgeShowcase({ userId, className = '' }: { userId: string; className?: string }) {
  const { t, lang } = useLanguage();
  const headingId = useId();
  const [badges, setBadges] = useState<CommunityBadge[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

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
  const shown = badges.filter((b) => filter === 'all' || (filter === 'earned') === b.unlocked);
  const date = (iso: string) => new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <section aria-labelledby={headingId} className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-sm font-bold text-ink">
          {t({ en: 'Badges', vi: 'Danh hiệu' })} <span className="font-normal text-ink-muted">{earned}/{badges.length}</span>
        </h2>
        <div role="radiogroup" aria-label={t({ en: 'Show badges', vi: 'Lọc huy hiệu' })} className="inline-flex rounded-lg bg-surface-sunken p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-11 rounded-md px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${filter === f.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 && <p className="text-sm text-ink-muted">{t({ en: 'No badges here yet.', vi: 'Chưa có huy hiệu nào ở đây.' })}</p>}
      {groupBadges(shown).map(([category, list]) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t(CATEGORY_TEXT[category] ?? { en: category, vi: category })}</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => {
              const name = t({ en: b.name_en, vi: b.name_vi });
              const progress = !b.unlocked ? b.progress : null;
              return (
                <li
                  key={b.id}
                  className={`flex items-start gap-2 rounded-xl border p-2.5 ${b.unlocked ? 'border-edge bg-surface' : 'border-line bg-surface-sunken'}`}
                >
                  <span aria-hidden="true" className={`text-2xl ${b.unlocked ? '' : 'opacity-60 grayscale'}`}>{b.icon}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-sm font-semibold ${b.unlocked ? 'text-ink' : 'text-ink-muted'}`}>{name}</span>
                    <span className="text-xs text-ink-muted">{b.unlocked && b.reason ? b.reason : t({ en: b.description_en, vi: b.description_vi })}</span>
                    {b.unlocked && b.earned_at && <span className="text-xs text-ink-muted">{t({ en: `Earned ${date(b.earned_at)}`, vi: `Đạt ngày ${date(b.earned_at)}` })}</span>}
                    {progress && (
                      <span className="mt-1 flex items-center gap-2">
                        <span
                          role="progressbar"
                          aria-label={t({ en: `Progress to ${b.name_en}`, vi: `Tiến độ tới ${b.name_vi}` })}
                          aria-valuemin={0}
                          aria-valuemax={progress.target}
                          aria-valuenow={progress.current}
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface"
                        >
                          <span className="block h-full rounded-full bg-action" style={{ width: `${(progress.current / progress.target) * 100}%` }} />
                        </span>
                        <span className="text-xs tabular-nums text-ink-muted">{progress.current}/{progress.target}</span>
                      </span>
                    )}
                    <span className="sr-only">{b.unlocked ? t({ en: 'Earned', vi: 'Đã đạt' }) : t({ en: 'Not earned yet', vi: 'Chưa đạt' })}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
