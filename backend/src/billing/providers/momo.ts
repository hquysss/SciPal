import { createDecipheriv, createHmac, constants, publicEncrypt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const API = '/v2/gateway/api';
const TIMEOUT_MS = 35_000;

export type MomoConfig = {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  publicKey: string;
  apiBaseUrl: string;
};

export type MomoNotification = {
  partnerCode?: string;
  requestId?: string;
  amount?: number;
  orderId?: string;
  partnerUserId?: string;
  orderType?: string;
  orderInfo?: string;
  partnerClientId?: string;
  callbackToken?: string;
  transId?: number;
  resultCode?: number;
  message?: string;
  payType?: string;
  responseTime?: number;
  extraData?: string;
  signature?: string;
};

export type MomoVerifiedPayment = {
  orderId: string;
  requestId: string;
  partnerClientId: string;
  amountVnd: number;
  transactionId: string | null;
  resultCode: number;
  paid: boolean;
  paidAt: string | null;
  callbackToken: string | null;
};

export type MomoSubscriptionAction = {
  orderId: string;
  requestId: string;
  partnerClientId: string;
  action: 'pause' | 'cancel' | 'lock' | 'expire';
};

export type MomoSubscriptionToken = {
  value: string;
  initialOrderId: string;
  userAlias?: string;
  profileId?: string;
};

type Fetch = (url: string, init: { method: 'POST'; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<Response>;

const ApiResponse = z.object({ resultCode: z.number(), message: z.string().optional() }).passthrough();
const TokenPayload = z.object({ value: z.string().min(1), initialOrderId: z.string().min(1), userAlias: z.string().optional(), profileId: z.string().optional() }).passthrough();
const Notification = z.object({
  partnerCode: z.string(), requestId: z.string(), amount: z.number(), orderId: z.string(),
  partnerUserId: z.string().optional(), orderType: z.string().optional(), orderInfo: z.string(),
  partnerClientId: z.string(), callbackToken: z.string().optional(), transId: z.number().optional(),
  resultCode: z.number(), message: z.string(), payType: z.string().optional(),
  responseTime: z.number(), extraData: z.string().optional(), signature: z.string(),
});
const SubscriptionAction = z.object({
  partnerCode: z.string(), requestId: z.string(), orderId: z.string(), partnerClientId: z.string(),
  requestType: z.enum(['pause', 'cancel', 'lock', 'expire']), tokenType: z.literal('subscription'), signature: z.string(),
});

export class MomoProviderError extends Error {
  readonly providerCode: number | null;

  constructor(message: string, providerCode: number | null = null) {
    super(message);
    this.name = 'MomoProviderError';
    this.providerCode = providerCode;
  }
}

export const momoSignature = (text: string, secretKey: string) => createHmac('sha256', secretKey).update(text).digest('hex');

const matchesHex = (expected: string, received: string) => {
  if (!/^[a-f\d]{64}$/i.test(received) || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
};

function decryptAesToken(aesToken: string, secretKey: string): MomoSubscriptionToken {
  const key = Buffer.from(secretKey, 'utf8');
  if (![16, 24, 32].includes(key.length)) throw new MomoProviderError('Invalid MoMo AES key length');
  const encrypted = Buffer.from(aesToken, 'base64');
  if (encrypted.length === 0 || encrypted.length % 16 !== 0) throw new MomoProviderError('Invalid MoMo subscription token');
  const decryptor = createDecipheriv(`aes-${key.length * 8}-cbc`, key, Buffer.alloc(16));
  const clear = Buffer.concat([decryptor.update(encrypted), decryptor.final()]).toString('utf8');
  const parsed = TokenPayload.safeParse(JSON.parse(clear) as unknown);
  if (!parsed.success) throw new MomoProviderError('Invalid MoMo subscription token payload');
  return parsed.data;
}

function encryptedSubscriptionToken(aesToken: string, secretKey: string, publicKey: string): string {
  const { value, initialOrderId } = decryptAesToken(aesToken, secretKey);
  return publicEncrypt(
    { key: publicKey, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(JSON.stringify({ value, initialOrderId }), 'utf8'),
  ).toString('base64');
}

const responseTime = (value: unknown): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function createMomoClient(config: MomoConfig, fetchImpl: Fetch = fetch as unknown as Fetch) {
  const headers = { 'Content-Type': 'application/json; charset=UTF-8' };

  async function call(path: string, body: Record<string, unknown>) {
    const response = await fetchImpl(`${config.apiBaseUrl}${API}${path}`, {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json: unknown = await response.json().catch(() => null);
    const parsed = ApiResponse.safeParse(json);
    if (!response.ok || !parsed.success) throw new MomoProviderError(`MoMo request failed (${response.status})`);
    return parsed.data;
  }

  const verifyNotification = (value: unknown): MomoVerifiedPayment | null => {
    const parsed = Notification.safeParse(value);
    if (!parsed.success) return null;
    const event = parsed.data;
    const canonical = [
      `accessKey=${config.accessKey}`, `amount=${event.amount}`, `callbackToken=${event.callbackToken ?? ''}`,
      `extraData=${event.extraData ?? ''}`, `message=${event.message}`, `orderId=${event.orderId}`,
      `orderInfo=${event.orderInfo}`, `orderType=${event.orderType ?? ''}`, `partnerClientId=${event.partnerClientId}`,
      `partnerCode=${event.partnerCode}`, `payType=${event.payType ?? ''}`, `requestId=${event.requestId}`,
      `responseTime=${event.responseTime}`, `resultCode=${event.resultCode}`, `transId=${event.transId ?? ''}`,
    ].join('&');
    if (event.partnerCode !== config.partnerCode || !matchesHex(momoSignature(canonical, config.secretKey), event.signature)) return null;
    if (event.resultCode === 0 && event.transId === undefined) return null;
    return {
      orderId: event.orderId,
      requestId: event.requestId,
      partnerClientId: event.partnerClientId,
      amountVnd: event.amount,
      transactionId: event.transId === undefined ? null : String(event.transId),
      resultCode: event.resultCode,
      paid: event.resultCode === 0,
      paidAt: responseTime(event.responseTime),
      callbackToken: event.callbackToken ?? null,
    };
  };

  const verifySubscriptionAction = (value: unknown): MomoSubscriptionAction | null => {
    const parsed = SubscriptionAction.safeParse(value);
    if (!parsed.success) return null;
    const event = parsed.data;
    const canonical = [
      `accessKey=${config.accessKey}`, `orderId=${event.orderId}`, `partnerClientId=${event.partnerClientId}`,
      `partnerCode=${event.partnerCode}`, `requestId=${event.requestId}`, `requestType=${event.requestType}`,
      `tokenType=${event.tokenType}`,
    ].join('&');
    if (event.partnerCode !== config.partnerCode || !matchesHex(momoSignature(canonical, config.secretKey), event.signature)) return null;
    return { orderId: event.orderId, requestId: event.requestId, partnerClientId: event.partnerClientId, action: event.requestType };
  };

  return {
    async startSubscription(input: {
      orderId: string; amountVnd: number; orderInfo: string; partnerClientId: string;
      redirectUrl: string; ipnUrl: string; subscriptionName: string; interval: 'month' | 'year';
    }): Promise<{ checkoutUrl: string }> {
      const frequency = input.interval === 'year' ? 'YEARLY' : 'MONTHLY';
      const requestId = input.orderId;
      const extraData = '';
      const body: Record<string, unknown> = {
        partnerCode: config.partnerCode,
        requestId,
        orderId: input.orderId,
        amount: input.amountVnd,
        orderInfo: input.orderInfo,
        redirectUrl: input.redirectUrl,
        ipnUrl: input.ipnUrl,
        partnerClientId: input.partnerClientId,
        extraData,
        requestType: 'subscription',
        subscriptionInfo: {
          name: input.subscriptionName,
          partnerSubsId: input.orderId,
          subsOwner: input.partnerClientId,
          type: 'FIXED',
          recurringAmount: input.amountVnd,
          frequency,
        },
        lang: 'vi',
      };
      const canonical = [
        `accessKey=${config.accessKey}`, `amount=${input.amountVnd}`, `extraData=${extraData}`,
        `ipnUrl=${input.ipnUrl}`, `orderId=${input.orderId}`, `orderInfo=${input.orderInfo}`,
        `partnerClientId=${input.partnerClientId}`, `partnerCode=${config.partnerCode}`,
        `redirectUrl=${input.redirectUrl}`, `requestId=${requestId}`, 'requestType=subscription',
      ].join('&');
      body.signature = momoSignature(canonical, config.secretKey);
      const result = await call('/create', body);
      if (result.resultCode !== 0 || typeof result.payUrl !== 'string' || !result.payUrl.startsWith('https://')) {
        throw new MomoProviderError(`MoMo could not create subscription checkout (${result.resultCode})`, result.resultCode);
      }
      return { checkoutUrl: result.payUrl };
    },

    async getSubscriptionToken(input: { orderId: string; requestId: string; partnerClientId: string; callbackToken: string }): Promise<string> {
      const canonical = [
        `accessKey=${config.accessKey}`, `callbackToken=${input.callbackToken}`, `orderId=${input.orderId}`,
        `partnerClientId=${input.partnerClientId}`, `partnerCode=${config.partnerCode}`, `requestId=${input.requestId}`,
      ].join('&');
      const result = await call('/subscription/create', {
        partnerCode: config.partnerCode,
        requestId: input.requestId,
        callbackToken: input.callbackToken,
        orderId: input.orderId,
        partnerClientId: input.partnerClientId,
        lang: 'vi',
        signature: momoSignature(canonical, config.secretKey),
      });
      if (result.resultCode !== 0 || typeof result.aesToken !== 'string') {
        throw new MomoProviderError(`MoMo could not create subscription token (${result.resultCode})`, result.resultCode);
      }
      decryptAesToken(result.aesToken, config.secretKey);
      return result.aesToken;
    },

    async queryCallbackToken(input: { orderId: string; requestId: string; partnerClientId: string }): Promise<string | null> {
      const canonical = [
        `accessKey=${config.accessKey}`, `orderId=${input.orderId}`, `partnerClientId=${input.partnerClientId}`,
        `partnerCode=${config.partnerCode}`, `requestId=${input.requestId}`,
      ].join('&');
      const result = await call('/subscription/cbQuery', {
        partnerCode: config.partnerCode,
        requestId: input.requestId,
        orderId: input.orderId,
        partnerClientId: input.partnerClientId,
        lang: 'vi',
        signature: momoSignature(canonical, config.secretKey),
      });
      return result.resultCode === 0 && typeof result.callbackToken === 'string' ? result.callbackToken : null;
    },

    decryptSubscriptionToken(aesToken: string): MomoSubscriptionToken {
      return decryptAesToken(aesToken, config.secretKey);
    },

    async chargeSubscription(input: {
      orderId: string; requestId: string; amountVnd: number; orderInfo: string;
      partnerClientId: string; nextPaymentDate: string; aesToken: string;
    }): Promise<{ orderId: string; amountVnd: number; transactionId: string | null; resultCode: number; paidAt: string | null }> {
      const token = encryptedSubscriptionToken(input.aesToken, config.secretKey, config.publicKey);
      const extraData = '';
      const canonical = [
        `accessKey=${config.accessKey}`, `amount=${input.amountVnd}`, `extraData=${extraData}`,
        `orderId=${input.orderId}`, `orderInfo=${input.orderInfo}`, `partnerClientId=${input.partnerClientId}`,
        `partnerCode=${config.partnerCode}`, `requestId=${input.requestId}`, `token=${token}`,
      ].join('&');
      const result = await call('/subscription/pay', {
        partnerCode: config.partnerCode,
        partnerName: 'SciPal',
        orderId: input.orderId,
        amount: input.amountVnd,
        requestId: input.requestId,
        token,
        partnerClientId: input.partnerClientId,
        orderInfo: input.orderInfo,
        extraData,
        nextPaymentDate: input.nextPaymentDate,
        lang: 'vi',
        signature: momoSignature(canonical, config.secretKey),
      });
      const transactionId = typeof result.transId === 'number' ? String(result.transId) : null;
      return {
        orderId: typeof result.orderId === 'string' ? result.orderId : input.orderId,
        amountVnd: typeof result.amount === 'number' ? result.amount : input.amountVnd,
        transactionId,
        resultCode: result.resultCode,
        paidAt: responseTime(result.responseTime),
      };
    },

    async queryTransaction(input: { orderId: string; requestId: string }): Promise<{ resultCode: number; amountVnd: number | null; transactionId: string | null; paidAt: string | null }> {
      const canonical = `accessKey=${config.accessKey}&orderId=${input.orderId}&partnerCode=${config.partnerCode}&requestId=${input.requestId}`;
      const result = await call('/query', {
        partnerCode: config.partnerCode,
        requestId: input.requestId,
        orderId: input.orderId,
        lang: 'vi',
        signature: momoSignature(canonical, config.secretKey),
      });
      return {
        resultCode: result.resultCode,
        amountVnd: typeof result.amount === 'number' ? result.amount : null,
        transactionId: typeof result.transId === 'number' ? String(result.transId) : null,
        paidAt: responseTime(result.responseTime),
      };
    },

    async cancelSubscription(input: { orderId: string; requestId: string; partnerClientId: string; aesToken: string }): Promise<void> {
      const token = encryptedSubscriptionToken(input.aesToken, config.secretKey, config.publicKey);
      const canonical = [
        `accessKey=${config.accessKey}`, `orderId=${input.orderId}`, `partnerClientId=${input.partnerClientId}`,
        `partnerCode=${config.partnerCode}`, `requestId=${input.requestId}`, `token=${token}`,
      ].join('&');
      const result = await call('/subscription/manage', {
        partnerCode: config.partnerCode,
        requestId: input.requestId,
        orderId: input.orderId,
        partnerClientId: input.partnerClientId,
        token,
        lang: 'vi',
        action: 'cancel',
        signature: momoSignature(canonical, config.secretKey),
      });
      if (result.resultCode !== 0) throw new MomoProviderError(`MoMo could not cancel subscription (${result.resultCode})`, result.resultCode);
    },

    verifyNotification,
    verifySubscriptionAction,
  };
}

export type MomoClient = ReturnType<typeof createMomoClient>;

export function momoFromEnv(env: Record<string, string | undefined> = process.env): MomoClient | null {
  const partnerCode = env.MOMO_PARTNER_CODE;
  const accessKey = env.MOMO_ACCESS_KEY;
  const secretKey = env.MOMO_SECRET_KEY;
  const publicKey = env.MOMO_PUBLIC_KEY?.replace(/\\n/g, '\n');
  const apiBaseUrl = env.MOMO_ENV === 'production'
    ? 'https://payment.momo.vn'
    : env.MOMO_ENV === 'sandbox' ? 'https://test-payment.momo.vn' : null;
  if (!partnerCode || !accessKey || !secretKey || !publicKey || !apiBaseUrl) return null;
  return createMomoClient({ partnerCode, accessKey, secretKey, publicKey, apiBaseUrl });
}

export function momoRenewalsAvailable(env: Record<string, string | undefined> = process.env): boolean {
  if (!momoFromEnv(env) || !env.CRON_SECRET || !env.MOMO_IPN_URL) return false;
  try {
    return new URL(env.MOMO_IPN_URL).protocol === 'https:';
  } catch {
    return false;
  }
}
