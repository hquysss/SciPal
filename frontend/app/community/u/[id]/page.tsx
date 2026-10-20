import type { Metadata } from 'next';
import { PublicProfile } from '@/features/profile/PublicProfile';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Profile', 'Hồ sơ') };

export const dynamic = 'force-dynamic';

// Signed-in only: the middleware sends visitors to the login page.
export default async function PublicProfileRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <PublicProfile userId={id} />
    </main>
  );
}
