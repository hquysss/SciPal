import { notFound } from 'next/navigation';
import { GamesSample } from './GamesSample';

// Dev only: the games hub for a sample student, no account needed. ?state=empty shows no games.
export default async function GamesShowcasePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { state } = await searchParams;
  return <GamesSample empty={state === 'empty'} />;
}
