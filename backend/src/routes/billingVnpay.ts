import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { vnpayFromEnv, type VnpayClient } from '../billing/providers/vnpay.js';
import { vnpayRecurringFromEnv, VnpayRegistration, type VnpayRecurringClient } from '../billing/providers/vnpayRecurring.js';
import { applyVnpayPayment } from '../billing/vnpayPayments.js';
import { cancelVnpayForUser } from '../billing/vnpayCancellation.js';
import { runVnpayRenewals } from '../billing/vnpayRenewals.js';
import { checkoutDisabled } from '../billing/providers/payos.js';
const UNAVAILABLE = { code: 'BILLING_UNAVAILABLE', error: 'Chưa xử lý được thanh toán VNPAY. Thử lại sau.', error_en: 'VNPAY payment could not be processed. Try again later.' };
const UUID = z.string().uuid();
const ack = (RspCode: string, Message: string) => ({ RspCode, Message });
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? '');
export const billingVnpayRoutes: FastifyPluginAsync<{ vnpay?: VnpayClient | null; recurring?: VnpayRecurringClient | null }> = async (app, opts) => {
 const vnpay = opts.vnpay === undefined ? vnpayFromEnv() : opts.vnpay;
 const recurring = opts.recurring === undefined ? vnpayRecurringFromEnv() : opts.recurring;
 app.get('/api/billing/webhooks/vnpay', async (request, reply) => {
  if (!vnpay) return reply.code(503).send(UNAVAILABLE);
  const payment = vnpay.verifyNotification(request.query);
  if (!payment) return ack('97', 'Invalid signature or payment facts');
  try {
   const result = await applyVnpayPayment(app.supabase!, payment);
   return result === 'duplicate' ? ack('02', 'Order already confirmed') : ack('00', 'Confirm Success');
  } catch {
   request.log.error('Verified VNPAY payment could not be recorded');
   return ack('99', 'Database unavailable');
  }
 });
 app.get('/api/billing/webhooks/vnpay/recurring', async (request, reply) => {
  if (!recurring || !vnpay) return reply.code(503).send(UNAVAILABLE);
  const authorization = recurring.verifyAuthorization(request.query);
  if (!authorization || !UUID.safeParse(authorization.reference).success || !UUID.safeParse(authorization.userId).success) return ack('97', 'Invalid authorization');
  const result = await app.supabase!.rpc('billing_store_vnpay_authorization', { p_order_id: authorization.reference, p_user_id: authorization.userId, p_token_id: authorization.tokenId });
  if (result.error) return ack('99', 'Database unavailable');
  if (result.data !== true) return ack('01', 'Authorization not found');
  if (!checkoutDisabled()) {
   try { await runVnpayRenewals(app.supabase!, recurring, vnpay, authorization.reference); }
   catch { request.log.warn('VNPAY initial charge is pending scheduler confirmation'); }
  }
  return ack('00', 'Confirm Success');
 });
 app.get('/api/billing/vnpay/redirect/:id', async (request, reply) => {
  const id = UUID.safeParse((request.params as { id: string }).id);
  if (!id.success || !recurring || checkoutDisabled()) return reply.code(404).send(UNAVAILABLE);
  const result = await app.supabase!.from('billing_mandates').select('provider_checkout, status, billing_orders!inner(status, expires_at)').eq('order_id', id.data).eq('provider', 'vnpay').maybeSingle();
  const row = z.object({ provider_checkout: VnpayRegistration, status: z.literal('pending'), billing_orders: z.object({ status: z.literal('pending'), expires_at: z.string() }) }).safeParse(result.data);
  if (result.error || !row.success || new Date(row.data.billing_orders.expires_at) <= new Date()) return reply.code(404).send(UNAVAILABLE);
  const registration = row.data.provider_checkout;
  const url = new URL(registration.payUrl);
  if (url.protocol !== 'https:' || !/(^|\.)vnpay(ment)?\.vn$/.test(url.hostname)) return reply.code(503).send(UNAVAILABLE);
  const nonce = randomBytes(16).toString('base64');
  reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer').header('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; form-action ${url.origin}; base-uri 'none'; frame-ancestors 'none'`);
  return reply.type('text/html').send(`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VNPAY</title><body><p>Đang mở VNPAY. Opening VNPAY.</p><form method="post" action="${escapeHtml(registration.payUrl)}"><input type="hidden" name="ispTxnId" value="${escapeHtml(registration.recurringId)}"><input type="hidden" name="tmnCode" value="${escapeHtml(registration.tmnCode)}"><input type="hidden" name="dataKey" value="${escapeHtml(registration.dataKey)}"><button type="submit">Tiếp tục / Continue</button></form><script nonce="${nonce}">document.forms[0].submit()</script></body></html>`);
 });
 app.post('/api/billing/renewal/vnpay/cancel', async (request, reply) => {
  const user = (request as FastifyRequest & { user?: { id: string } }).user;
  if (!user) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  try {
   const cancelled = await cancelVnpayForUser(app.supabase!, recurring, user.id, request.ip, request.headers['user-agent'] ?? 'SciPal');
   return reply.code(cancelled ? 200 : 202).send({ status: cancelled ? 'cancelled' : 'cancel_pending' });
  } catch { return reply.code(503).send(UNAVAILABLE); }
 });
 app.get('/api/internal/billing/vnpay/renewals/run', async (request, reply) => {
  const expected = Buffer.from(process.env.CRON_SECRET ?? '');
  const received = Buffer.from(request.headers.authorization?.replace(/^Bearer /, '') ?? '');
  if (!expected.length || expected.length !== received.length || !timingSafeEqual(expected, received)) return reply.code(401).send({ code: 'UNAUTHORIZED' });
  if (checkoutDisabled()) return { claimed: 0, disabled: true };
  if (!recurring || !vnpay) return { claimed: 0, configured: false };
  try { return await runVnpayRenewals(app.supabase!, recurring, vnpay); }
  catch { request.log.error('VNPAY renewal worker failed'); return reply.code(503).send(UNAVAILABLE); }
 });
};
