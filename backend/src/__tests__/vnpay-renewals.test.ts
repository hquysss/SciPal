import { describe, expect, it, vi } from 'vitest';
import { runVnpayRenewals } from '../billing/vnpayRenewals.js';
import { createVnpayClient } from '../billing/providers/vnpay.js';
import { createVnpayRecurringClient } from '../billing/providers/vnpayRecurring.js';
import { mockQuery, mockSupabase, rpcCalls } from './helpers/supabaseMock.js';
const ORDER='c0000000-0000-4000-8000-000000000001';
const row={ attempt_id:'d0000000-0000-4000-8000-000000000001', mandate_id:'e0000000-0000-4000-8000-000000000001', order_id:ORDER, amount_vnd:39000, next_payment_date:'2026-10-11', aes_token:JSON.stringify({tokenId:'fixture-token',recurringId:'reg123'}), state:'unknown' };
const ok=(data:unknown=null)=>mockQuery({data,error:null});
function setup(state:string) {
 const recurring={...createVnpayRecurringClient({baseUrl:'https://sandbox.vnpayment.vn',tmnCode:'SCIPAL01',hashSecret:'fixture',clientId:'fixture',clientSecret:'',username:'fixture',password:'fixture',ipnEncoding:'urlencoded'}),chargeSubscription:vi.fn().mockRejectedValue(new Error('timeout'))};
 const vnpay={...createVnpayClient({tmnCode:'SCIPAL01',hashSecret:'fixture',environment:'sandbox'}),queryTransaction:vi.fn().mockResolvedValue(null)};
 const db=mockSupabase({'rpc:billing_claim_vnpay_initial':ok([{...row,state}]),'rpc:billing_claim_vnpay_renewals':ok([]),billing_payment_attempts:ok({provider_reference:'initial123',created_at:'2026-10-11T05:00:00.000Z'}),'rpc:billing_mark_vnpay_renewal_unknown':ok(),'rpc:billing_apply_vnpay_payment':ok('reconciliation')});
 return {db,recurring,vnpay};
}
describe('VNPAY unknown charges',()=>{
 it('queries a timed-out charge without submitting another charge',async()=>{
  const {db,recurring,vnpay}=setup('unknown');
  expect(await runVnpayRenewals(db,recurring,vnpay)).toMatchObject({pending:1,applied:0});
  expect(vnpay.queryTransaction).toHaveBeenCalledTimes(1);
  expect(recurring.chargeSubscription).not.toHaveBeenCalled();
 });
 it('records timeout as unknown for later reconciliation',async()=>{
  rpcCalls.length=0;
  const {db,recurring,vnpay}=setup('ready');
  expect(await runVnpayRenewals(db,recurring,vnpay)).toMatchObject({pending:1});
  expect(recurring.chargeSubscription).toHaveBeenCalledTimes(1);
  expect(rpcCalls.some(([name])=>name==='billing_mark_vnpay_renewal_unknown')).toBe(true);
 });
 it('does not report a mismatched payment in reconciliation as an applied plan',async()=>{
  const {db,recurring,vnpay}=setup('unknown');
  vnpay.queryTransaction.mockResolvedValue({reference:'initial123',transactionId:'txn123',amountVnd:1,paidAt:'2026-10-11T05:00:00.000Z',outcome:'paid'});
  expect(await runVnpayRenewals(db,recurring,vnpay)).toMatchObject({pending:1,applied:0});
 });
});
