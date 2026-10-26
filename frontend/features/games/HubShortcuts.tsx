'use client';

import { useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import Link from 'next/link';
import { Award, Swords, Trophy } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { getChallenges } from '@/features/challenges/challengesApi';
import { getBadges } from '@/features/profile/profileApi';
import styles from './games.module.css';

type Bilingual = { en: string; vi: string };
export type HubCounts = { challenges: number | null; badges: { earned: number; total: number } | null };

function Tile({ href, icon: Icon, tone, title, sub }: { href: string; icon: ComponentType<{ className?: string }>; tone: string; title: string; sub: string }) {
  return (
    <Link prefetch={false} href={href} style={{ '--tone': tone } as CSSProperties} className={`${styles.tile} focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus`}>
      <span aria-hidden="true" className={styles.tileIcon}><Icon className="h-5 w-5" /></span>
      <span className="flex min-w-0 flex-col">
        <span className="font-bold text-ink">{title}</span>
        <span className="text-sm text-ink-muted">{sub}</span>
      </span>
    </Link>
  );
}

/** Three doors to the competitive parts that live on the progress page. Counts are left out when they cannot be read. */
export function HubShortcutsView({ counts }: { counts: HubCounts }) {
  const { t } = useLanguage();
  const sub = (count: Bilingual | null, fallback: Bilingual) => t(count ?? fallback);
  return (
    <nav aria-label={t({ en: 'Compete', vi: 'Thi đua' })} className="grid gap-3 sm:grid-cols-3">
      <Tile
        href="/progress#challenges"
        icon={Swords}
        tone="var(--coral)"
        title={t({ en: 'Weekly challenges', vi: 'Thử thách tuần' })}
        sub={sub(counts.challenges ? { en: `${counts.challenges} in play`, vi: `${counts.challenges} đang diễn ra` } : null, { en: 'Challenge a friend', vi: 'Thách đấu một bạn' })}
      />
      <Tile href="/progress#leaderboard" icon={Trophy} tone="var(--sun)" title={t({ en: 'Leaderboard', vi: 'Bảng xếp hạng' })} sub={t({ en: 'Friends, class, everyone', vi: 'Bạn bè, lớp, toàn hệ thống' })} />
      <Tile
        href="/progress#badges"
        icon={Award}
        tone="var(--sky)"
        title={t({ en: 'Badges', vi: 'Huy hiệu' })}
        sub={sub(counts.badges ? { en: `${counts.badges.earned}/${counts.badges.total} unlocked`, vi: `Đã mở ${counts.badges.earned}/${counts.badges.total}` } : null, { en: 'Your collection', vi: 'Bộ sưu tập của em' })}
      />
    </nav>
  );
}

export function HubShortcuts() {
  const [counts, setCounts] = useState<HubCounts>({ challenges: null, badges: null });
  useEffect(() => {
    let alive = true;
    void getChallenges().then((list) => {
      if (alive && list) setCounts((c) => ({ ...c, challenges: list.challenges.filter((x) => x.status !== 'done').length }));
    });
    void getBadges('me').then((result) => {
      if (alive && result.ok) setCounts((c) => ({ ...c, badges: { earned: result.data.badges.filter((b) => b.unlocked).length, total: result.data.badges.length } }));
    });
    return () => {
      alive = false;
    };
  }, []);
  return <HubShortcutsView counts={counts} />;
}
