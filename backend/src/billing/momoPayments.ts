import type { SupabaseClient } from '@supabase/supabase-js';
import type { MomoClient, MomoVerifiedPayment } from './providers/momo.js';

type MomoApplyResult = 'applied' | 'duplicate' | 'recorded' | 'reconciliation' | 'unknown';

export async function applyVerifiedMomoPayment(
  supabase: SupabaseClient,
  momo: MomoClient,
  payment: MomoVerifiedPayment,
  eventType: string,
  fingerprint: string,
  warn: (orderId: string) => void,
): Promise<MomoApplyResult> {
  const { data, error } = await supabase.rpc('billing_apply_momo_payment', {
    p_reference: payment.orderId,
    p_request_id: payment.requestId,
    p_partner_client_id: payment.partnerClientId,
    p_transaction_id: payment.transactionId,
    p_amount_vnd: payment.amountVnd,
    p_outcome: payment.paid ? 'paid' : 'failed',
    p_paid_at: payment.paidAt,
    p_fingerprint: fingerprint,
    p_event_type: eventType,
  });
  if (error) throw error;
  const result = typeof data === 'string' ? data as MomoApplyResult : 'unknown';
  if (!payment.paid || !['applied', 'duplicate'].includes(result)) return result;

  try {
    const { data: mandateData, error: mandateError } = await supabase
      .from('billing_mandates')
      .select('status')
      .eq('order_id', payment.orderId)
      .eq('user_id', payment.partnerClientId)
      .maybeSingle();
    if (mandateError || !mandateData || (mandateData as { status: string }).status !== 'pending') return result;

    const callbackToken = payment.callbackToken ?? await momo.queryCallbackToken({
      orderId: payment.orderId,
      requestId: `cb-${payment.orderId}`,
      partnerClientId: payment.partnerClientId,
    });
    if (!callbackToken) return result;
    const providerToken = await momo.getSubscriptionToken({
      orderId: payment.orderId,
      requestId: `token-${payment.orderId}`,
      partnerClientId: payment.partnerClientId,
      callbackToken,
    });
    const { error: activationError } = await supabase.rpc('billing_activate_momo_mandate', {
      p_order_id: payment.orderId,
      p_provider_token: providerToken,
    });
    if (activationError) warn(payment.orderId);
  } catch {
    warn(payment.orderId);
  }
  return result;
}
