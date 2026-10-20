import type { Metadata } from 'next';
import { Bi } from '@/components/ui/bilingual';
import { CommunityPage } from '@/features/community/CommunityPage';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Community', 'Cộng đồng') };

export const dynamic = 'force-dynamic';

// Signed-in only: the middleware sends visitors to the login page.
export default function CommunityRoute() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pb-6 pt-4 sm:px-6">
      <h1 className="sr-only"><Bi en="Community" vi="Cộng đồng" /></h1>
      <CommunityPage />
    </main>
  );
}
