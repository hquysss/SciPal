import { createHash } from 'node:crypto';
import { z } from 'zod';
import { VnpayError, vnpayAmount, vnpayDate, vnpayHash, vnpaySameHash, vnpaySignedFields, vnpayTimestamp } from './vnpay.js';

const Auth = z.object({ accessToken: z.string().min(1), tokenType: z.literal('Bearer'), expiresIn: z.number().positive() });
const Transaction = z.object({ id: z.union([z.string(), z.number()]).transform(String), amount: z.union([z.string(), z.number()]), feeAmount: z.union([z.string(), z.number()]).default(0), currCode: z.string() });
const Reply = z.object({ rspCode: z.string(), rspMsg: z.string(), transaction: Transaction.optional(), addData: z.string().optional(), dataKey: z.string().optional(), secureHash: z.string().optional() });
export const VnpayToken = z.object({ recurringId: z.string().min(1), tokenId: z.string().min(1).max(4096) }).strict();
export const VnpayRegistration = z.object({ recurringId: z.string().min(1), dataKey: z.string().min(1), payUrl: z.string().url(), tmnCode: z.string().min(1) }).strict();
export type VnpayRecurringConfig = { readonly baseUrl: string; readonly tmnCode: string; readonly hashSecret: string; readonly clientId: string; readonly clientSecret: string; readonly username: string; readonly password: string; readonly ipnEncoding: 'urlencoded' | 'raw' };
export function createVnpayRecurringClient(config: VnpayRecurringConfig, fetchImpl: typeof fetch = fetch) {
  const base = config.baseUrl.replace(/\/+$/, '');
  let session: { token: string; expiresAt: number } | null = null;
  async function accessToken() {
    if (session && session.expiresAt > Date.now() + 30_000) return session.token;
    const response = await fetchImpl(`${base}/oauth/authenticate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: config.clientId, clientSecret: config.clientSecret, username: config.username, password: config.password }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new VnpayError('VNPAY authentication failed');
    const result = Auth.safeParse(await response.json());
    if (!result.success) throw new VnpayError('Malformed VNPAY authentication');
    session = { token: result.data.accessToken, expiresAt: Date.now() + result.data.expiresIn * 1000 };
    return session.token;
  }
  async function execute(body: Record<string, unknown>, canonical: readonly (string | number)[]) {
    const token = await accessToken();
    const response = await fetchImpl(`${base}/recurring-payment/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...body, secureHash: vnpayHash(canonical.join('|'), config.hashSecret) }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new VnpayError('VNPAY recurring request failed');
    const result = Reply.safeParse(await response.json());
    if (!result.success) throw new VnpayError('Malformed VNPAY recurring response');
    return result.data;
  }
  function verifyReply(result: z.infer<typeof Reply>, registration: boolean) {
    const tx = result.transaction;
    const canonical = [result.rspCode, result.rspMsg, tx?.id ?? '', tx?.amount ?? 0, tx?.feeAmount ?? 0, tx?.currCode ?? '', result.addData ?? ''];
    if (registration) canonical.push(result.dataKey ?? '');
    if (!vnpaySameHash(canonical.join('|'), result.secureHash ?? '', config.hashSecret)) throw new VnpayError('Unverified VNPAY recurring response');
  }
  return {
    async startSubscription(input: { reference: string; userId: string; amountVnd: number; interval: 'month' | 'year'; createdAt: string; returnUrl: string; ipAddr: string; userAgent: string }) {
      if (!Number.isSafeInteger(input.amountVnd) || input.amountVnd <= 0 || input.amountVnd * 100 > 999_999_999_999) throw new VnpayError('Invalid recurring amount');
      const reqId = createHash('sha256').update(input.reference).digest('hex').slice(0, 32);
      const mcDate = vnpayTimestamp(input.createdAt);
      const date = mcDate.slice(0, 8);
      const transaction = { recurringFrequencyNumber: 1, recurringFrequency: input.interval, recurringNumber: 0, recurringAmount: input.amountVnd * 100, amount: 0, currCode: 'VND', returnUrl: input.returnUrl, cancelUrl: input.returnUrl, mcDate, recurringDate: date, recurringStartDate: date, recurringEndDate: '99991231' };
      const body = { reqId, command: 'recurring', tmnCode: config.tmnCode, order: { orderReference: input.reference, orderInfo: 'SciPal subscription', orderType: 'other' }, transaction, ipAddr: input.ipAddr, userAgent: input.userAgent, version: '2.1.0', app: { userId: input.userId }, locale: 'vn' };
      const result = await execute(body, [reqId, 'recurring', input.reference, 'SciPal subscription', 'other', config.tmnCode, transaction.recurringAmount, 1, input.interval, 0, date, date, '99991231', 0, 'VND', '', input.userId, '', '', input.ipAddr, input.userAgent, input.returnUrl, input.returnUrl, '2.1.0', 'vn', mcDate]);
      verifyReply(result, true);
      if (result.rspCode !== '00' || !result.transaction || !result.dataKey || result.transaction.currCode !== 'VND' || Number(result.transaction.amount) !== 0) throw new VnpayError('VNPAY registration refused');
      return { recurringId: result.transaction.id, dataKey: result.dataKey, payUrl: `${base}/recurring-payment/pay`, tmnCode: config.tmnCode };
    },
    verifyAuthorization(input: unknown) {
      const fields = vnpaySignedFields(input, 'vnp_secure_hash', config.hashSecret, config.ipnEncoding);
      if (!fields || fields.vnp_tmn_code !== config.tmnCode || fields.vnp_command !== 'recurring' || fields.vnp_response_code !== '00' || fields.vnp_transaction_status !== '00' || !fields.vnp_token || !fields.vnp_app_user_id || !fields.vnp_txn_ref) return null;
      return { reference: fields.vnp_txn_ref, userId: fields.vnp_app_user_id, tokenId: fields.vnp_token, paidAt: vnpayDate(fields.vnp_pay_date ?? '') };
    },
    async chargeSubscription(input: { reference: string; recurringId: string; tokenId: string; amountVnd: number; createdAt: string; chargeDate: string }) {
      const reqId = createHash('sha256').update(input.reference).digest('hex').slice(0, 32);
      const mcDate = vnpayTimestamp(input.createdAt);
      const amount = input.amountVnd * 100;
      const result = await execute({ reqId, command: 'recurring_pay', tmnCode: config.tmnCode, order: { orderReference: input.reference, orderInfo: 'SciPal renewal' }, token: { tokenId: input.tokenId }, transaction: { recurringId: input.recurringId, recurringAmount: amount, recurringDate: input.chargeDate, currCode: 'VND', mcDate }, version: '2.1.0' }, [reqId, 'recurring_pay', input.reference, 'SciPal renewal', config.tmnCode, input.tokenId, input.recurringId, amount, input.chargeDate, 'VND', '', '2.1.0', mcDate]);
      verifyReply(result, false);
      const amountVnd = result.transaction ? vnpayAmount(String(result.transaction.amount)) : null;
      if (result.rspCode === '00' && (!result.transaction || result.transaction.currCode !== 'VND' || !amountVnd)) throw new VnpayError('Invalid VNPAY recurring payment');
      return { code: result.rspCode, transactionId: result.transaction?.id ?? null, amountVnd };
    },
    async cancelSubscription(input: { mandateId: string; recurringId: string; tokenId: string; ipAddr: string; userAgent: string }) {
      const reqId = input.mandateId.replace(/-/g, '').slice(0, 32);
      const result = await execute({ reqId, command: 'cancel_recurring', tmnCode: config.tmnCode, token: { tokenId: input.tokenId }, transaction: { recurringId: input.recurringId }, ipAddr: input.ipAddr, userAgent: input.userAgent, version: '2.1.0' }, [reqId, 'cancel_recurring', config.tmnCode, input.tokenId, input.recurringId, '', input.ipAddr, input.userAgent, '2.1.0']);
      // Cancellation responses carry no signature in the published protocol; authenticated HTTPS is required.
      return result.rspCode === '00';
    },
  };
}
export type VnpayRecurringClient = ReturnType<typeof createVnpayRecurringClient>;
export function vnpayRecurringFromEnv(env: Record<string, string | undefined> = process.env): VnpayRecurringClient | null {
 
  const { VNPAY_RECURRING_BASE_URL: baseUrl, VNPAY_TMN_CODE: tmnCode, VNPAY_HASH_SECRET: hashSecret, VNPAY_RECURRING_CLIENT_ID: clientId, VNPAY_RECURRING_USERNAME: username, VNPAY_RECURRING_PASSWORD: password, VNPAY_RECURRING_IPN_ENCODING: ipnEncoding } = env;
  if (env.VNPAY_RECURRING_ENABLED !== 'true' || !['sandbox', 'production'].includes(env.VNPAY_ENV ?? '') || !baseUrl || !tmnCode || !hashSecret || !clientId || !username || !password || (ipnEncoding !== 'urlencoded' && ipnEncoding !== 'raw') || !env.CRON_SECRET) return null;
  if (!URL.canParse(baseUrl)) return null;
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !/(^|\.)vnpay(ment)?\.vn$/.test(url.hostname)) return null;
  if (env.VNPAY_ENV === 'production' && url.hostname.startsWith('sandbox.')) return null;
  return createVnpayRecurringClient({ baseUrl, tmnCode, hashSecret, clientId, clientSecret: env.VNPAY_RECURRING_CLIENT_SECRET ?? '', username, password, ipnEncoding });
}
