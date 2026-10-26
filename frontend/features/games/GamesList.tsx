'use client';

import Link from 'next/link';

import { useCallback, useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { ArrowRight, Clock, Gamepad2, Grid3x3, Lightbulb, Shuffle, Sparkles, Users } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CreateGameDialog } from './CreateGameDialog';
import { KIND_LABEL, listGames, type Bilingual, type GameCard, type GameKind } from './gamesApi';
import styles from './games.module.css';

type Lists = { publicGames: GameCard[]; classGames: Array<GameCard & { className: string }> };
type Filter = GameKind | 'all';

/** Each kind's tone, icon and card backdrop. */
export const KIND_STYLE: Record<GameKind, { tone: string; icon: ComponentType<{ className?: string }> }> = {
  quiz: { tone: 'var(--sun)', icon: Lightbulb },
  match: { tone: 'var(--sky)', icon: Shuffle },
  crossword: { tone: 'var(--coral)', icon: Grid3x3 },
  wordwall: { tone: 'var(--success)', icon: Sparkles },
};
const KIND_ORDER: GameKind[] = ['quiz', 'match', 'crossword', 'wordwall'];

function GameTile({ game }: { game: GameCard & { className?: string } }) {
  const { t } = useLanguage();
  const { tone, icon: Icon } = KIND_STYLE[game.kind];
  return (
    <li>
      <Link
        prefetch={false}
        href={`/games/${game.id}`}
        style={{ '--tone': tone } as CSSProperties}
        className={`${styles.card} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
      >
        <div aria-hidden="true" className={`${styles.art} ${styles[game.kind]}`}>
          <span className={styles.artIcon}><Icon className="h-7 w-7" /></span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <span className="self-start rounded-full bg-[color-mix(in_srgb,var(--tone)_22%,var(--surface))] px-2.5 py-0.5 text-xs font-bold text-ink">{t(KIND_LABEL[game.kind])}</span>
          <span className="break-words text-base font-bold leading-snug text-ink">{t(game.title)}</span>
          <span className="mt-auto flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
              {game.className && <span className="inline-flex items-center gap-1"><Users aria-hidden="true" className="h-3.5 w-3.5" />{game.className}</span>}
              {game.timeLimitS && (
                <span className="inline-flex items-center gap-1">
                  <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                  {t({ en: `${Math.ceil(game.timeLimitS / 60)} min`, vi: `${Math.ceil(game.timeLimitS / 60)} phút` })}
                </span>
              )}
            </span>
            <span className={styles.play} aria-hidden="true">
              {t({ en: 'Play', vi: 'Chơi' })}
              <ArrowRight className="h-4 w-4" />
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}

function GameGrid({ games }: { games: Array<GameCard & { className?: string }> }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((g) => <GameTile key={g.id} game={g} />)}
    </ul>
  );
}

function NoGames({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-edge bg-surface px-6 py-10 text-center">
      <div aria-hidden="true" className="flex -space-x-3">
        {KIND_ORDER.map((kind, i) => {
          const { tone, icon: Icon } = KIND_STYLE[kind];
          return (
            <span key={kind} style={{ '--tone': tone, rotate: `${(i - 1.5) * 8}deg` } as CSSProperties} className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-surface bg-[color-mix(in_srgb,var(--tone)_35%,var(--surface))] text-ink">
              <Icon className="h-6 w-6" />
            </span>
          );
        })}
      </div>
      <div>
        <p className="text-lg font-bold text-ink">{t({ en: 'No games here yet', vi: 'Chưa có game nào ở đây' })}</p>
        <p className="mt-1 max-w-sm text-sm text-ink-muted">
          {canCreate
            ? t({ en: 'Make a crossword or a quiz from a lesson in a few clicks.', vi: 'Tạo ô chữ hoặc đố vui từ một bài học chỉ với vài cú bấm.' })
            : t({ en: 'Your teachers will add games soon. Check back later.', vi: 'Thầy cô sẽ sớm thêm game. Quay lại sau nhé.' })}
        </p>
      </div>
      {canCreate && <Button type="button" onClick={onCreate}>{t({ en: 'Create a game', vi: 'Tạo game' })}</Button>}
    </div>
  );
}

/** Kind filter chips: only kinds that have a game show up. */
function KindFilter({ kinds, value, onChange }: { kinds: GameKind[]; value: Filter; onChange: (f: Filter) => void }) {
  const { t } = useLanguage();
  if (kinds.length < 2) return null;
  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${
      active ? 'border-transparent bg-ink text-surface' : 'border-line bg-surface text-ink hover:bg-surface-sunken'
    }`;
  return (
    <div role="group" aria-label={t({ en: 'Game type', vi: 'Loại game' })} className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={value === 'all'} onClick={() => onChange('all')} className={chip(value === 'all')}>
        <Gamepad2 aria-hidden="true" className="h-4 w-4" />
        {t({ en: 'All', vi: 'Tất cả' })}
      </button>
      {kinds.map((kind) => {
        const Icon = KIND_STYLE[kind].icon;
        return (
          <button key={kind} type="button" aria-pressed={value === kind} onClick={() => onChange(kind)} className={chip(value === kind)}>
            <Icon aria-hidden="true" className="h-4 w-4" />
            {t(KIND_LABEL[kind])}
          </button>
        );
      })}
    </div>
  );
}

export function GamesListView({ lists, isAdmin, onCreate }: { lists: Lists; isAdmin: boolean; onCreate: () => void }) {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<Filter>('all');
  const present = new Set([...lists.classGames, ...lists.publicGames].map((g) => g.kind));
  const kinds = KIND_ORDER.filter((k) => present.has(k));
  const pick = <G extends GameCard>(games: G[]) => (filter === 'all' ? games : games.filter((g) => g.kind === filter));
  const classGames = pick(lists.classGames);
  const publicGames = pick(lists.publicGames);

  return (
    <div className="flex flex-col gap-8">
      <KindFilter kinds={kinds} value={filter} onChange={setFilter} />
      {classGames.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="class-games">
          <h2 id="class-games" className="text-xl font-extrabold tracking-tight text-ink">{t({ en: 'From your classes', vi: 'Game của lớp em' })}</h2>
          <GameGrid games={classGames} />
        </section>
      )}
      <section className="flex flex-col gap-3" aria-labelledby="public-games">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="public-games" className="text-xl font-extrabold tracking-tight text-ink">{t({ en: 'Play solo', vi: 'Chơi một mình' })}</h2>
          {isAdmin && publicGames.length > 0 && <Button type="button" variant="outline" onClick={onCreate}>{t({ en: 'New public game', vi: 'Tạo game công khai' })}</Button>}
        </div>
        {publicGames.length === 0 ? <NoGames canCreate={isAdmin} onCreate={onCreate} /> : <GameGrid games={publicGames} />}
      </section>
    </div>
  );
}

export function GamesList() {
  const { t } = useLanguage();
  const [lists, setLists] = useState<Lists | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const result = await listGames();
    if (result.ok) setLists(result.data);
    else setError(result.error);
  }, []);

  useEffect(() => {
    void load();
    void createBrowserClient().auth.getSession().then(({ data }) => setIsAdmin(data.session?.user.app_metadata?.app_role === 'admin'));
  }, [load]);

  if (error) return <Alert tone="danger">{t(error)}</Alert>;
  if (!lists) {
    return (
      <ul role="status" aria-label={t({ en: 'Loading…', vi: 'Đang tải…' })} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <li key={i} className="h-56 animate-pulse rounded-[1.25rem] bg-surface-sunken motion-reduce:animate-none" />)}
      </ul>
    );
  }

  return (
    <>
      <GamesListView lists={lists} isAdmin={isAdmin} onCreate={() => setOpen(true)} />
      {isAdmin && <CreateGameDialog classId={null} open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); void load(); }} />}
    </>
  );
}
