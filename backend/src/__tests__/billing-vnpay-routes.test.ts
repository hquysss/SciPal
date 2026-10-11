import { createHmac } from 'node:crypto';
import Fastify, { type FastifyRequest } from 'fastify';
import { describe, expect, it, beforeEach } from 'vitest';
import { billingCheckoutRoutes } from '../routes/billingCheckout.js';
import { billingVnpayRoutes } from '../routes/billingVnpay.js';
import { createVnpayClient, vnpayCanonical } from '../billing/providers/vnpay.js';
import { mockQuery, mockSupabase, rpcCalls, type MockBuilder } from './helpers/supabaseMock.js';
const USER = 'a0000000-0000-4000-8000-000000000001';
const ORDER = 'c0000000-0000-4000-8000-000000000001';
const PRICE = 'b0000000-0000-4000-8000-000000000001';
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const client = createVnpayClient({ tmnCode: 'SCIPAL01', hashSecret: 'fixture', environment: 'sandbox' });
async function appFor(tables: Record<string, MockBuilder | MockBuilder[]> = {}, configured = true) {
 const app = Fastify();
 app.decorate('supabase', mockSupabase(tables));
 app.addHook('onRequest', async (request: FastifyRequest & { user?: { id: string } }) => { request.user = { id: USER }; });
 await app.register(billingCheckoutRoutes, { payos: null, momo: null, vnpay: configured ? client : null, vnpayRecurring: null, webBase: 'https://scipal.test' });
 await app.register(billingVnpayRoutes, { vnpay: configured ? client : null, recurring: null });
 return app;
}
beforeEach(() => { rpcCalls.length = 0; });
describe('VNPAY checkout and IPN', () => {
 it('refuses unconfigured checkout and recurring before creating an order', async () => {
  const app = await appFor({}, false);
  for (const autoRenew of [false, true]) {
   const res = await app.inject({ method: 'POST', url: '/api/billing/checkout', payload: { priceId: PRICE, provider: 'vnpay', idempotencyKey: 'vnpay-001', autoRenew } });
   expect(res.statusCode).toBe(503);
  }
  expect(rpcCalls).toHaveLength(0);
  await app.close();
 });
 it('saves the database price and reference before returning the hosted URL', async () => {
  const insert = ok({ id: 'attempt123' });
  const app = await appFor({ 'rpc:billing_create_order': ok([{ order_id: ORDER, plan_code: 'student_plus', billing_interval: 'month', amount_vnd: 39000, status: 'pending', expires_at: new Date(Date.now() + 600000).toISOString() }]), 'rpc:billing_begin_momo_cancellation': ok([]), 'rpc:billing_begin_vnpay_cancellation': ok([]), billing_payment_attempts: [ok([]), insert, ok()] });
  const result = await app.inject({ method: 'POST', url: '/api/billing/checkout', payload: { priceId: PRICE, provider: 'vnpay', idempotencyKey: 'vnpay-001', autoRenew: false } });
  expect(result.statusCode).toBe(201);
  expect(insert.inserted[0]).toMatchObject({ provider: 'vnpay', order_id: ORDER, amount_vnd: 39000 });
  expect(new URL(result.json().checkoutUrl).searchParams.get('vnp_Amount')).toBe('3900000');
  await app.close();
 });
 it('acknowledges verified IPN and sends only verified evidence to the ledger', async () => {
  const fields = { vnp_TmnCode: 'SCIPAL01', vnp_TxnRef: ORDER, vnp_Amount: '3900000', vnp_TransactionNo: '12345', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_PayDate: '20261011120000' };
  const signature = createHmac('sha512', 'fixture').update(vnpayCanonical(fields)).digest('hex');
  const app = await appFor({ 'rpc:billing_apply_vnpay_payment': ok('applied') });
  const result = await app.inject({ method: 'GET', url: '/api/billing/webhooks/vnpay?' + new URLSearchParams({ ...fields, vnp_SecureHash: signature }) });
  expect(result.json()).toEqual({ RspCode: '00', Message: 'Confirm Success' });
  expect(rpcCalls[0]).toMatchObject(['billing_apply_vnpay_payment', { p_reference: ORDER, p_amount_vnd: 39000, p_outcome: 'paid' }]);
  await app.close();
 });
 it('rejects invalid signatures without database writes', async () => {
  const app = await appFor();
  const result = await app.inject({ method: 'GET', url: '/api/billing/webhooks/vnpay?vnp_SecureHash=wrong' });
  expect(result.json().RspCode).toBe('97');
  expect(rpcCalls).toHaveLength(0);
  await app.close();
 });
});
