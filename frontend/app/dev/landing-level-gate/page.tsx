import { notFound } from 'next/navigation';
import { LevelGate } from '../../../features/landing/LevelGate';
import { parseEducationLevel } from '../../../features/landing/educationLevel';

interface ShowcaseSearchParams {
  level?: string;
  scope?: string;
  saveError?: string;
}

export default async function LandingLevelGateShowcase({
  searchParams,
}: {
  searchParams: Promise<ShowcaseSearchParams>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();

  const params = await searchParams;

  return (
    <LevelGate
      currentLevel={parseEducationLevel(params.level)}
      isAuthenticated={params.scope === 'account'}
      saveError={params.saveError === '1'}
    />
  );
}
