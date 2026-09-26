import { notFound } from 'next/navigation';
import { LevelGate } from '../../../features/landing/LevelGate';
import { parseEducationLevel } from '../../../features/landing/educationLevel';
import type { InformaticsAvailability } from '../../../features/landing/getLandingData';

interface ShowcaseSearchParams {
  level?: string;
  status?: string;
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
  const informatics: InformaticsAvailability = params.status === 'available'
    ? {
        kind: 'available',
        lesson: {
          slug: 'showcase',
          title_en: 'Showcase lesson',
          title_vi: 'Bài học showcase',
        },
      }
    : params.status === 'error'
      ? { kind: 'error' }
      : { kind: 'empty' };

  return (
    <LevelGate
      currentLevel={parseEducationLevel(params.level)}
      isAuthenticated={params.scope === 'account'}
      informatics={informatics}
      saveError={params.saveError === '1'}
    />
  );
}
