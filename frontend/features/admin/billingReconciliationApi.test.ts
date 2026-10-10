import { afterEach, describe, expect, it, vi } from 'vitest';
import { listBillingReconciliation, recheckBillingOrder } from './billingReconciliationApi';

const getSession = vi.fn();
vi.mock('@/lib/supabase', () => ({ createBrowserClient: () => ({ auth: { getSession } }) }));

afterEach(() => vi.restoreAllMocks());

describe('billingReconciliationApi', () => {
  it('loads a bearer-authenticated page with its pagination query', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null });
    const response = new Response(JSON.stringify({ page: 2, pageSize: 20, totalCount: 21, items: [{ provider: 'momo' }] }), { status: 200 });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

    const result = await listBillingReconciliation(2);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/admin/billing/reconciliation?page=2&limit=20');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token');
    expect(init?.cache).toBe('no-store');
    expect(result.items[0].provider).toBe('momo');
  });

  it('only posts a provider recheck for the selected order', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null });
    const response = new Response(JSON.stringify({ orderId: 'order-1', providerStatus: 'PENDING', results: [] }), { status: 200 });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

    await recheckBillingOrder('order-1');

    expect(fetchMock.mock.calls[0][0]).toContain('/api/admin/billing/orders/order-1/reconcile');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });
});
