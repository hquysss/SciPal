'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { BillingOrdersTable } from './BillingOrdersTable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BillingReconciliationApiError,
  listBillingReconciliation,
  recheckBillingOrder,
  type BillingReconciliationItem,
  type BillingReconciliationPage,
} from './billingReconciliationApi';

type PageState = 'loading' | 'ready' | 'error';

function formatMoney(value: number | null, lang: 'en' | 'vi') {
  if (value === null) return '—';
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null, lang: 'en' | 'vi') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function BillingReconciliationPage() {
  const { lang, t } = useLanguage();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BillingReconciliationPage | null>(null);
  const [state, setState] = useState<PageState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'info'; text: string } | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadPage = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    setError(null);
    try {
      const result = await listBillingReconciliation(page, signal);
      if (signal?.aborted) return;
      setData(result);
      setPage((current) => Math.min(current, Math.max(1, Math.ceil(result.totalCount / result.pageSize))));
      setState('ready');
    } catch (cause) {
      if (signal?.aborted) return;
      const denied = cause instanceof BillingReconciliationApiError && [401, 403].includes(cause.status);
      setError(denied
        ? (lang === 'vi' ? 'Cần đăng nhập bằng tài khoản quản trị viên để xem đối soát.' : 'Sign in with an administrator account to view reconciliation.')
        : (lang === 'vi' ? 'Không tải được dữ liệu đối soát. Hãy kiểm tra kết nối rồi thử lại.' : 'Could not load reconciliation. Check the connection and try again.'));
      setState('error');
    }
  }, [lang, page]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPage(controller.signal);
    return () => controller.abort();
  }, [loadPage]);

  async function handleRecheck(item: BillingReconciliationItem) {
    if (!item.orderId || busyOrderId) return;
    setBusyOrderId(item.orderId);
    setNotice(null);
    setError(null);
    try {
      const result = await recheckBillingOrder(item.orderId);
      const applied = result.results.some((entry) => entry.result === 'applied');
      const remains = result.results.some((entry) => entry.result === 'reconciliation');
      const text = applied
        ? (lang === 'vi' ? 'payOS đã xác nhận giao dịch và hệ thống đã cập nhật gói.' : 'payOS confirmed the payment and the plan was updated.')
        : remains
          ? (lang === 'vi' ? 'Đã hỏi payOS; giao dịch vẫn cần được đối soát thêm.' : 'payOS was checked; the payment still needs review.')
          : (lang === 'vi' ? `Đã hỏi payOS. Trạng thái hiện tại: ${result.providerStatus}.` : `payOS was checked. Current status: ${result.providerStatus}.`);
      setNotice({ tone: applied ? 'success' : 'info', text });
      await loadPage();
    } catch {
      setError(lang === 'vi' ? 'Chưa hỏi lại được payOS. Hãy thử lại sau.' : 'Could not recheck payOS. Try again later.');
    } finally {
      setBusyOrderId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil((data?.totalCount ?? 0) / (data?.pageSize ?? 20)));

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-6 flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="text-sm font-semibold text-ink-muted">{t({ en: 'Administration', vi: 'Quản trị hệ thống' })}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {t({ en: 'Payment reconciliation', vi: 'Đối soát thanh toán' })}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {t({ en: 'Review payments payOS could not safely match. Rechecks use provider records and never mark an order paid by hand.', vi: 'Kiểm tra các giao dịch payOS chưa thể khớp an toàn. Việc đối chiếu dùng dữ liệu từ payOS, không có thao tác ghi nhận đã trả thủ công.' })}
          </p>
        </div>
        <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => {
          setReloadKey((key) => key + 1);
          void loadPage();
        }} disabled={state === 'loading'}>
          {state === 'loading' ? t({ en: 'Loading…', vi: 'Đang tải…' }) : t({ en: 'Refresh', vi: 'Tải lại' })}
        </button>
      </header>

      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      {notice && <Alert tone={notice.tone} className="mb-4">{notice.text}</Alert>}

      <Card className="min-w-0 gap-0 overflow-hidden py-0">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-sunken px-4 py-3 sm:px-6">
          <h2 className="font-semibold text-ink">{t({ en: 'Unresolved payments', vi: 'Giao dịch cần xử lý' })}</h2>
          <span className="text-sm text-ink-muted">
            {t({ en: `${data?.totalCount ?? 0} cases`, vi: `${data?.totalCount ?? 0} giao dịch` })}
          </span>
        </div>

        {state === 'loading' && <p role="status" className="px-5 py-10 text-center text-sm text-ink-muted">{t({ en: 'Loading reconciliation cases…', vi: 'Đang tải giao dịch cần đối soát…' })}</p>}
        {state === 'error' && (
          <div className="p-5">
            <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => void loadPage()}>
              {t({ en: 'Try again', vi: 'Thử lại' })}
            </button>
          </div>
        )}
        {state === 'ready' && data?.items.length === 0 && (
          <div className="p-5">
            <EmptyState title={t({ en: 'No payments need reconciliation', vi: 'Không có giao dịch cần đối soát' })} description={t({ en: 'New cases will appear here when a provider payment needs review.', vi: 'Giao dịch cần kiểm tra sẽ xuất hiện tại đây.' })} />
          </div>
        )}
        {state === 'ready' && data && data.items.length > 0 && (
          <div className="min-w-0 max-w-full">
            <Table label={t({ en: 'Payment reconciliation cases', vi: 'Danh sách giao dịch cần đối soát' })} className="min-w-[1080px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t({ en: 'Account', vi: 'Tài khoản' })}</TableHead>
                  <TableHead>{t({ en: 'Plan and order', vi: 'Gói và đơn hàng' })}</TableHead>
                  <TableHead>{t({ en: 'Amounts', vi: 'Số tiền' })}</TableHead>
                  <TableHead>{t({ en: 'Bank transaction', vi: 'Giao dịch ngân hàng' })}</TableHead>
                  <TableHead>{t({ en: 'Reason', vi: 'Lý do' })}</TableHead>
                  <TableHead>{t({ en: 'Received', vi: 'Thời điểm nhận' })}</TableHead>
                  <TableHead><span className="sr-only">{t({ en: 'Actions', vi: 'Thao tác' })}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="max-w-[14rem] truncate font-semibold text-ink">{item.account.displayName ?? t({ en: 'Account unavailable', vi: 'Không có tài khoản' })}</p>
                      <p className="max-w-[14rem] truncate text-ink-muted">{item.account.email ?? '—'}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-ink">{lang === 'vi' ? item.plan.nameVi ?? item.plan.code ?? '—' : item.plan.nameEn ?? item.plan.code ?? '—'}</p>
                      <p className="max-w-[12rem] truncate text-xs text-ink-muted">{t({ en: 'Order code', vi: 'Mã đơn' })}: {item.providerReference ?? '—'}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p>{t({ en: 'Ordered', vi: 'Đơn' })}: {formatMoney(item.amountOrderedVnd, lang)}</p>
                      <p className="text-ink-muted">{t({ en: 'Received', vi: 'Nhận' })}: {formatMoney(item.amountReceivedVnd, lang)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[12rem] truncate font-mono text-xs">{item.bankTransactionId ?? '—'}</p>
                      <p className="text-xs text-ink-muted">{t({ en: 'payOS transaction ID', vi: 'Mã giao dịch ngân hàng' })}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline">{lang === 'vi' ? item.reason.vi : item.reason.en}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-ink-muted">{formatDate(item.paidAt ?? item.createdAt, lang)}</TableCell>
                    <TableCell>
                      {item.canReconcile && item.orderId ? (
                        <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => void handleRecheck(item)} disabled={Boolean(busyOrderId)}>
                          {busyOrderId === item.orderId ? t({ en: 'Checking…', vi: 'Đang hỏi…' }) : t({ en: 'Recheck payOS', vi: 'Hỏi lại payOS' })}
                        </button>
                      ) : <span className="text-sm text-ink-muted">{t({ en: 'No order to recheck', vi: 'Chưa tìm thấy đơn' })}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {state === 'ready' && data && totalPages > 1 && (
          <nav aria-label={t({ en: 'Reconciliation pages', vi: 'Trang đối soát' })} className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-6">
            <span className="text-sm text-ink-muted">{t({ en: `Page ${page} of ${totalPages}`, vi: `Trang ${page} / ${totalPages}` })}</span>
            <div className="flex gap-2">
              <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                {t({ en: 'Previous', vi: 'Trước' })}
              </button>
              <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
                {t({ en: 'Next', vi: 'Sau' })}
              </button>
            </div>
          </nav>
        )}
      </Card>

      <BillingOrdersTable reloadKey={reloadKey} />
    </main>
  );
}
