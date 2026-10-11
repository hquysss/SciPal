import type { SupabaseClient } from '@supabase/supabase-js';
import type { VnpayPayment } from './providers/vnpay.js';
export async function applyVnpayPayment(db: SupabaseClient, payment: VnpayPayment, eventType = 'webhook'): Promise<string> {
  const result = await db.rpc('billing_apply_vnpay_payment', { p_reference: payment.reference, p_transaction_id: payment.transactionId, p_amount_vnd: payment.amountVnd, p_outcome: payment.outcome, p_paid_at: payment.paidAt, p_fingerprint: `${eventType}:${payment.reference}:${payment.transactionId}:${payment.outcome}`, p_event_type: eventType });
  if (result.error) throw result.error;
  if (typeof result.data !== 'string') throw new Error('VNPAY payment was not recorded');
  return result.data;
}
