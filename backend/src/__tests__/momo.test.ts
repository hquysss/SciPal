import { createCipheriv, createHmac, generateKeyPairSync, privateDecrypt, constants } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createMomoClient, momoFromEnv, type MomoNotification } from '../billing/providers/momo.js';

const SECRET = '0123456789abcdef0123456789abcdef';
const PARTNER = 'SCIPAL_TEST';
const ACCESS = 'access-test';
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const config = { partnerCode: PARTNER, accessKey: ACCESS, secretKey: SECRET, publicKey, apiBaseUrl: 'https://momo.test' };

const signature = (value: string) => createHmac('sha256', SECRET).update(value).digest('hex');
const encryptAes = (value: unknown) => {
  const cipher = createCipheriv('aes-256-cbc', Buffer.from(SECRET), Buffer.alloc(16));
  return Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]).toString('base64');
};

describe('MoMo signed subscription checkout', () => {
  it('starts an explicitly authorized fixed VND subscription with the documented request signature', async () => {
    let call: { url: string; body: Record<string, unknown> } | undefined;
    const fetchImpl = async (url: string, init: { body?: string }) => {
      call = { url, body: JSON.parse(init.body ?? '{}') as Record<string, unknown> };
      return new Response(JSON.stringify({ resultCode: 0, payUrl: 'https://test-payment.momo.vn/session/1' }));
    };
    const client = createMomoClient(config, fetchImpl);

    await expect(client.startSubscription({
      orderId: 'order-01',
      amountVnd: 39_000,
      orderInfo: 'SciPal Student Plus monthly',
      partnerClientId: 'user-01',
      redirectUrl: 'https://scipal.test/checkout/order-01',
      ipnUrl: 'https://api.scipal.test/api/billing/webhooks/momo',
      subscriptionName: 'SciPal Student Plus',
      interval: 'month',
    })).resolves.toEqual({ checkoutUrl: 'https://test-payment.momo.vn/session/1' });

    expect(call?.url).toBe('https://momo.test/v2/gateway/api/create');
    expect(call?.body).toMatchObject({
      partnerCode: PARTNER,
      requestId: 'order-01',
      orderId: 'order-01',
      requestType: 'subscription',
      amount: 39_000,
      subscriptionInfo: { type: 'FIXED', recurringAmount: 39_000, frequency: 'MONTHLY' },
    });
    expect(call?.body.signature).toBe(signature(
      'accessKey=access-test&amount=39000&extraData=&ipnUrl=https://api.scipal.test/api/billing/webhooks/momo&orderId=order-01&orderInfo=SciPal Student Plus monthly&partnerClientId=user-01&partnerCode=SCIPAL_TEST&redirectUrl=https://scipal.test/checkout/order-01&requestId=order-01&requestType=subscription',
    ));
  });

  it('rejects unsigned or modified MoMo payment notifications', () => {
    const fields: MomoNotification = {
      partnerCode: PARTNER,
      requestId: 'request-01',
      amount: 39_000,
      orderId: 'order-01',
      partnerUserId: 'momo-user',
      orderType: 'momo_wallet',
      orderInfo: 'SciPal plan',
      partnerClientId: 'user-01',
      callbackToken: 'callback-token',
      transId: 1001,
      resultCode: 0,
      message: 'Success',
      payType: 'app',
      responseTime: 1_791_620_000_000,
      extraData: '',
    };
    const signed = {
      ...fields,
      signature: signature('accessKey=access-test&amount=39000&callbackToken=callback-token&extraData=&message=Success&orderId=order-01&orderInfo=SciPal plan&orderType=momo_wallet&partnerClientId=user-01&partnerCode=SCIPAL_TEST&payType=app&requestId=request-01&responseTime=1791620000000&resultCode=0&transId=1001'),
    };
    const client = createMomoClient(config, async () => new Response('{}'));

    expect(client.verifyNotification(signed)).toMatchObject({ orderId: 'order-01', amountVnd: 39_000, transactionId: '1001', paid: true });
    expect(client.verifyNotification({ ...signed, amount: 1 })).toBeNull();
    expect(client.verifyNotification({ ...signed, signature: 'invalid' })).toBeNull();
  });

  it('verifies MoMo subscription cancellation actions with the action-specific signature', () => {
    const action = {
      partnerCode: PARTNER,
      requestId: 'action-01',
      orderId: 'initial-01',
      partnerClientId: 'user-01',
      requestType: 'cancel',
      tokenType: 'subscription',
      signature: signature('accessKey=access-test&orderId=initial-01&partnerClientId=user-01&partnerCode=SCIPAL_TEST&requestId=action-01&requestType=cancel&tokenType=subscription'),
    };
    const client = createMomoClient(config, async () => new Response('{}'));

    expect(client.verifySubscriptionAction(action)).toEqual({ orderId: 'initial-01', requestId: 'action-01', partnerClientId: 'user-01', action: 'cancel' });
    expect(client.verifySubscriptionAction({ ...action, partnerClientId: 'someone-else' })).toBeNull();
  });

  it('recovers a missing initial callback token using MoMo callback-token inquiry', async () => {
    let call: { url: string; body: Record<string, unknown> } | undefined;
    const client = createMomoClient(config, async (url, init) => {
      call = { url, body: JSON.parse(init.body) as Record<string, unknown> };
      return new Response(JSON.stringify({ resultCode: 0, callbackToken: 'recovered-callback' }));
    });

    await expect(client.queryCallbackToken({ orderId: 'initial-01', requestId: 'query-01', partnerClientId: 'user-01' })).resolves.toBe('recovered-callback');
    expect(call?.url).toBe('https://momo.test/v2/gateway/api/subscription/cbQuery');
    expect(call?.body.signature).toBe(signature('accessKey=access-test&orderId=initial-01&partnerClientId=user-01&partnerCode=SCIPAL_TEST&requestId=query-01'));
  });

  it('decrypts the provider token and encrypts only the recurring token payload for a charge', async () => {
    const tokenValue = { value: 'recurring-secret', initialOrderId: 'initial-01', userAlias: '****1234' };
    const aesToken = encryptAes(tokenValue);
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchImpl = async (url: string, init: { body?: string }) => {
      calls.push({ url, body: JSON.parse(init.body ?? '{}') as Record<string, unknown> });
      return new Response(JSON.stringify({ resultCode: 0, orderId: 'renewal-01', amount: 39_000, transId: 1002, responseTime: 1_791_620_000_000 }));
    };
    const client = createMomoClient(config, fetchImpl);

    expect(client.decryptSubscriptionToken(aesToken)).toEqual(tokenValue);
    await expect(client.chargeSubscription({
      orderId: 'renewal-01',
      requestId: 'renewal-01',
      amountVnd: 39_000,
      orderInfo: 'SciPal renewal',
      partnerClientId: 'user-01',
      nextPaymentDate: '2026-12-10',
      aesToken,
    })).resolves.toMatchObject({ orderId: 'renewal-01', amountVnd: 39_000, transactionId: '1002', resultCode: 0 });

    const request = calls[0];
    expect(request.url).toBe('https://momo.test/v2/gateway/api/subscription/pay');
    const decrypted = JSON.parse(privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(String(request.body.token), 'base64')).toString('utf8'));
    expect(decrypted).toEqual({ value: 'recurring-secret', initialOrderId: 'initial-01' });
    expect(request.body).toMatchObject({ orderId: 'renewal-01', requestId: 'renewal-01', amount: 39_000, nextPaymentDate: '2026-12-10' });
    expect(request.body.signature).toBe(signature(`accessKey=access-test&amount=39000&extraData=&orderId=renewal-01&orderInfo=SciPal renewal&partnerClientId=user-01&partnerCode=SCIPAL_TEST&requestId=renewal-01&token=${String(request.body.token)}`));
  });
});

describe('momoFromEnv', () => {
  it('stays unavailable unless the account keys and explicit environment are configured', () => {
    expect(momoFromEnv({ MOMO_PARTNER_CODE: 'a', MOMO_ACCESS_KEY: 'b', MOMO_SECRET_KEY: 'c' })).toBeNull();
    expect(momoFromEnv({ MOMO_PARTNER_CODE: 'a', MOMO_ACCESS_KEY: 'b', MOMO_SECRET_KEY: 'c', MOMO_PUBLIC_KEY: 'd', MOMO_ENV: 'sandbox' })).not.toBeNull();
    expect(momoFromEnv({ MOMO_PARTNER_CODE: 'a', MOMO_ACCESS_KEY: 'b', MOMO_SECRET_KEY: 'c', MOMO_PUBLIC_KEY: 'd', MOMO_ENV: 'live' })).toBeNull();
  });
});
