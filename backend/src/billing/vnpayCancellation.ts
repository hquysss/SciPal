import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { VnpayToken, type VnpayRecurringClient } from './providers/vnpayRecurring.js';
const Mandates = z.array(z.object({ mandate_id: z.string().uuid(), aes_token: z.string().nullable() }));
export async function cancelVnpayForUser(db: SupabaseClient, recurring: VnpayRecurringClient | null, userId: string, ipAddr: string, userAgent: string): Promise<boolean> {
  const result = await db.rpc('billing_begin_vnpay_cancellation', { p_user_id: userId });
  if (result.error) throw result.error;
  const mandate = Mandates.parse(result.data ?? [])[0];
  if (!mandate) return true;
  if (mandate.aes_token) {
    if (!recurring) return false;
    const token = VnpayToken.parse(JSON.parse(mandate.aes_token));
    const cancelled = await recurring.cancelSubscription({ mandateId: mandate.mandate_id, ...token, ipAddr, userAgent });
    if (!cancelled) return false;
  }
  const confirmed = await db.rpc('billing_confirm_vnpay_cancellation', { p_mandate_id: mandate.mandate_id, p_status: 'cancelled' });
  if (confirmed.error) throw confirmed.error;
  return confirmed.data === true;
}
