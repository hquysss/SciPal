import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BillingOrdersTableView } from './BillingOrdersTable';
import type { BillingOrdersPage } from './billingReconciliationApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@/lib/supabase', () => ({ createBrowserClient: () => ({}) }));

const noop = () => {};
const data: BillingOrdersPage = {
  page: 1,
  pageSize: 20,
  totalCount: 2,
  items: [
    {
      id: 'o1', status: 'paid', amountVnd: 39000, interval: 'month', createdAt: '2026-09-29T11:21:54Z', paidAt: '2026-09-29T11:22:39Z',
      account: { id: 'u1', email: 'an@gmail.com', displayName: 'Lê An' }, plan: { code: 'student_plus', nameVi: 'Học sinh Plus', nameEn: 'Student Plus' },
      providerReference: '1790680914261', bankTransactionId: 'FT26272707395690',
    },
    {
      id: 'o2', status: 'cancelled', amountVnd: 390000, interval: 'year', createdAt: '2026-09-29T11:19:05Z', paidAt: null,
      account: { id: 'u1', email: 'an@gmail.com', displayName: null }, plan: { code: 'student_plus', nameVi: null, nameEn: null },
      providerReference: '1790680745161', bankTransactionId: null,
    },
  ],
};

describe('all payments table', () => {
  it('shows every order with its account, plan, amount, status and references', () => {
    const html = renderToStaticMarkup(<BillingOrdersTableView data={data} status={null} page={1} loading={false} error={false} onStatus={noop} onPage={noop} />);
    expect(html).toContain('Tất cả giao dịch');
    expect(html).toContain('2 đơn');
    expect(html).toContain('Lê An');
    expect(html).toContain('Học sinh Plus');
    expect(html).toContain('Đã thanh toán');
    expect(html).toContain('Đã hủy');
    expect(html).toContain('FT26272707395690');
    expect(html).toContain('Gói 1 năm');
    // A plan without a name falls back to its code; the "All" filter is the pressed one.
    expect(html).toContain('student_plus');
    expect(html).toMatch(/aria-pressed="true"[^>]*>Tất cả</);
  });

  it('says so when there is nothing yet, or when loading failed', () => {
    const empty = renderToStaticMarkup(<BillingOrdersTableView data={{ ...data, totalCount: 0, items: [] }} status="paid" page={1} loading={false} error={false} onStatus={noop} onPage={noop} />);
    expect(empty).toContain('Chưa có giao dịch nào.');
    const failed = renderToStaticMarkup(<BillingOrdersTableView data={null} status={null} page={1} loading={false} error onStatus={noop} onPage={noop} />);
    expect(failed).toContain('Chưa tải được danh sách giao dịch');
  });
});
