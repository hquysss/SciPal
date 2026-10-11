import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createVnpayRecurringClient, vnpayRecurringFromEnv } from '../billing/providers/vnpayRecurring.js';
const cfg = { baseUrl: 'https://sandbox.vnpayment.vn', tmnCode: 'SCIPAL01', hashSecret: 'fixture', clientId: 'test', clientSecret: '', username: 'fixture', password: 'fixture', ipnEncoding: 'urlencoded' as const };
const hash = (text: string) => createHmac('sha512', cfg.hashSecret).update(text).digest('hex');
const reply = (data: object) => new Response(JSON.stringify(data), { status: 200 });
const auth = () => reply({ accessToken: 'fixture-access', tokenType: 'Bearer', expiresIn: 300 });

describe('VNPAY recurring protocol', () => {
  it('keeps recurring closed without explicit protocol/merchant configuration', () => {
    expect(vnpayRecurringFromEnv({})).toBeNull();
    expect(vnpayRecurringFromEnv({ VNPAY_RECURRING_ENABLED: 'true', VNPAY_ENV: 'sandbox' })).toBeNull();
  });
  it('registers indefinite authorization without granting an initial payment and verifies the response', async () => {
    const response = { rspCode: '00', rspMsg: 'OK', transaction: { id: 'reg123', amount: 0, feeAmount: 0, currCode: 'VND' }, dataKey: 'fixture-data', secureHash: hash('00|OK|reg123|0|0|VND||fixture-data') };
    const transport = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(auth()).mockResolvedValueOnce(reply(response));
    const result = await createVnpayRecurringClient(cfg, transport).startSubscription({ reference: 'order123', userId: 'user123', amountVnd: 39000, interval: 'month', createdAt: '2026-10-11T05:00:00Z', returnUrl: 'https://scipal.test/checkout/order123', ipAddr: '127.0.0.1', userAgent: 'fixture-browser' });
    expect(result).toEqual({ recurringId: 'reg123', dataKey: 'fixture-data', payUrl: 'https://sandbox.vnpayment.vn/recurring-payment/pay', tmnCode: cfg.tmnCode });
    const request = JSON.parse(String(transport.mock.calls[1][1]?.body));
    expect(request.command).toBe('recurring');
    expect(request.transaction).toMatchObject({ amount: 0, recurringAmount: 3900000, recurringNumber: 0, recurringFrequency: 'month', recurringEndDate: '99991231' });
    expect(request.secureHash).toBe(hash(`${request.reqId}|recurring|order123|SciPal subscription|other|SCIPAL01|3900000|1|month|0|20261011|20261011|99991231|0|VND||user123|||127.0.0.1|fixture-browser|https://scipal.test/checkout/order123|https://scipal.test/checkout/order123|2.1.0|vn|20261011120000`));
  });
  it('does not trust an unsigned recurring charge result', async () => {
    const transport = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(auth()).mockResolvedValueOnce(reply({ rspCode: '00', rspMsg: 'OK', transaction: { id: 'txn123', amount: 3900000, feeAmount: 0, currCode: 'VND' }, secureHash: 'wrong' }));
    await expect(createVnpayRecurringClient(cfg, transport).chargeSubscription({ reference: 'charge123', recurringId: 'reg123', tokenId: 'token123', amountVnd: 39000, createdAt: '2026-10-11T05:00:00Z', chargeDate: '20261011' })).rejects.toThrow();
  });
  it('signs the charge and converts only a verified success into payment facts', async () => {
    const transport = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValueOnce(auth()).mockResolvedValueOnce(reply({ rspCode: '00', rspMsg: 'OK', transaction: { id: 'txn123', amount: 3900000, feeAmount: 0, currCode: 'VND' }, secureHash: hash('00|OK|txn123|3900000|0|VND|') }));
    const result = await createVnpayRecurringClient(cfg, transport).chargeSubscription({ reference: 'charge123', recurringId: 'reg123', tokenId: 'token123', amountVnd: 39000, createdAt: '2026-10-11T05:00:00Z', chargeDate: '20261011' });
    expect(result).toMatchObject({ code: '00', transactionId: 'txn123', amountVnd: 39000 });
    const request = JSON.parse(String(transport.mock.calls[1][1]?.body));
    expect(request.secureHash).toBe(hash(`${request.reqId}|recurring_pay|charge123|SciPal renewal|SCIPAL01|token123|reg123|3900000|20261011|VND||2.1.0|20261011120000`));
  });
});
