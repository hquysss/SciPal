'use client';

import { useState } from 'react';
import { Crown, Trophy } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { LeaderRow, ProgressSummary } from './progressQueries';

type Period = 'week' | 'all';

const PERIODS: Array<{ id: Period; label: { en: string; vi: string } }> = [
  { id: 'week', label: { en: 'This week', vi: 'Tuần này' } },
  { id: 'all', label: { en: 'All time', vi: 'Mọi lúc' } },
];

// Podium places take the level's supporting colors: 1st sun, 2nd sky, 3rd coral.
const PODIUM = [
  { tone: 'var(--sun)', height: 'h-24', order: 'order-2' },
  { tone: 'var(--sky)', height: 'h-16', order: 'order-1' },
  { tone: 'var(--coral)', height: 'h-12', order: 'order-3' },
];

function useName(row: LeaderRow) {
  const { t } = useLanguage();
  return row.display_name?.trim() || t({ en: 'Student', vi: 'Học sinh' });
}

function You() {
  const { t } = useLanguage();
  return <span className="font-normal text-ink-muted"> ({t({ en: 'you', vi: 'bạn' })})</span>;
}

function Podium({ rows }: { rows: LeaderRow[] }) {
  return (
    <ol className="mb-4 grid grid-cols-3 items-end gap-2" aria-label="Top 3">
      {rows.slice(0, 3).map((row, i) => <PodiumPlace key={i} row={row} place={i} />)}
    </ol>
  );
}

function PodiumPlace({ row, place }: { row: LeaderRow; place: number }) {
  const { t } = useLanguage();
  const name = useName(row);
  const p = PODIUM[place];
  return (
    <li aria-current={row.is_me ? 'true' : undefined} className={`flex min-w-0 flex-col items-center text-center ${p.order}`}>
      {place === 0 && <Crown aria-hidden="true" className="mb-1 h-5 w-5 text-ink" />}
      <span
        aria-hidden="true"
        style={{ background: `color-mix(in srgb, ${p.tone} 55%, var(--surface))`, boxShadow: `0 0 0 3px ${p.tone}` }}
        className={`grid place-items-center rounded-full font-extrabold text-ink ${place === 0 ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-base'}`}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span className={`mt-2 w-full truncate text-sm text-ink ${row.is_me ? 'font-bold' : 'font-semibold'}`} title={name}>
        {name}
        {row.is_me && <You />}
      </span>
      <span className="text-sm font-bold tabular-nums text-ink-muted">{row.xp.toLocaleString()} XP</span>
      <span
        style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${p.tone} 70%, var(--surface)), color-mix(in srgb, ${p.tone} 20%, var(--surface)))` }}
        className={`mt-2 grid w-full place-items-start justify-center rounded-t-xl pt-1.5 text-lg font-extrabold tabular-nums text-ink ${p.height}`}
        aria-label={t({ en: `Rank ${row.rank}`, vi: `Hạng ${row.rank}` })}
      >
        {row.rank}
      </span>
    </li>
  );
}

function Row({ row }: { row: LeaderRow }) {
  const { t } = useLanguage();
  const name = useName(row);
  return (
    <li
      aria-current={row.is_me ? 'true' : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none ${
        row.is_me ? 'bg-[color-mix(in_srgb,var(--sun)_22%,var(--surface))] outline outline-1 outline-sun' : 'hover:bg-surface-sunken'
      }`}
    >
      <span aria-label={t({ en: `Rank ${row.rank}`, vi: `Hạng ${row.rank}` })} className="w-7 shrink-0 text-center font-bold tabular-nums text-ink-muted">
        {row.rank}
      </span>
      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-sunken text-sm font-bold text-ink">
        {name.charAt(0).toUpperCase()}
      </span>
      <span className={`min-w-0 flex-1 truncate text-ink ${row.is_me ? 'font-bold' : 'font-medium'}`} title={name}>
        {name}
        {row.is_me && <You />}
      </span>
      <span className="shrink-0 font-bold tabular-nums text-ink">{row.xp.toLocaleString()} XP</span>
    </li>
  );
}

export function Leaderboard({ board }: { board: ProgressSummary['leaderboard'] }) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>('week');
  const rows = board?.[period] ?? [];
  // The server sends the top 10, then the caller's own row when they rank lower.
  const top = rows.slice(0, 10);
  const meBelow = rows.length > 10 ? rows[rows.length - 1] : null;

  return (
    <section aria-labelledby="leaderboard-title" className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sun to-coral text-ink">
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <h2 id="leaderboard-title" className="text-lg font-bold text-ink">{t({ en: 'Leaderboard', vi: 'Bảng xếp hạng' })}</h2>
          <p className="text-sm text-ink-muted">{t({ en: 'Ranked by XP earned', vi: 'Xếp theo XP tích lũy' })}</p>
        </div>
      </div>

      <div role="group" aria-label={t({ en: 'Period', vi: 'Khoảng thời gian' })} className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-sunken p-1">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={`min-h-10 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none ${
              period === p.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t(p.label)}
          </button>
        ))}
      </div>

      {!board ? (
        <p role="status" className="rounded-2xl bg-surface-sunken px-4 py-5 text-sm text-ink-muted">
          {t({ en: 'The leaderboard could not be loaded. Reload to try again.', vi: 'Chưa tải được bảng xếp hạng. Tải lại trang để thử lại.' })}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-edge px-4 py-5 text-sm text-ink-muted">
          {period === 'week'
            ? t({ en: 'No one has earned XP this week yet. Finish a lesson to take first place.', vi: 'Tuần này chưa ai có XP. Hoàn thành một bài để giành hạng nhất.' })
            : t({ en: 'No one has earned XP yet.', vi: 'Chưa ai có XP.' })}
        </p>
      ) : (
        <div key={period} className="motion-safe:animate-[page-rise_320ms_cubic-bezier(0.22,1,0.36,1)]">
          <Podium rows={top} />
          {top.length > 3 && (
            <ol start={4} className="flex flex-col gap-0.5 border-t border-line pt-3">
              {top.slice(3).map((r, i) => <Row key={i} row={r} />)}
              {meBelow && (
                <>
                  <li aria-hidden="true" className="py-1 text-center text-sm leading-none text-ink-muted">⋯</li>
                  <Row row={meBelow} />
                </>
              )}
            </ol>
          )}
          {!rows.some((r) => r.is_me) && (
            <p className="mt-3 text-sm text-ink-muted">{t({ en: 'Earn XP to appear on the board.', vi: 'Tích XP để có tên trên bảng.' })}</p>
          )}
        </div>
      )}
    </section>
  );
}
