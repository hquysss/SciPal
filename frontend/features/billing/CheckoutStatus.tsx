'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { PLAN_NAME, fetchOrder, formatVnd, type OrderView } from './billingApi';

type Bilingual = { vi: string; en: string };
export type CheckoutState = { status: 'loading' } | { status: 'error'; message: Bilingual } | { status: 'ready'; order: OrderView };

const TIME = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
// Ask again after 3 s, then a little slower, for at most 10 minutes; the button asks at once.
const POLL_DELAYS_MS = [3000, 3000, 5000, 5000, 10000];
const POLL_FOR_MS = 10 * 60_000;

export function CheckoutStatusView({ state, onCheck, checking = false }: { state: CheckoutState; onCheck?: () => void; checking?: boolean }) {
  const { t } = useLanguage();

  if (state.status === 'loading') {
    return <p role="status" className="text-sm text-ink-muted">{t({ vi: 'Đang tải đơn hàng…', en: 'Loading the order…' })}</p>;
  }
  if (state.status === 'error') {
    return (
      <Alert tone="danger">
        <p>{t(state.message)}</p>
        {onCheck && (
          <button type="button" onClick={onCheck} className={buttonVariants({ variant: 'outline', className: 'mt-3 self-start' })}>
            {t({ vi: 'Thử lại', en: 'Try again' })}
          </button>
        )}
      </Alert>
    );
  }

  const { order } = state;
  const plan = t(PLAN_NAME[order.planCode] ?? { vi: order.planCode, en: order.planCode });
  const period = order.interval === 'year' ? t({ vi: '1 năm', en: '1 year' }) : t({ vi: '1 tháng', en: '1 month' });

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-ink-muted">{t({ vi: 'Đơn hàng', en: 'Order' })}</p>
        <p className="text-lg font-bold text-ink">{plan} · {period}</p>
        <p className="text-2xl font-extrabold tabular-nums text-ink">{formatVnd(order.amountVnd)}</p>
      </section>

      {order.status === 'pending' && (
        <Alert title={t({ vi: 'Đang chờ xác nhận thanh toán', en: 'Waiting for the payment to be confirmed' })}>
          <p>
            {t({
              vi: `Quét mã QR trên trang payOS và chuyển khoản trước ${TIME.format(new Date(order.expiresAt))}. Trang này tự cập nhật khi ngân hàng xác nhận.`,
              en: `Scan the QR code on the payOS page and transfer before ${TIME.format(new Date(order.expiresAt))}. This page updates when the bank confirms.`,
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {order.checkoutUrl && (
              <a href={order.checkoutUrl} className={buttonVariants({})}>
                {t({ vi: 'Mở trang thanh toán', en: 'Open the payment page' })}
              </a>
            )}
            {onCheck && (
              <button type="button" onClick={onCheck} disabled={checking} className={buttonVariants({ variant: 'outline' })}>
                {checking ? t({ vi: 'Đang kiểm tra…', en: 'Checking…' }) : t({ vi: 'Kiểm tra lại', en: 'Check again' })}
              </button>
            )}
          </div>
        </Alert>
      )}

      {order.status === 'paid' && (
        <Alert tone="success" title={t({ vi: 'Thanh toán thành công', en: 'Payment received' })}>
          <p>{t({ vi: `${plan} đã được kích hoạt cho tài khoản của bạn.`, en: `${plan} is now active on your account.` })}</p>
          <Link href="/profile/plan" className={buttonVariants({ variant: 'outline', className: 'mt-3 self-start' })}>
            {t({ vi: 'Xem gói của tôi', en: 'See my plan' })}
          </Link>
        </Alert>
      )}

      {(order.status === 'expired' || order.status === 'cancelled' || order.status === 'failed') && (
        <Alert tone="warning" title={order.status === 'expired' ? t({ vi: 'Đơn đã hết hạn', en: 'This order has expired' }) : t({ vi: 'Đơn chưa được thanh toán', en: 'This order was not paid' })}>
          <p>
            {t({
              vi: 'Không có khoản nào bị trừ cho đơn này. Nếu bạn đã chuyển khoản, SciPal sẽ đối soát và liên hệ lại.',
              en: 'Nothing was charged for this order. If you did transfer money, SciPal will reconcile it and get back to you.',
            })}
          </p>
          <Link href="/pricing" className={buttonVariants({ variant: 'outline', className: 'mt-3 self-start' })}>
            {t({ vi: 'Về bảng giá', en: 'Back to pricing' })}
          </Link>
        </Alert>
      )}

      {order.status === 'reconciliation' && (
        <Alert tone="warning" title={t({ vi: 'Khoản thanh toán đang được đối soát', en: 'The payment is being reviewed' })}>
          <p>
            {t({
              vi: 'Khoản tiền nhận được không khớp đơn này (sai số tiền, đến sau hạn hoặc trả hai lần), nên đang được đối soát. SciPal sẽ kích hoạt gói hoặc hoàn tiền; bạn không cần trả lại.',
              en: 'The money received does not match this order (another amount, after the deadline, or paid twice), so it is being reviewed. SciPal will activate the plan or refund you; do not pay again.',
            })}
          </p>
        </Alert>
      )}
    </div>
  );
}

export function CheckoutStatus({ orderId }: { orderId: string }) {
  const [state, setState] = useState<CheckoutState>({ status: 'loading' });
  const [checking, setChecking] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    setChecking(true);
    const result = await fetchOrder(orderId);
    if (!alive.current) return null;
    setChecking(false);
    if (!result.ok) {
      setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', message: result.error }));
      return null;
    }
    setState({ status: 'ready', order: result.data });
    return result.data.status;
  }, [orderId]);

  useEffect(() => {
    alive.current = true;
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let step = 0;
    const tick = async () => {
      const status = await load();
      if (!alive.current || (status !== null && status !== 'pending') || Date.now() - started > POLL_FOR_MS) return;
      timer = setTimeout(() => void tick(), POLL_DELAYS_MS[Math.min(step++, POLL_DELAYS_MS.length - 1)]);
    };
    void tick();
    return () => {
      alive.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  return <CheckoutStatusView state={state} checking={checking} onCheck={() => void load()} />;
}
