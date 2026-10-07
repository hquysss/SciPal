import type { Metadata } from 'next';
import { GamePlayer } from '@/features/games/GamePlayer';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Game', 'Game') };

export const dynamic = 'force-dynamic';

export default async function GameRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <PageBreadcrumb items={[{ href: '/', label: { en: 'Home', vi: 'Trang chủ' } }, { href: '/games', label: { en: 'Games', vi: 'Game' } }, { label: { en: 'Play', vi: 'Chơi' } }]} />
      <GamePlayer id={id} />
    </main>
  );
}
