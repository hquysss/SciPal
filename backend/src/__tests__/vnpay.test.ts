import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createVnpayClient, vnpayFromEnv, vnpayTimestamp } from '../billing/providers/vnpay.js';

const config = { tmnCode: 'SCIPAL01', hashSecret: 'fixture-key', environment: 'sandbox' as const };
const signed = (fields: Record<string, string>) => ({ ...fields, vnp_SecureHash: createHmac('sha512', config.hashSecret).update(Object.keys(fields).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(fields[k]).replace(/%20/g, '+')}`).join('&')).digest('hex') });
const notification = { vnp_TmnCode: config.tmnCode, vnp_TxnRef: 'order123', vnp_Amount: '3900000', vnp_TransactionNo: '12345', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_PayDate: '20261011120000' };

describe('VNPAY payment adapter', () => {
  it('defaults closed and requires an explicit environment', () => {
    expect(vnpayFromEnv({})).toBeNull();
    expect(vnpayFromEnv({ VNPAY_TMN_CODE: 'SCIPAL01', VNPAY_HASH_SECRET: 'key' })).toBeNull();
  });
  it('signs encoded sorted fields, converts VND and uses Vietnam time', () => {
    const url = new URL(createVnpayClient(config).createPaymentUrl({ reference: 'order123', amountVnd: 39000, createdAt: '2026-10-11T05:00:00Z', expiresAt: '2026-10-11T05:30:00Z', returnUrl: 'https://scipal.test/checkout/order123', ipAddr: '127.0.0.1', orderInfo: 'SciPal student plus', locale: 'en' }));
    expect(url.hostname).toBe('sandbox.vnpayment.vn');
    expect(url.searchParams.get('vnp_Amount')).toBe('3900000');
    expect(url.searchParams.get('vnp_CreateDate')).toBe('20261011120000');
    const fields = Object.fromEntries([...url.searchParams].filter(([key]) => key !== 'vnp_SecureHash'));
    expect(url.searchParams.get('vnp_SecureHash')).toBe(signed(fields).vnp_SecureHash);
    expect(vnpayTimestamp('2026-10-11T17:00:00Z')).toBe('20261012000000');
  });
  it('accepts authenticated payment facts and rejects tampering, foreign merchant, pollution and fractional VND', () => {
    const client = createVnpayClient(config);
    expect(client.verifyNotification(signed(notification))).toMatchObject({ reference: 'order123', amountVnd: 39000, transactionId: '12345', paidAt: '2026-10-11T05:00:00.000Z', outcome: 'paid' });
    expect(client.verifyNotification({ ...signed(notification), vnp_Amount: '100' })).toBeNull();
    expect(client.verifyNotification(signed({ ...notification, vnp_TmnCode: 'OTHER001' }))).toBeNull();
    expect(client.verifyNotification({ ...signed(notification), vnp_Amount: ['3900000', '100'] })).toBeNull();
    expect(client.verifyNotification(signed({ ...notification, vnp_Amount: '3900001' }))).toBeNull();
  });
  it('does not interpret pending, reversed or declined transactions as paid', () => {
    const client = createVnpayClient(config);
    expect(client.verifyNotification(signed({ ...notification, vnp_TransactionStatus: '01' }))).toBeNull();
    expect(client.verifyNotification(signed({ ...notification, vnp_TransactionStatus: '04' }))).toBeNull();
    expect(client.verifyNotification(signed({ ...notification, vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }))).toMatchObject({ outcome: 'cancelled' });
  });
});
