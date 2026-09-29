'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listBillingOrders, type BillingOrderItem, type BillingOrderStatus, type BillingOrdersPage } from './billingReconciliationApi';

// Every order on the reconciliation page: the full payment history, newest first, by status.

type Bilingual = { vi: string; en: string };

export const ORDER_STATUS: Record<BillingOrderStatus, Bilingual> = {
  paid: { vi: 'Đã thanh toán', en: 'Paid' },
  pending: { vi: 'Chờ thanh toán', en: 'Pending' },
  cancelled: { vi: 'Đã hủy', en: 'Cancelled' },
  expired: { vi: 'Hết hạn', en: 'Expired' },
  failed: { vi: 'Thất bại', en: 'Failed' },
  reconciliation: { vi: 'Cần đối soát', en: 'Needs review' },
};

const FILTERS: Array<BillingOrderStatus | null> = [null, 'paid', 'pending', 'cancelled', 'expired', 'failed', 'reconciliation'];

const money = (value: number, lang: 'en' | 'vi') =>
  new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

const when = (value: string | null, lang: 'en' | 'vi') => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export function BillingOrdersTableView({
  data,
  status,
  page,
  loading,
  error,
  onStatus,
  onPage,
}: {
  data: BillingOrdersPage | null;
  status: BillingOrderStatus | null;
  page: number;
  loading: boolean;
  error: boolean;
  onStatus: (status: BillingOrderStatus | null) => void;
  onPage: (page: number) => void;
}) {
  const { lang, t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / (data?.pageSize ?? 20)));
  const planName = (item: BillingOrderItem) => (lang === 'vi' ? item.plan.nameVi : item.plan.nameEn) ?? item.plan.code;

  return (
    <Card className="mt-8 min-w-0 gap-0 overflow-hidden py-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-sunken px-4 py-3 sm:px-6">
        <h2 className="font-semibold text-ink">{t({ vi: 'Tất cả giao dịch', en: 'All payments' })}</h2>
        <span className="text-sm text-ink-muted">{t({ vi: `${data?.totalCount ?? 0} đơn`, en: `${data?.totalCount ?? 0} orders` })}</span>
      </div>

      <div role="group" aria-label={t({ vi: 'Lọc theo trạng thái', en: 'Filter by status' })} className="flex flex-wrap gap-2 border-b border-line px-4 py-3 sm:px-6">
        {FILTERS.map((value) => (
          <button
            key={value ?? 'all'}
            type="button"
            aria-pressed={status === value}
            onClick={() => onStatus(value)}
            className={`min-h-9 rounded-full border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              status === value ? 'border-action bg-action text-action-ink' : 'border-edge text-ink-muted hover:text-ink'
            }`}
          >
            {value ? t(ORDER_STATUS[value]) : t({ vi: 'Tất cả', en: 'All' })}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-5">
          <Alert tone="danger">{t({ vi: 'Chưa tải được danh sách giao dịch. Bấm Tải lại để thử lại.', en: 'Could not load the payments. Press Refresh to try again.' })}</Alert>
        </div>
      )}
      {!error && loading && !data && (
        <p role="status" className="px-5 py-10 text-center text-sm text-ink-muted">{t({ vi: 'Đang tải giao dịch…', en: 'Loading payments…' })}</p>
      )}
      {!error && data && data.items.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-ink-muted">{t({ vi: 'Chưa có giao dịch nào.', en: 'No payments yet.' })}</p>
      )}
      {!error && data && data.items.length > 0 && (
        <div className="min-w-0 max-w-full" aria-busy={loading}>
          <Table label={t({ vi: 'Tất cả giao dịch', en: 'All payments' })} className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t({ vi: 'Thời điểm tạo', en: 'Created' })}</TableHead>
                <TableHead>{t({ vi: 'Tài khoản', en: 'Account' })}</TableHead>
                <TableHead>{t({ vi: 'Gói', en: 'Plan' })}</TableHead>
                <TableHead>{t({ vi: 'Số tiền', en: 'Amount' })}</TableHead>
                <TableHead>{t({ vi: 'Trạng thái', en: 'Status' })}</TableHead>
                <TableHead>{t({ vi: 'Mã đơn / giao dịch ngân hàng', en: 'Order / bank reference' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-ink-muted">
                    <p>{when(item.createdAt, lang)}</p>
                    {item.paidAt && <p className="text-xs">{t({ vi: 'Trả lúc', en: 'Paid' })} {when(item.paidAt, lang)}</p>}
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[14rem] truncate font-semibold text-ink">{item.account.displayName ?? item.account.email ?? '—'}</p>
                    {item.account.displayName && <p className="max-w-[14rem] truncate text-ink-muted">{item.account.email ?? '—'}</p>}
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-ink">{planName(item)}</p>
                    <p className="text-xs text-ink-muted">{item.interval === 'year' ? t({ vi: 'Gói 1 năm', en: '1 year' }) : t({ vi: 'Gói 1 tháng', en: '1 month' })}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-semibold tabular-nums text-ink">{money(item.amountVnd, lang)}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'paid' ? 'default' : 'outline'}>{t(ORDER_STATUS[item.status] ?? { vi: item.status, en: item.status })}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[12rem] truncate font-mono text-xs">{item.providerReference ?? '—'}</p>
                    <p className="max-w-[12rem] truncate font-mono text-xs text-ink-muted">{item.bankTransactionId ?? '—'}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && totalPages > 1 && (
        <nav aria-label={t({ vi: 'Trang giao dịch', en: 'Payment pages' })} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-6">
          <span className="text-sm text-ink-muted">{t({ vi: `Trang ${page} / ${totalPages}`, en: `Page ${page} of ${totalPages}` })}</span>
          <div className="flex gap-2">
            <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => onPage(page - 1)} disabled={page <= 1 || loading}>
              {t({ vi: 'Trước', en: 'Previous' })}
            </button>
            <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => onPage(page + 1)} disabled={page >= totalPages || loading}>
              {t({ vi: 'Sau', en: 'Next' })}
            </button>
          </div>
        </nav>
      )}
    </Card>
  );
}

/** `reloadKey` changes when the page's Refresh button is pressed. */
export function BillingOrdersTable({ reloadKey }: { reloadKey: number }) {
  const [status, setStatus] = useState<BillingOrderStatus | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BillingOrdersPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const result = await listBillingOrders(page, status, signal);
      if (!signal.aborted) setData(result);
    } catch {
      if (!signal.aborted) setError(true);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, reloadKey]);

  return (
    <BillingOrdersTableView
      data={data}
      status={status}
      page={page}
      loading={loading}
      error={error}
      onStatus={(value) => {
        setStatus(value);
        setPage(1);
      }}
      onPage={setPage}
    />
  );
}
