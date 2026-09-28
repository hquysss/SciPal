import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createPayosClient, payosFromEnv, payosSignature, type PayosWebhook } from '../billing/providers/payos.js';

const KEY = 'test-checksum-key';
const hmac = (text: string) => createHmac('sha256', KEY).update(text).digest('hex');
const config = { clientId: 'client', apiKey: 'api', checksumKey: KEY };

const webhookData = {
  orderCode: 123456789,
  amount: 39000,
  description: 'SCIPAL',
  accountNumber: '12345678',
  reference: 'FT123',
  transactionDateTime: '2026-09-29 10:15:00',
  currency: 'VND',
  paymentLinkId: 'link-1',
  code: '00',
  desc: 'success',
  counterAccountBankId: null,
  counterAccountBankName: null,
  counterAccountName: null,
  counterAccountNumber: null,
  virtualAccountName: null,
  virtualAccountNumber: null,
};
const signedWebhook = (data: Record<string, unknown> = webhookData): PayosWebhook => ({
  code: '00',
  desc: 'success',
  success: true,
  data: data as PayosWebhook['data'],
  signature: payosSignature(data, KEY),
});

describe('payOS signature', () => {
  it('signs sorted key=value pairs, empty for null, with HMAC-SHA256 of the checksum key', () => {
    expect(payosSignature({ b: 2, a: 'x', c: null }, KEY)).toBe(hmac('a=x&b=2&c='));
  });
});

describe('payOS webhook', () => {
  const client = createPayosClient(config, vi.fn());

  it('accepts a correctly signed payment and gives the verified event', () => {
    const event = client.verifyWebhook(signedWebhook());
    expect(event).toMatchObject({ orderCode: 123456789, amount: 39000, reference: 'FT123', paid: true, paymentLinkId: 'link-1' });
    // Bank time is Vietnam time.
    expect(event?.paidAt).toBe('2026-09-29T03:15:00.000Z');
  });

  it('refuses a changed amount or a wrong key', () => {
    const tampered = { ...signedWebhook(), data: { ...webhookData, amount: 1000 } } as PayosWebhook;
    expect(client.verifyWebhook(tampered)).toBeNull();
    const other = createPayosClient({ ...config, checksumKey: 'other' }, vi.fn());
    expect(other.verifyWebhook(signedWebhook())).toBeNull();
    expect(client.verifyWebhook({} as PayosWebhook)).toBeNull();
  });
});

describe('payOS API', () => {
  it('creates a link with the documented signature and headers', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: '00', desc: 'success', data: { checkoutUrl: 'https://pay.payos.vn/web/abc', paymentLinkId: 'abc', status: 'PENDING' } })));
    const client = createPayosClient(config, fetch);
    const link = await client.createPaymentLink({ orderCode: 42, amount: 39000, description: 'SCIPAL', returnUrl: 'https://app/r', cancelUrl: 'https://app/c', expiredAt: 1_900_000_000 });
    expect(link).toEqual({ checkoutUrl: 'https://pay.payos.vn/web/abc', paymentLinkId: 'abc' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api-merchant.payos.vn/v2/payment-requests');
    expect(init.headers).toMatchObject({ 'x-client-id': 'client', 'x-api-key': 'api' });
    const body = JSON.parse(init.body);
    expect(body.signature).toBe(hmac('amount=39000&cancelUrl=https://app/c&description=SCIPAL&orderCode=42&returnUrl=https://app/r'));
    expect(body).toMatchObject({ orderCode: 42, amount: 39000, expiredAt: 1_900_000_000 });
  });

  it('throws when payOS refuses, so no order shows a link that does not exist', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: '231', desc: 'Đơn thanh toán đã tồn tại', data: null })));
    const client = createPayosClient(config, fetch);
    await expect(client.createPaymentLink({ orderCode: 42, amount: 39000, description: 'SCIPAL', returnUrl: 'r', cancelUrl: 'c', expiredAt: 1 })).rejects.toThrow('231');
  });

  it('reads a link status with its paid transaction', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: '00',
      desc: 'success',
      data: { id: 'abc', orderCode: 42, amount: 39000, amountPaid: 39000, status: 'PAID', transactions: [{ reference: 'FT9', amount: 39000, transactionDateTime: '2026-09-29 10:15:00' }] },
    })));
    const client = createPayosClient(config, fetch);
    expect(await client.getPaymentLink(42)).toEqual({
      status: 'PAID',
      amountPaid: 39000,
      paymentLinkId: 'abc',
      transactions: [{ reference: 'FT9', amount: 39000, paidAt: '2026-09-29T03:15:00.000Z' }],
    });
    expect(fetch.mock.calls[0][0]).toBe('https://api-merchant.payos.vn/v2/payment-requests/42');
  });
});

describe('payosFromEnv', () => {
  it('is off unless all three credentials are set', () => {
    expect(payosFromEnv({ PAYOS_CLIENT_ID: 'a', PAYOS_API_KEY: 'b' })).toBeNull();
    expect(payosFromEnv({ PAYOS_CLIENT_ID: 'a', PAYOS_API_KEY: 'b', PAYOS_CHECKSUM_KEY: 'c' })).not.toBeNull();
  });
});
