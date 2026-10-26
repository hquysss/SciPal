import type { Metadata } from 'next';
import { Bi } from '@/components/ui/bilingual';
import { GamesList } from '@/features/games/GamesList';
import { HubShortcuts } from '@/features/games/HubShortcuts';
import { PlayerHero } from '@/features/games/PlayerHero';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Gamification', 'Gamification') };

export const dynamic = 'force-dynamic';

// Signed-in only: the middleware sends visitors to the login page.
export default function GamesRoute() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          <Bi en="Play & level up" vi="Chơi và lên cấp" />
        </h1>
        <p className="max-w-prose text-sm text-ink-muted sm:text-base">
          <Bi en="Games from your classes and games anyone can play." vi="Game thầy cô tạo cho lớp em và game ai cũng chơi được." />
        </p>
      </header>
      <PlayerHero />
      <HubShortcuts />
      <GamesList />
    </main>
  );
}
