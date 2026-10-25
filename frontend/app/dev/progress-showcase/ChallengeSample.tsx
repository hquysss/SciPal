'use client';

import { ChallengeCardView } from '@/features/challenges/ChallengeCard';
import type { Challenge } from '@/features/challenges/challengesApi';

// Dev only: the challenge card with one challenge in each state (the real card loads from the backend).
const friend = (name: string) => ({ user_id: name, display_name: name, avatar_url: null });
const SAMPLE: Challenge[] = [
  { id: 'a', status: 'pending', incoming: true, starts_on: null, ends_on: null, winner: null, my_xp: 0, their_xp: 0, other: friend('Gia Bảo') },
  { id: 'b', status: 'active', incoming: false, starts_on: '2026-10-22', ends_on: '2026-10-28', winner: null, my_xp: 185, their_xp: 240, other: friend('Thu Hà') },
  { id: 'c', status: 'pending', incoming: false, starts_on: null, ends_on: null, winner: null, my_xp: 0, their_xp: 0, other: friend('Quốc Huy') },
  { id: 'd', status: 'done', incoming: true, starts_on: '2026-10-08', ends_on: '2026-10-14', winner: 'me', my_xp: 410, their_xp: 300, other: friend('Khánh Linh') },
];

export function ChallengeSample() {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16">
      <ChallengeCardView list={{ today: '2026-10-25', challenges: SAMPLE }} onAnswer={() => {}} />
    </div>
  );
}
