import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { BillingReconciliationPage } from '@/features/admin/BillingReconciliationPage';
import { RequireAdmin } from '@/features/admin/RequireAdmin';

export const metadata: Metadata = { title: 'Payment reconciliation — SciPal Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminBillingRoute() {
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
      <BillingReconciliationPage />
    </RequireAdmin>
  );
}
