'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Crown, Trophy, UserRound } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@/lib/supabase';
import type { Board, LeaderboardClass, LeaderRow, ProgressSummary } from './progressQueries';
import { WeeklyTrophy } from './WeeklyTrophy';

type Period = 'week' | 'all';
export type Scope = 'friends' | 'class' | 'global';

const PERIODS: Array<{ id: Period; label: { en: string; vi: string } }> = [
  { id: 'week', label: { en: 'This week', vi: 'Tuần này' } },
  { id: 'all', label: { en: 'All time', vi: 'Mọi lúc' } },
];

const SCOPES: Array<{ id: Scope; label: { en: string; vi: string } }> = [
  { id: 'friends', label: { en: 'Friends', vi: 'Bạn bè' } },
  { id: 'class', label: { en: 'Class', vi: 'Lớp' } },
  { id: 'global', label: { en: 'Everyone', vi: 'Toàn hệ thống' } },
];

// Podium places take the level's supporting colors: 1st sun, 2nd sky, 3rd coral.
const PODIUM = [
  { tone: 'var(--sun)', height: 'h-24', order: 'order-2' },
  { tone: 'var(--sky)', height: 'h-16', order: 'order-1' },
  { tone: 'var(--coral)', height: 'h-12', order: 'order-3' },
];

/** Friends when there is one, else a class, else everyone. The friends board always holds the caller. */
export function defaultScope(friends: Board | null | undefined, classes: LeaderboardClass[]): Scope {
  if (friends && friends.all.length > 1) return 'friends';
  if (classes.length > 0) return 'class';
  return 'global';
}

/** A null name is someone who did not choose to be named: "Student #rank", with no initial. */
function useName(row: LeaderRow) {
  const { t } = useLanguage();
  const name = row.display_name?.trim();
  return name ? { name, hidden: false } : { name: t({ en: `Student #${row.rank}`, vi: `Học sinh #${row.rank}` }), hidden: true };
}

function Initial({ name, hidden }: { name: string; hidden: boolean }) {
  return hidden ? <UserRound className="h-1/2 w-1/2 text-ink-muted" /> : <>{name.charAt(0).toUpperCase()}</>;
}

function You() {
  const { t } = useLanguage();
  return <span className="font-normal text-ink-muted"> ({t({ en: 'you', vi: 'bạn' })})</span>;
}

function Podium({ rows, weekly }: { rows: LeaderRow[]; weekly: boolean }) {
  return (
    <ol className="mb-4 grid grid-cols-3 items-end gap-2" aria-label="Top 3">
      {rows.slice(0, 3).map((row, i) => <PodiumPlace key={i} row={row} place={i} weekly={weekly} />)}
    </ol>
  );
}

function PodiumPlace({ row, place, weekly }: { row: LeaderRow; place: number; weekly: boolean }) {
  const { t } = useLanguage();
  const { name, hidden } = useName(row);
  const p = PODIUM[place];
  return (
    <li aria-current={row.is_me ? 'true' : undefined} className={`flex min-w-0 flex-col items-center text-center ${p.order}`}>
      {place === 0 && (weekly ? (
        <span className="mb-1 flex flex-col items-center">
          <WeeklyTrophy size="3rem" />
          <span className="text-xs font-bold text-ink">{t({ en: 'Top of the week', vi: 'Thủ khoa tuần' })}</span>
        </span>
      ) : <Crown aria-hidden="true" className="mb-1 h-5 w-5 text-ink" />)}
      <span
        aria-hidden="true"
        style={{ background: `color-mix(in srgb, ${p.tone} 55%, var(--surface))`, boxShadow: `0 0 0 3px ${p.tone}` }}
        className={`grid place-items-center rounded-full font-extrabold text-ink ${place === 0 ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-base'}`}
      >
        <Initial name={name} hidden={hidden} />
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
  const { name, hidden } = useName(row);
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
        <Initial name={name} hidden={hidden} />
      </span>
      <span className={`min-w-0 flex-1 truncate text-ink ${row.is_me ? 'font-bold' : 'font-medium'}`} title={name}>
        {name}
        {row.is_me && <You />}
      </span>
      <span className="shrink-0 font-bold tabular-nums text-ink">{row.xp.toLocaleString()} XP</span>
    </li>
  );
}

function Note({ children, dashed = false }: { children: React.ReactNode; dashed?: boolean }) {
  return (
    <p role={dashed ? undefined : 'status'} className={`rounded-2xl px-4 py-5 text-sm text-ink-muted ${dashed ? 'border border-dashed border-edge' : 'bg-surface-sunken'}`}>
      {children}
    </p>
  );
}

function Ranking({ rows, period }: { rows: LeaderRow[]; period: Period }) {
  const { t } = useLanguage();
  // Top 10, then the caller's own row when they rank lower.
  const top = rows.slice(0, 10);
  const meBelow = rows.slice(10).find((r) => r.is_me) ?? null;
  return (
    <div className="motion-safe:animate-[page-rise_320ms_cubic-bezier(0.22,1,0.36,1)]">
      <Podium rows={top} weekly={period === 'week'} />
      {(top.length > 3 || meBelow) && (
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
  );
}

type ClassState = Board | 'loading' | 'error';
export type LoadClassBoard = (classId: string) => Promise<Board | null>;

const loadClassBoard: LoadClassBoard = async (classId) => {
  const supabase = createBrowserClient();
  const [week, all] = await Promise.all([
    supabase.rpc('class_leaderboard', { p_class: classId, p_weekly: true }),
    supabase.rpc('class_leaderboard', { p_class: classId, p_weekly: false }),
  ]);
  return week.error || all.error ? null : { week: (week.data ?? []) as LeaderRow[], all: (all.data ?? []) as LeaderRow[] };
};

interface Props {
  board: ProgressSummary['leaderboard'];
  friends?: Board | null;
  classes?: LeaderboardClass[];
  /** Starts on this tab instead of the default (dev showcase). */
  initialScope?: Scope;
  loadClass?: LoadClassBoard;
}

export function Leaderboard({ board, friends = null, classes = [], initialScope, loadClass = loadClassBoard }: Props) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>('week');
  const [scope, setScope] = useState<Scope>(() => initialScope ?? defaultScope(friends, classes));
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [classBoards, setClassBoards] = useState<Record<string, ClassState>>({});
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const classState = classId ? classBoards[classId] : undefined;
  // Results are kept per class, so a late answer for another class is still the right one: no cancelling.
  useEffect(() => {
    if (scope !== 'class' || !classId || classState) return;
    setClassBoards((s) => ({ ...s, [classId]: 'loading' }));
    void loadClass(classId).then((b) => setClassBoards((s) => ({ ...s, [classId]: b ?? 'error' })));
  }, [scope, classId, classState, loadClass]);

  const onTabKey = (event: KeyboardEvent, index: number) => {
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: SCOPES.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const i = (next + SCOPES.length) % SCOPES.length;
    setScope(SCOPES[i]!.id);
    tabs.current[i]?.focus();
  };

  const failed = t({ en: 'The leaderboard could not be loaded. Reload to try again.', vi: 'Chưa tải được bảng xếp hạng. Tải lại trang để thử lại.' });
  const emptyWeek = t({ en: 'No one has earned XP this week yet. Finish a lesson to take first place.', vi: 'Tuần này chưa ai có XP. Hoàn thành một bài để giành hạng nhất.' });
  const emptyAll = t({ en: 'No one has earned XP yet.', vi: 'Chưa ai có XP.' });

  const ranking = (b: Board | null | undefined) => {
    if (!b) return <Note>{failed}</Note>;
    const rows = b[period];
    if (rows.length === 0) return <Note dashed>{period === 'week' ? emptyWeek : emptyAll}</Note>;
    return <Ranking key={`${scope}-${classId}-${period}`} rows={rows} period={period} />;
  };

  const panel = () => {
    if (scope === 'friends') {
      if (friends && friends.all.length <= 1) {
        return (
          <Note dashed>
            {t({ en: 'Add friends to race each other for XP. ', vi: 'Kết bạn để thi đua XP với nhau. ' })}
            <Link href="/community" className="font-semibold text-action underline underline-offset-2">{t({ en: 'Find friends', vi: 'Tìm bạn' })}</Link>
          </Note>
        );
      }
      return ranking(friends);
    }
    if (scope === 'class') {
      if (classes.length === 0) {
        return <Note dashed>{t({ en: 'Join a class to see how your class is doing.', vi: 'Tham gia một lớp để xem thứ hạng trong lớp.' })}</Note>;
      }
      return (
        <>
          {classes.length > 1 ? (
            <label className="mb-4 flex flex-col gap-1 text-sm font-semibold text-ink">
              {t({ en: 'Class', vi: 'Lớp' })}
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="min-h-11 rounded-xl border border-edge bg-surface px-3 text-sm font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          ) : <p className="mb-4 text-sm font-semibold text-ink">{classes[0]!.name}</p>}
          {classState === 'loading' || classState === undefined
            ? <Note>{t({ en: 'Loading the class board…', vi: 'Đang tải bảng của lớp…' })}</Note>
            : ranking(classState === 'error' ? null : classState)}
        </>
      );
    }
    return (
      <>
        <p className="mb-4 text-sm text-ink-muted">
          {t({
            en: 'Only people who chose to show their name are named here; the rest appear as "Student #rank". ',
            vi: 'Chỉ những bạn chọn hiện tên mới có tên ở đây; những bạn khác hiện là "Học sinh #hạng". ',
          })}
          <Link href="/profile" className="font-semibold text-action underline underline-offset-2">{t({ en: 'Your setting', vi: 'Cài đặt của bạn' })}</Link>
        </p>
        {ranking(board)}
      </>
    );
  };

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

      <div role="tablist" aria-label={t({ en: 'Who to compare with', vi: 'So với ai' })} className="mb-3 grid grid-cols-3 gap-1 border-b border-line">
        {SCOPES.map((s, i) => (
          <button
            key={s.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`leaderboard-tab-${s.id}`}
            aria-selected={scope === s.id}
            aria-controls="leaderboard-panel"
            tabIndex={scope === s.id ? 0 : -1}
            onClick={() => setScope(s.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`-mb-px min-h-11 cursor-pointer border-b-2 px-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none ${
              scope === s.id ? 'border-action text-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t(s.label)}
          </button>
        ))}
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

      <div role="tabpanel" id="leaderboard-panel" aria-labelledby={`leaderboard-tab-${scope}`}>
        {panel()}
      </div>
    </section>
  );
}
