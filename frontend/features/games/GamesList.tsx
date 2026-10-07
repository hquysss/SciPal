'use client';

import { useCallback, useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateGameDialog } from './CreateGameDialog';
import { KIND_LABEL, listGames, type Bilingual, type GameCard } from './gamesApi';

type Lists = { publicGames: GameCard[]; classGames: Array<GameCard & { className: string }> };

function GameGrid({ games }: { games: Array<GameCard & { className?: string }> }) {
  const { t } = useLanguage();
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {games.map((g) => (
        <li key={g.id}>
          <a href={`/games/${g.id}`} className="flex min-h-24 gap-3 rounded-xl border border-line bg-surface p-4 transition hover:border-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
            <Gamepad2 aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-action" />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="break-words font-semibold text-ink">{t(g.title)}</span>
              <span className="flex flex-wrap gap-2 text-sm text-ink-muted">
                <Badge>{t(KIND_LABEL[g.kind])}</Badge>
                {g.className && <span>{g.className}</span>}
                {g.timeLimitS && <span>{t({ en: `${Math.ceil(g.timeLimitS / 60)} min`, vi: `${Math.ceil(g.timeLimitS / 60)} phút` })}</span>}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
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
  if (!lists) return <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;

  return (
    <div className="flex flex-col gap-8">
      {lists.classGames.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="class-games">
          <h2 id="class-games" className="text-lg font-bold text-ink">{t({ en: 'From your classes', vi: 'Game của lớp em' })}</h2>
          <GameGrid games={lists.classGames} />
        </section>
      )}
      <section className="flex flex-col gap-3" aria-labelledby="public-games">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="public-games" className="text-lg font-bold text-ink">{t({ en: 'Play solo', vi: 'Chơi một mình' })}</h2>
          {isAdmin && <Button type="button" onClick={() => setOpen(true)}>{t({ en: 'New public game', vi: 'Tạo game công khai' })}</Button>}
        </div>
        {lists.publicGames.length === 0
          ? <EmptyState title={t({ en: 'No games yet', vi: 'Chưa có game nào' })} description={t({ en: 'Check back soon.', vi: 'Quay lại sau nhé.' })} />
          : <GameGrid games={lists.publicGames} />}
      </section>
      {isAdmin && <CreateGameDialog classId={null} open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); void load(); }} />}
    </div>
  );
}
