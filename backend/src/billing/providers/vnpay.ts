import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export class VnpayError extends Error {}
export type VnpayConfig = { readonly tmnCode: string; readonly hashSecret: string; readonly environment: 'sandbox' | 'production' };
export type VnpayPayment = { readonly reference: string; readonly transactionId: string; readonly amountVnd: number; readonly paidAt: string; readonly outcome: 'paid' | 'failed' | 'cancelled' };
export const vnpayHash = (text: string, secret: string) => createHmac('sha512', secret).update(text).digest('hex');
export function vnpaySameHash(text: string, signature: string, secret: string): boolean {
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  return timingSafeEqual(Buffer.from(vnpayHash(text, secret), 'hex'), Buffer.from(signature, 'hex'));
}
const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, '+').replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
export const vnpayCanonical = (fields: Readonly<Record<string, string>>, encoding: 'urlencoded' | 'raw' = 'urlencoded') => Object.keys(fields).sort().map((key) => `${encoding === 'raw' ? key : encode(key)}=${encoding === 'raw' ? fields[key] : encode(fields[key])}`).join('&');
export function vnpayTimestamp(value: string | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new VnpayError('Invalid payment date');
  return new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 19).replace(/[-T:]/g, '');
}
export function vnpayDate(value: string): string | null {
  if (!/^\d{14}$/.test(value)) return null;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}+07:00`;
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) && vnpayTimestamp(date) === value ? date.toISOString() : null;
}
export function vnpayAmount(value: string): number | null {
  if (!/^\d{1,12}$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 && amount % 100 === 0 ? amount / 100 : null;
}
export function vnpaySignedFields(input: unknown, signatureKey: string, secret: string, encoding: 'urlencoded' | 'raw' = 'urlencoded'): Record<string, string> | null {
  const parsed = z.record(z.string()).safeParse(input);
  if (!parsed.success) return null;
  const signature = parsed.data[signatureKey];
  if (!signature) return null;
  const fields = Object.fromEntries(Object.entries(parsed.data).filter(([key]) => key !== signatureKey && key !== 'vnp_SecureHashType' && key !== 'vnp_secure_hash_type'));
  return vnpaySameHash(vnpayCanonical(fields, encoding), signature, secret) ? fields : null;
}
function payment(fields: Record<string, string>): VnpayPayment | null {
  const amount = vnpayAmount(fields.vnp_Amount ?? '');
  const date = vnpayDate(fields.vnp_PayDate ?? '');
  if (!amount || !date || !/^[\w-]{1,100}$/.test(fields.vnp_TxnRef ?? '') || !/^\d{1,15}$/.test(fields.vnp_TransactionNo ?? '') || fields.vnp_TransactionNo === '0') return null;
  const status = fields.vnp_TransactionStatus;
  const code = fields.vnp_ResponseCode;
  const outcome = code === '00' && status === '00' ? 'paid' : status === '02' ? (code === '24' ? 'cancelled' : 'failed') : null;
  return outcome ? { reference: fields.vnp_TxnRef, transactionId: fields.vnp_TransactionNo, amountVnd: amount, paidAt: date, outcome } : null;
}

export function createVnpayClient(config: VnpayConfig, fetchImpl: typeof fetch = fetch) {
  const paymentUrl = config.environment === 'sandbox' ? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' : 'https://pay.vnpay.vn/vpcpay.html';
  const queryUrl = config.environment === 'sandbox' ? 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction' : 'https://pay.vnpay.vn/merchant_webapi/api/transaction';
  return {
    createPaymentUrl(input: { reference: string; amountVnd: number; createdAt: string; expiresAt: string; returnUrl: string; ipAddr: string; orderInfo: string; locale?: 'vn' | 'en' }): string {
      if (!Number.isSafeInteger(input.amountVnd) || input.amountVnd <= 0 || input.amountVnd * 100 > 999_999_999_999) throw new VnpayError('Invalid payment amount');
      const fields = { vnp_Version: '2.1.0', vnp_Command: 'pay', vnp_TmnCode: config.tmnCode, vnp_Amount: String(input.amountVnd * 100), vnp_CurrCode: 'VND', vnp_TxnRef: input.reference, vnp_OrderInfo: input.orderInfo, vnp_OrderType: 'other', vnp_Locale: input.locale ?? 'vn', vnp_ReturnUrl: input.returnUrl, vnp_IpAddr: input.ipAddr, vnp_CreateDate: vnpayTimestamp(input.createdAt), vnp_ExpireDate: vnpayTimestamp(input.expiresAt) };
      const canonical = vnpayCanonical(fields);
      return `${paymentUrl}?${canonical}&vnp_SecureHash=${vnpayHash(canonical, config.hashSecret)}`;
    },
    verifyNotification(input: unknown): VnpayPayment | null {
      const fields = vnpaySignedFields(input, 'vnp_SecureHash', config.hashSecret);
      if (!fields || fields.vnp_TmnCode !== config.tmnCode || (fields.vnp_CurrCode && fields.vnp_CurrCode !== 'VND')) return null;
      return payment(fields);
    },
    async queryTransaction(input: { reference: string; transactionDate: string; ipAddr: string }): Promise<VnpayPayment | null> {
      const request = { vnp_RequestId: randomUUID().replace(/-/g, ''), vnp_Version: '2.1.0', vnp_Command: 'querydr', vnp_TmnCode: config.tmnCode, vnp_TxnRef: input.reference, vnp_TransactionDate: input.transactionDate, vnp_CreateDate: vnpayTimestamp(new Date()), vnp_IpAddr: input.ipAddr, vnp_OrderInfo: `Query SciPal ${input.reference}` };
      const canonical = [request.vnp_RequestId, request.vnp_Version, request.vnp_Command, request.vnp_TmnCode, request.vnp_TxnRef, request.vnp_TransactionDate, request.vnp_CreateDate, request.vnp_IpAddr, request.vnp_OrderInfo].join('|');
      const response = await fetchImpl(queryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...request, vnp_SecureHash: vnpayHash(canonical, config.hashSecret) }), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new VnpayError('VNPAY query failed');
      const parsed = z.record(z.string()).safeParse(await response.json());
      if (!parsed.success) throw new VnpayError('Malformed VNPAY query');
      const data = parsed.data;
      const keys = ['vnp_ResponseId', 'vnp_Command', 'vnp_ResponseCode', 'vnp_Message', 'vnp_TmnCode', 'vnp_TxnRef', 'vnp_Amount', 'vnp_BankCode', 'vnp_PayDate', 'vnp_TransactionNo', 'vnp_TransactionType', 'vnp_TransactionStatus', 'vnp_OrderInfo', 'vnp_PromotionCode', 'vnp_PromotionAmount'];
      if (!vnpaySameHash(keys.map((key) => data[key] ?? '').join('|'), data.vnp_SecureHash ?? '', config.hashSecret) || data.vnp_TmnCode !== config.tmnCode || data.vnp_TxnRef !== input.reference || data.vnp_Command !== 'querydr') throw new VnpayError('Unverified VNPAY query');
      if (data.vnp_ResponseCode !== '00' || data.vnp_TransactionType !== '01') return null;
      return payment(data);
    },
  };
}
export type VnpayClient = ReturnType<typeof createVnpayClient>;
export function vnpayFromEnv(env: Record<string, string | undefined> = process.env): VnpayClient | null {
  if (!env.VNPAY_TMN_CODE || !env.VNPAY_HASH_SECRET || !['sandbox', 'production'].includes(env.VNPAY_ENV ?? '')) return null;
  return createVnpayClient({ tmnCode: env.VNPAY_TMN_CODE, hashSecret: env.VNPAY_HASH_SECRET, environment: env.VNPAY_ENV === 'production' ? 'production' : 'sandbox' });
}
