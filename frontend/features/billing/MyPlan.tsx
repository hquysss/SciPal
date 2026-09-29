'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import type { BillingAccount, EffectiveQuota } from '@scipal/types';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { METRIC, PLAN_NAME, fetchMyPlan, fetchTransactions, formatVnd, type Transaction } from './billingApi';

type Bilingual = { vi: string; en: string };
export type MyPlanState = { status: 'loading' } | { status: 'error'; message: Bilingual } | { status: 'ready'; account: BillingAccount };

const VIETNAM_DATE = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });

function QuotaMeter({ quota }: { quota: EffectiveQuota }) {
  const { t } = useLanguage();
  const taken = quota.used + quota.reserved;
  const left = Math.max(0, quota.limit - taken);
  const share = quota.limit > 0 ? Math.min(100, Math.round((taken / quota.limit) * 100)) : 100;
  const title = t(METRIC[quota.metric]?.title ?? { vi: quota.metric, en: quota.metric });
  const period =
    quota.kind === 'daily' ? t({ vi: ' hôm nay', en: ' today' }) : quota.kind === 'monthly' ? t({ vi: ' tháng này', en: ' this month' }) : '';
  const text =
    quota.kind === 'capacity'
      ? t({ vi: `Đang dùng ${taken} / ${quota.limit}`, en: `Using ${taken} of ${quota.limit}` })
      : t({ vi: `Còn ${left} / ${quota.limit}${period}`, en: `${left} of ${quota.limit} left${period}` });
  return (
    <li className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-sm tabular-nums text-ink-muted">{text}</span>
      </div>
      <div
        role="meter"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={quota.limit}
        aria-valuenow={Math.min(taken, quota.limit)}
        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div className={`h-full rounded-full ${left === 0 ? 'bg-danger' : 'bg-action'}`} style={{ width: `${share}%` }} />
      </div>
      {quota.source === 'override' && (
        <span className="text-xs text-ink-muted">
          {t({ vi: 'Hạn mức riêng do quản trị viên cấp', en: 'A custom limit set by an admin' })}
          {quota.expiresAt && ` · ${t({ vi: 'đến', en: 'until' })} ${VIETNAM_DATE.format(new Date(quota.expiresAt))}`}
        </span>
      )}
    </li>
  );
}

export function MyPlanView({ state, onRetry }: { state: MyPlanState; onRetry?: () => void }) {
  const { t } = useLanguage();

  if (state.status === 'loading') {
    return <p className="text-sm text-ink-muted" role="status">{t({ vi: 'Đang tải gói của bạn…', en: 'Loading your plan…' })}</p>;
  }
  if (state.status === 'error') {
    return (
      <Alert tone="danger">
        <p>{t(state.message)}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className={buttonVariants({ variant: 'outline', className: 'mt-3 self-start' })}>
            {t({ vi: 'Thử lại', en: 'Try again' })}
          </button>
        )}
      </Alert>
    );
  }

  const { account } = state;
  if (account.role === 'admin') {
    return (
      <Alert>
        <p>{t({ vi: 'Tài khoản quản trị viên không có gói và không bị giới hạn lượt dùng.', en: 'Admin accounts have no plan and are not limited.' })}</p>
      </Alert>
    );
  }

  const planName = t(PLAN_NAME[account.plan ?? ''] ?? { vi: account.plan ?? '', en: account.plan ?? '' });
  const isFree = !account.paidThrough;
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-muted">{t({ vi: 'Gói hiện tại', en: 'Current plan' })}</p>
          <p className="text-xl font-bold text-ink">{planName}</p>
          {account.paidThrough && (
            <p className="text-sm text-ink-muted">
              {t({ vi: 'Có hiệu lực đến', en: 'Active until' })} {VIETNAM_DATE.format(new Date(account.paidThrough))}
            </p>
          )}
        </div>
        <Link href="/pricing" className={buttonVariants({ variant: isFree ? 'default' : 'outline' })}>
          {isFree ? t({ vi: 'Xem gói nâng cấp', en: 'See upgrade plans' }) : t({ vi: 'Xem bảng giá', en: 'See pricing' })}
        </Link>
      </section>

      <section aria-labelledby="my-plan-usage" className="rounded-xl border border-line bg-surface px-5 py-2">
        <h2 id="my-plan-usage" className="pt-3 text-base font-bold text-ink">{t({ vi: 'Lượt dùng', en: 'Usage' })}</h2>
        <ul>
          {account.quotas.map((quota) => <QuotaMeter key={quota.metric} quota={quota} />)}
        </ul>
        <p className="pb-3 text-xs text-ink-muted">
          {t({ vi: 'Lượt theo ngày làm mới lúc 0:00, lượt theo tháng làm mới ngày 1 (giờ Việt Nam).', en: 'Daily counts reset at midnight, monthly counts on the 1st (Vietnam time).' })}
        </p>
      </section>
    </div>
  );
}

export type TransactionsState =
  | { status: 'loading' }
  | { status: 'error'; message: Bilingual }
  | { status: 'ready'; items: Transaction[]; nextCursor: string | null; loadingMore: boolean };

const STATUS: Record<string, { label: Bilingual; tone: string }> = {
  paid: { label: { vi: 'Đã thanh toán', en: 'Paid' }, tone: 'text-success' },
  pending: { label: { vi: 'Đang chờ thanh toán', en: 'Waiting for payment' }, tone: 'text-ink-muted' },
  expired: { label: { vi: 'Hết hạn', en: 'Expired' }, tone: 'text-ink-muted' },
  cancelled: { label: { vi: 'Đã hủy', en: 'Cancelled' }, tone: 'text-ink-muted' },
  failed: { label: { vi: 'Không thành công', en: 'Failed' }, tone: 'text-danger' },
  reconciliation: { label: { vi: 'Đang đối soát', en: 'Under review' }, tone: 'text-warning' },
};

/** Payment receipts of the account (not tax invoices). */
export function TransactionsView({ state, onMore }: { state: TransactionsState; onMore: () => void }) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="my-plan-transactions" className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-5 py-4">
      <h2 id="my-plan-transactions" className="text-base font-bold text-ink">{t({ vi: 'Lịch sử giao dịch', en: 'Payment history' })}</h2>
      {state.status === 'loading' && <p role="status" className="text-sm text-ink-muted">{t({ vi: 'Đang tải…', en: 'Loading…' })}</p>}
      {state.status === 'error' && <p className="text-sm text-danger">{t(state.message)}</p>}
      {state.status === 'ready' && state.items.length === 0 && (
        <p className="text-sm text-ink-muted">{t({ vi: 'Chưa có giao dịch nào.', en: 'No payments yet.' })}</p>
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line">
          {state.items.map((tx) => {
            const status = STATUS[tx.status] ?? { label: { vi: tx.status, en: tx.status }, tone: 'text-ink-muted' };
            const plan = t(PLAN_NAME[tx.planCode] ?? { vi: tx.planCode, en: tx.planCode });
            const period = tx.interval === 'year' ? t({ vi: '1 năm', en: '1 year' }) : t({ vi: '1 tháng', en: '1 month' });
            return (
              <li key={tx.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-ink">{plan} · {period}</span>
                  <span className="text-xs text-ink-muted">{VIETNAM_DATE.format(new Date(tx.createdAt))}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold tabular-nums text-ink">{formatVnd(tx.amountVnd)}</span>
                  {tx.status === 'pending' ? (
                    <Link href={`/checkout/${tx.id}`} className={`text-xs underline underline-offset-4 ${status.tone}`}>{t(status.label)}</Link>
                  ) : (
                    <span className={`text-xs ${status.tone}`}>{t(status.label)}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {state.status === 'ready' && state.nextCursor && (
        <button type="button" onClick={onMore} disabled={state.loadingMore} className={buttonVariants({ variant: 'outline', className: 'self-start' })}>
          {state.loadingMore ? t({ vi: 'Đang tải…', en: 'Loading…' }) : t({ vi: 'Xem thêm', en: 'Show more' })}
        </button>
      )}
    </section>
  );
}

function Transactions() {
  const [state, setState] = useState<TransactionsState>({ status: 'loading' });
  const load = useCallback(async (cursor?: string) => {
    if (cursor) setState((prev) => (prev.status === 'ready' ? { ...prev, loadingMore: true } : prev));
    const result = await fetchTransactions(cursor);
    setState((prev) => {
      if (!result.ok) return prev.status === 'ready' ? { ...prev, loadingMore: false } : { status: 'error', message: result.error };
      const before = cursor && prev.status === 'ready' ? prev.items : [];
      return { status: 'ready', items: [...before, ...result.data.items], nextCursor: result.data.nextCursor, loadingMore: false };
    });
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <TransactionsView state={state} onMore={() => { if (state.status === 'ready' && state.nextCursor) void load(state.nextCursor); }} />;
}

export function MyPlan() {
  const [state, setState] = useState<MyPlanState>({ status: 'loading' });
  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await fetchMyPlan();
    setState(result.ok ? { status: 'ready', account: result.data } : { status: 'error', message: result.error });
  }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <>
      <MyPlanView state={state} onRetry={() => void load()} />
      {state.status === 'ready' && state.account.role !== 'admin' && <Transactions />}
    </>
  );
}
