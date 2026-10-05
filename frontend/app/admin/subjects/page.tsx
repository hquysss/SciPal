import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { AdminSubjectsPage } from '@/features/admin/AdminSubjectsPage';
import { RequireAdmin } from '@/features/admin/RequireAdmin';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Subjects', 'Môn học') };
export const dynamic = 'force-dynamic';

export default async function AdminSubjectsRoute() {
  let authStatus: 'authenticated' | 'unauthenticated' = 'unauthenticated';
  let appRole: string | undefined;
  try {
    const supabase = createServerClient(await cookies());
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      authStatus = 'authenticated';
      if (typeof user.app_metadata?.app_role === 'string') appRole = user.app_metadata.app_role;
    }
  } catch {
    authStatus = 'unauthenticated';
  }

  return (
    <RequireAdmin authStatus={authStatus} appRole={appRole}>
      <AdminSubjectsPage />
    </RequireAdmin>
  );
}
