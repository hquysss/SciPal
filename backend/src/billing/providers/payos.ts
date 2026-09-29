import { createHmac, timingSafeEqual } from 'node:crypto';

// payOS (VietQR bank transfer) over its HTTP API, per payos.vn/docs (checked 28–29/09/2026):
// - create: POST /v2/payment-requests, signature = HMAC-SHA256(checksumKey,
//   "amount=…&cancelUrl=…&description=…&orderCode=…&returnUrl=…");
// - status: GET /v2/payment-requests/{orderCode};
// - webhook: body.signature = HMAC-SHA256 of body.data, keys sorted, "key=value&…", null as "".
// Credentials exist only in the backend environment; nothing here logs them.

const API = 'https://api-merchant.payos.vn/v2/payment-requests';
const TIMEOUT_MS = 10_000;

export type PayosConfig = { clientId: string; apiKey: string; checksumKey: string };
export type PayosWebhook = {
  code?: string;
  desc?: string;
  success?: boolean;
  data?: Record<string, unknown> & { orderCode?: number; amount?: number; reference?: string; code?: string; paymentLinkId?: string; transactionDateTime?: string };
  signature?: string;
};
export type PayosPayment = { orderCode: number; amount: number; reference: string; paymentLinkId: string; paid: boolean; paidAt: string | null };
export type PayosLinkStatus = {
  status: string;
  amountPaid: number;
  paymentLinkId: string;
  transactions: Array<{ reference: string; amount: number; paidAt: string | null }>;
};
type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<Response>;

/** HMAC-SHA256 hex of the object's keys in alphabetical order, "key=value&…", null/undefined as "". */
export function payosSignature(data: Record<string, unknown>, checksumKey: string): string {
  const text = Object.keys(data)
    .sort()
    .map((key) => {
      const value = data[key];
      const shown = value === null || value === undefined ? '' : Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : String(value);
      return `${key}=${shown}`;
    })
    .join('&');
  return createHmac('sha256', checksumKey).update(text).digest('hex');
}

const sameHex = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

/** "2026-09-29 10:15:00" (Vietnam time) → ISO; null when it cannot be read. */
function vietnamTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/.exec(value);
  if (!match) return null;
  const time = new Date(`${match[1]}T${match[2].length === 5 ? `${match[2]}:00` : match[2]}+07:00`);
  return Number.isNaN(time.getTime()) ? null : time.toISOString();
}

export function createPayosClient(config: PayosConfig, fetchImpl: Fetch = fetch as unknown as Fetch) {
  const headers = { 'x-client-id': config.clientId, 'x-api-key': config.apiKey, 'Content-Type': 'application/json' };

  async function call(url: string, method: 'GET' | 'POST', body?: unknown) {
    const res = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
    const json = (await res.json().catch(() => null)) as { code?: string; desc?: string; data?: Record<string, unknown> | null } | null;
    if (!res.ok || !json || json.code !== '00' || !json.data) {
      throw new Error(`payOS refused (${json?.code ?? res.status})`);
    }
    return json.data;
  }

  return {
    async createPaymentLink(input: { orderCode: number; amount: number; description: string; returnUrl: string; cancelUrl: string; expiredAt: number }) {
      const signature = payosSignature(
        { amount: input.amount, cancelUrl: input.cancelUrl, description: input.description, orderCode: input.orderCode, returnUrl: input.returnUrl },
        config.checksumKey,
      );
      const data = await call(API, 'POST', { ...input, signature });
      if (typeof data.checkoutUrl !== 'string' || typeof data.paymentLinkId !== 'string') throw new Error('payOS returned no checkout link');
      return { checkoutUrl: data.checkoutUrl, paymentLinkId: data.paymentLinkId };
    },

    async getPaymentLink(orderCode: number): Promise<PayosLinkStatus> {
      const data = await call(`${API}/${orderCode}`, 'GET');
      const transactions = Array.isArray(data.transactions) ? (data.transactions as Array<Record<string, unknown>>) : [];
      return {
        status: String(data.status ?? ''),
        amountPaid: Number(data.amountPaid ?? 0),
        paymentLinkId: String(data.id ?? ''),
        transactions: transactions
          .filter((t) => typeof t.reference === 'string')
          .map((t) => ({ reference: t.reference as string, amount: Number(t.amount ?? 0), paidAt: vietnamTime(t.transactionDateTime) })),
      };
    },

    async cancelPaymentLink(orderCode: number): Promise<void> {
      await call(`${API}/${orderCode}/cancel`, 'POST', { cancellationReason: 'Superseded by a new checkout' });
    },

    /** The payment of a webhook whose signature is right; null otherwise. */
    verifyWebhook(body: PayosWebhook): PayosPayment | null {
      const data = body?.data;
      if (!data || typeof data !== 'object' || typeof body.signature !== 'string') return null;
      if (!sameHex(payosSignature(data, config.checksumKey), body.signature)) return null;
      if (typeof data.orderCode !== 'number' || typeof data.amount !== 'number' || typeof data.reference !== 'string') return null;
      return {
        orderCode: data.orderCode,
        amount: data.amount,
        reference: data.reference,
        paymentLinkId: typeof data.paymentLinkId === 'string' ? data.paymentLinkId : '',
        paid: data.code === '00' && body.code === '00',
        paidAt: vietnamTime(data.transactionDateTime),
      };
    },
  };
}

export type PayosClient = ReturnType<typeof createPayosClient>;

/** The client when all three credentials are configured; otherwise QR checkout stays closed. */
export function payosFromEnv(env: Record<string, string | undefined> = process.env): PayosClient | null {
  const { PAYOS_CLIENT_ID: clientId, PAYOS_API_KEY: apiKey, PAYOS_CHECKSUM_KEY: checksumKey } = env;
  if (!clientId || !apiKey || !checksumKey) return null;
  return createPayosClient({ clientId, apiKey, checksumKey });
}

/** Rollback switch: new checkouts stop, while webhooks and order checks keep applying payments. */
export const checkoutDisabled = (env: Record<string, string | undefined> = process.env) => env.BILLING_CHECKOUT_DISABLED === 'true';
