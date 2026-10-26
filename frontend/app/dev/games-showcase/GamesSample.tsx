'use client';

import { GamesListView } from '@/features/games/GamesList';
import { HubShortcutsView } from '@/features/games/HubShortcuts';
import { PlayerHeroView } from '@/features/games/PlayerHero';
import type { GameCard } from '@/features/games/gamesApi';

const game = (id: string, kind: GameCard['kind'], vi: string, timeLimitS: number | null = null): GameCard => ({ id, kind, title: { vi, en: vi }, classId: null, timeLimitS, createdAt: '2026-11-01' });

export function GamesSample({ empty }: { empty: boolean }) {
  const lists = empty
    ? { classGames: [], publicGames: [] }
    : {
        classGames: [{ ...game('c1', 'crossword', 'Ô chữ: Thuật toán sắp xếp', 600), className: '10A1' }, { ...game('c2', 'quiz', 'Đố vui vòng lặp for và while'), className: '10A1' }],
        publicGames: [
          game('p1', 'match', 'Ghép thuật ngữ: Mạng máy tính', 300),
          game('p2', 'quiz', 'Đố vui: Biến và kiểu dữ liệu'),
          game('p3', 'crossword', 'Ô chữ tiếng Anh: Phần cứng'),
          game('p4', 'wordwall', 'Wordwall: Hệ nhị phân'),
        ],
      };
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Chơi và lên cấp</h1>
        <p className="max-w-prose text-sm text-ink-muted sm:text-base">Game thầy cô tạo cho lớp em và game ai cũng chơi được.</p>
      </header>
      <PlayerHeroView xp={772} habit={{ today: '2026-11-02', streak: 6, longest: 9, today_xp: 30, goal_xp: 50, freezes: 1, days: [] }} />
      <HubShortcutsView counts={{ challenges: 2, badges: { earned: 7, total: 24 } }} />
      <GamesListView lists={lists} isAdmin={empty} onCreate={() => {}} />
    </main>
  );
}
