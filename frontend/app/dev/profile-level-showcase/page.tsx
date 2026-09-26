import { notFound } from 'next/navigation';
import { AccountSettings } from '../../../features/profile/AccountSettings';
import { parseEducationLevel, resolveEducationLevel } from '../../../features/landing/educationLevel';

type SearchParams = { level?: string };

export default async function ProfileLevelShowcase({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();

  const params = await searchParams;
  const preference = resolveEducationLevel(null, parseEducationLevel(params.level));

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile learning preference showcase</h1>
      <AccountSettings
        currentRole="student"
        educationPreference={preference}
        isAuthenticated={false}
      />
    </main>
  );
}
