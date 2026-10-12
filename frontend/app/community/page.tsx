import type { Metadata } from 'next';
import { Bi } from '@/components/ui/bilingual';
import { CommunityPage } from '@/features/community/CommunityPage';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Community', 'Cộng đồng') };

export const dynamic = 'force-dynamic';

// Signed-in only: the middleware sends visitors to the login page.
export default function CommunityRoute() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          <Bi en="Community" vi="Cộng đồng" />
        </h1>
        <p className="max-w-prose text-sm text-ink-muted sm:text-base">
          <Bi en="Chat with classmates and keep your friends in one place." vi="Trò chuyện với bạn học và giữ danh sách bạn bè ở một chỗ." />
        </p>
      </header>
      <CommunityPage />
    </main>
  );
}
