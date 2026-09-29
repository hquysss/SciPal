import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { AdminPlansPage } from '@/features/admin/AdminPlansPage';
import { RequireAdmin } from '@/features/admin/RequireAdmin';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Plan limits & prices', 'Hạn mức & giá gói') };
export const dynamic = 'force-dynamic';

export default async function AdminPlansRoute() {
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
      <AdminPlansPage />
    </RequireAdmin>
  );
}
