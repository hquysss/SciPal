'use client';

import Link from 'next/link';

import { useCallback, useEffect, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateGameDialog } from './CreateGameDialog';
import { deleteGame, KIND_LABEL, listClassGames, type Bilingual, type GameCard } from './gamesApi';

type Item = GameCard & { playerCount: number };

/** A teacher's games for one class, with how many students played each. */
export function ClassGames({ classId }: { classId: string }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const result = await listClassGames(classId);
    if (result.ok) { setItems(result.data.games); setError(null); }
    else setError(result.error);
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  const remove = async (item: Item) => {
    if (!window.confirm(t({ en: `Delete “${item.title.en}” and its scores?`, vi: `Xóa “${item.title.vi}” và điểm của game?` }))) return;
    const result = await deleteGame(item.id);
    if (result.ok) void load();
    else setError(result.error);
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="games-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="games-heading" className="text-base font-semibold text-ink">{t({ en: 'Games', vi: 'Game' })}</h2>
        <Button type="button" onClick={() => setOpen(true)}>{t({ en: 'New game', vi: 'Tạo game' })}</Button>
      </div>
      {error && <Alert tone="danger">{t(error)}</Alert>}
      {items === null && !error && <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>}
      {items?.length === 0 && (
        <EmptyState
          title={t({ en: 'No games yet', vi: 'Chưa có game nào' })}
          description={t({ en: 'Make a quiz, a term match or embed a Wordwall; students get a notification and an email.', vi: 'Tạo game đố vui, ghép thuật ngữ hoặc nhúng Wordwall; học sinh sẽ nhận thông báo và email.' })}
        />
      )}
      {items && items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <Gamepad2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
                <div className="flex min-w-0 flex-col gap-1">
                  <Link prefetch={false} href={`/games/${item.id}`} className="break-words font-semibold text-ink underline-offset-4 hover:underline">{t(item.title)}</Link>
                  <span className="text-sm text-ink-muted">{t(KIND_LABEL[item.kind])}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 self-start sm:self-auto">
                <span className="text-sm font-semibold tabular-nums text-ink">{t({ en: `${item.playerCount} played`, vi: `${item.playerCount} em đã chơi` })}</span>
                <Button type="button" variant="ghost" onClick={() => void remove(item)}>{t({ en: 'Delete', vi: 'Xóa' })}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <CreateGameDialog classId={classId} open={open} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); void load(); }} />
    </section>
  );
}
