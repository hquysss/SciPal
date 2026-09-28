'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import type { BillingAudience, BillingInterval } from '@scipal/types';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { formatVnd, limitText, startCheckout, type PublicPlan } from './billingApi';

type Props = {
  plans: PublicPlan[] | null;
  checkoutOpen: boolean;
  initialAudience?: BillingAudience;
  initialInterval?: BillingInterval;
  /** Role of the signed-in viewer, null for a visitor; read from the session when not given. */
  viewerRole?: ViewerRole | null;
};

type ViewerRole = 'student' | 'teacher' | 'admin';
type Bilingual = { vi: string; en: string };
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const segment = (active: boolean) =>
  `min-h-11 rounded-md px-4 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
    active ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
  }`;

const FREE_START: Record<BillingAudience, string> = { student: '/subjects', teacher: '/teacher/classes' };

export function PricingPage({ plans, checkoutOpen, initialAudience = 'student', initialInterval = 'month', viewerRole: givenRole }: Props) {
  const { t } = useLanguage();
  // undefined while the session is being read: the buy button waits.
  const [viewerRole, setViewerRole] = useState<ViewerRole | null | undefined>(givenRole);
  useEffect(() => {
    if (givenRole !== undefined || !checkoutOpen) return;
    let cancelled = false;
    createBrowserClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        const role = session?.user.app_metadata?.app_role;
        setViewerRole(!session ? null : role === 'admin' || role === 'teacher' ? role : 'student');
      })
      .catch(() => { if (!cancelled) setViewerRole(null); });
    return () => { cancelled = true; };
  }, [givenRole, checkoutOpen]);
  const [audience, setAudience] = useState<BillingAudience>(initialAudience);
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<Bilingual | null>(null);
  // One key per price while the page is open: a double click or a retry resumes the same order.
  const keys = useRef(new Map<string, string>());

  const buy = async (priceId: string) => {
    setBuying(priceId);
    setBuyError(null);
    let key = keys.current.get(priceId);
    if (!key) {
      key = newKey();
      keys.current.set(priceId, key);
    }
    const result = await startCheckout(priceId, key);
    if (!result.ok) {
      setBuyError(result.error);
      setBuying(null);
      return;
    }
    // Pay on the payOS page when a link exists; otherwise follow the order (paid or expired).
    window.location.assign(result.data.checkoutUrl ?? `/checkout/${result.data.orderId}`);
  };

  if (!plans) {
    return (
      <Alert tone="danger">
        <p>{t({ en: 'The price list could not be loaded. Please reload the page in a moment.', vi: 'Chưa tải được bảng giá. Hãy tải lại trang sau ít phút.' })}</p>
      </Alert>
    );
  }

  const shown = plans.filter((plan) => plan.audience === audience);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={t({ en: 'Plans for', vi: 'Gói dành cho' })} className="flex gap-1 self-start rounded-lg border border-edge bg-surface-sunken p-1">
          <button type="button" aria-pressed={audience === 'student'} onClick={() => setAudience('student')} className={segment(audience === 'student')}>
            {t({ en: 'Students', vi: 'Học sinh' })}
          </button>
          <button type="button" aria-pressed={audience === 'teacher'} onClick={() => setAudience('teacher')} className={segment(audience === 'teacher')}>
            {t({ en: 'Teachers', vi: 'Giáo viên' })}
          </button>
        </div>
        <div role="group" aria-label={t({ en: 'Billing period', vi: 'Chu kỳ thanh toán' })} className="flex gap-1 self-start rounded-lg border border-edge bg-surface-sunken p-1">
          <button type="button" aria-pressed={interval === 'month'} onClick={() => setInterval('month')} className={segment(interval === 'month')}>
            {t({ en: 'Monthly', vi: 'Theo tháng' })}
          </button>
          <button type="button" aria-pressed={interval === 'year'} onClick={() => setInterval('year')} className={segment(interval === 'year')}>
            {t({ en: 'Yearly', vi: 'Theo năm' })}
          </button>
        </div>
      </div>

      {buyError && (
        <Alert tone="danger">
          <p>{t(buyError)}</p>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((plan) => {
          const paid = plan.prices.length > 0;
          const price = plan.prices.find((p) => p.interval === interval);
          const monthly = plan.prices.find((p) => p.interval === 'month');
          const yearMonths = price && monthly && interval === 'year' ? Math.round(price.amountVnd / monthly.amountVnd) : null;
          return (
            <section
              key={plan.code}
              aria-labelledby={`plan-${plan.code}`}
              className={`flex flex-col gap-5 rounded-xl border bg-surface p-5 sm:p-6 ${paid ? 'border-action' : 'border-line'}`}
            >
              <div className="flex flex-col gap-1">
                <h2 id={`plan-${plan.code}`} className="text-lg font-bold text-ink">{t(plan.name)}</h2>
                <p className="text-sm text-ink-muted">{t(plan.description)}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">{formatVnd(price?.amountVnd ?? 0)}</span>
                  <span className="text-sm text-ink-muted">
                    {paid ? (interval === 'year' ? t({ en: '/ year', vi: '/ năm' }) : t({ en: '/ month', vi: '/ tháng' })) : t({ en: 'forever', vi: 'mãi mãi' })}
                  </span>
                </p>
                {paid && interval === 'year' && (
                  <p className="text-sm text-ink-muted">
                    {t({ en: 'Paid up front for 1 year', vi: 'trả trước 1 năm' })}
                    {yearMonths !== null && yearMonths < 12 && ` · ${t({ en: `the price of ${yearMonths} months`, vi: `bằng giá ${yearMonths} tháng` })}`}
                  </p>
                )}
              </div>

              <ul className="flex flex-col gap-2 text-sm text-ink">
                {plan.limits.map((limit) => (
                  <li key={limit.metric} className="flex gap-2">
                    <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-action" />
                    <span>{limitText(limit, t)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-2">
                {!paid ? (
                  <Link href={FREE_START[audience]} className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
                    {t({ en: 'Start for free', vi: 'Bắt đầu miễn phí' })}
                  </Link>
                ) : !checkoutOpen ? (
                  <>
                    <button type="button" disabled className={buttonVariants({ className: 'w-full' })}>
                      {t({ en: 'Coming soon', vi: 'Sắp mở bán' })}
                    </button>
                    <p className="text-center text-xs text-ink-muted">
                      {t({ en: 'QR and card payment open soon.', vi: 'Thanh toán bằng QR và thẻ sẽ mở sớm.' })}
                    </p>
                  </>
                ) : viewerRole === undefined ? (
                  <button type="button" disabled className={buttonVariants({ className: 'w-full' })}>
                    {t({ en: 'Buy with QR', vi: 'Mua bằng QR' })}
                  </button>
                ) : viewerRole === null ? (
                  <Link href="/login?redirect=%2Fpricing" className={buttonVariants({ className: 'w-full' })}>
                    {t({ en: 'Sign in to buy', vi: 'Đăng nhập để mua' })}
                  </Link>
                ) : viewerRole === 'admin' ? (
                  <p className="text-center text-sm text-ink-muted">
                    {t({ en: 'Admin accounts do not need a plan.', vi: 'Tài khoản quản trị không cần mua gói.' })}
                  </p>
                ) : viewerRole !== plan.audience ? (
                  <button type="button" disabled className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
                    {plan.audience === 'student' ? t({ en: 'A plan for students', vi: 'Gói dành cho học sinh' }) : t({ en: 'A plan for teachers', vi: 'Gói dành cho giáo viên' })}
                  </button>
                ) : price ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void buy(price.id)}
                      disabled={buying !== null}
                      aria-busy={buying === price.id}
                      className={buttonVariants({ className: 'w-full' })}
                    >
                      {buying === price.id ? t({ en: 'Opening the QR code…', vi: 'Đang mở mã QR…' }) : t({ en: 'Buy with QR', vi: 'Mua bằng QR' })}
                    </button>
                    <p className="text-center text-xs text-ink-muted">
                      {t({ en: 'Bank transfer by VietQR through payOS. The plan starts once the bank confirms.', vi: 'Chuyển khoản VietQR qua payOS. Gói có hiệu lực khi ngân hàng xác nhận.' })}
                    </p>
                  </>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
