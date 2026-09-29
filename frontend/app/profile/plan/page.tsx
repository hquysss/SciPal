import type { Metadata } from 'next';
import { Bi } from '@/components/ui/bilingual';
import { ProfileBreadcrumb } from '@/features/profile/ProfileBreadcrumb';
import { MyPlan } from '@/features/billing/MyPlan';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('My plan', 'Gói của tôi') };

export const dynamic = 'force-dynamic';

// Signed-in only: the middleware sends visitors of /profile/* to the login page.
export default function MyPlanRoute() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <ProfileBreadcrumb current={{ en: 'My plan', vi: 'Gói của tôi' }} />
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        <Bi en="My plan" vi="Gói của tôi" />
      </h1>
      <MyPlan />
    </main>
  );
}
