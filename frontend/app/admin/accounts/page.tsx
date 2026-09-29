import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { AdminAccountsPage } from '@/features/admin/AdminAccountsPage';
import { RequireAdmin } from '@/features/admin/RequireAdmin';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = {
  ...pageTitle('Accounts', 'Quản lý tài khoản'),
};

export const dynamic = 'force-dynamic';

export default async function AdminAccountsRoute() {
  let authStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'unauthenticated';
  let appRole: string | undefined;

  try {
    const supabase = createServerClient(await cookies());
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      authStatus = 'authenticated';
      const role = user.app_metadata?.app_role;
      if (typeof role === 'string') appRole = role;
    }
  } catch {
    authStatus = 'unauthenticated';
  }

  return (
    <RequireAdmin authStatus={authStatus} appRole={appRole}>
      <AdminAccountsPage />
    </RequireAdmin>
  );
}
