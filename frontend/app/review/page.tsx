import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { getReviewDeck } from '@/features/review/reviewQueries';
import { ReviewHeader } from '@/features/review/ReviewHeader';
import { ReviewSession } from '@/features/review/ReviewSession';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Review words', 'Ôn từ') };

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const supabase = createServerClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Freview');

  let content;
  try {
    const deck = await getReviewDeck(supabase, new Date());
    content = <ReviewSession {...deck} />;
  } catch {
    content = <LoadErrorNotice message={{ en: 'Unable to load your cards. Please try again.', vi: 'Không tải được thẻ ôn. Thử lại nhé.' }} retryHref="/review" />;
  }
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <ReviewHeader />
      {content}
    </main>
  );
}
