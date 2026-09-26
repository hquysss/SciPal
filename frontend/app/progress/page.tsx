import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { getUserProgress } from '@/features/progress/progressQueries';
import { ProgressView } from '@/features/progress/ProgressView';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const supabase = createServerClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fprogress');

  const progress = await getUserProgress(user.id);
  return <ProgressView {...progress} />;
}
