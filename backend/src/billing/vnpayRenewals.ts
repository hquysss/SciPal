import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { VnpayToken, type VnpayRecurringClient } from './providers/vnpayRecurring.js';
import { vnpayTimestamp, type VnpayClient } from './providers/vnpay.js';
import { applyVnpayPayment } from './vnpayPayments.js';
const Claims = z.array(z.object({ attempt_id: z.string().uuid(), mandate_id: z.string().uuid(), order_id: z.string().uuid(), amount_vnd: z.number().int().positive(), next_payment_date: z.string(), aes_token: z.string(), state: z.enum(['ready', 'unknown']) }));
const Attempt = z.object({ provider_reference: z.string().min(1), created_at: z.string() });
export async function runVnpayRenewals(db: SupabaseClient, recurring: VnpayRecurringClient, vnpay: VnpayClient, orderId?: string) {
  const initial = await db.rpc('billing_claim_vnpay_initial', { p_order_id: orderId ?? null });
  if (initial.error) throw initial.error;
  const due = orderId ? { data: [], error: null } : await db.rpc('billing_claim_vnpay_renewals', { p_limit: 20 });
  if (due.error) throw due.error;
  const rows = [...Claims.parse(initial.data ?? []), ...Claims.parse(due.data ?? [])];
  const summary = { claimed: rows.length, applied: 0, failed: 0, pending: 0 };
  for (const row of rows) {
    try {
      const token = VnpayToken.parse(JSON.parse(row.aes_token));
      const attempt = await db.from('billing_payment_attempts').select('provider_reference, created_at').eq('order_id', row.order_id).eq('provider', 'vnpay').single();
      if (attempt.error) throw attempt.error;
      const saved = Attempt.parse(attempt.data);
      let payment;
      if (row.state === 'unknown') {
        payment = await vnpay.queryTransaction({ reference: saved.provider_reference, transactionDate: vnpayTimestamp(saved.created_at), ipAddr: '127.0.0.1' });
        // Absence is not proof that a timed-out charge was never accepted. Never resubmit it.
        if (!payment) throw new Error('VNPAY charge is still unconfirmed');
      } else {
        const result = await recurring.chargeSubscription({ reference: saved.provider_reference, recurringId: token.recurringId, tokenId: token.tokenId, amountVnd: row.amount_vnd, createdAt: saved.created_at, chargeDate: row.next_payment_date.replace(/-/g, '') });
        if (result.code !== '00') {
          const failed = await db.rpc('billing_mark_vnpay_renewal_failed', { p_attempt_id: row.attempt_id, p_result_code: Number(result.code) });
          if (failed.error) throw failed.error;
          summary.failed += 1;
          continue;
        }
        if (!result.transactionId || result.amountVnd === null) throw new Error('VNPAY charge has no payment facts');
        payment = { reference: saved.provider_reference, transactionId: result.transactionId, amountVnd: result.amountVnd, paidAt: new Date().toISOString(), outcome: 'paid' as const };
      }
      const outcome = await applyVnpayPayment(db, payment, 'renewal');
      if (outcome === 'applied' || outcome === 'duplicate') summary.applied += 1;
      else summary.pending += 1;
    } catch {
      const unknown = await db.rpc('billing_mark_vnpay_renewal_unknown', { p_attempt_id: row.attempt_id });
      if (unknown.error) throw unknown.error;
      summary.pending += 1;
    }
  }
  return summary;
}
