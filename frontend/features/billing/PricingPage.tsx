'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { BillingAudience, BillingInterval } from '@scipal/types';
import { Alert } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { formatVnd, limitText, type PublicPlan } from './billingApi';

type Props = {
  plans: PublicPlan[] | null;
  checkoutOpen: boolean;
  initialAudience?: BillingAudience;
  initialInterval?: BillingInterval;
};

const segment = (active: boolean) =>
  `min-h-11 rounded-md px-4 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
    active ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
  }`;

const FREE_START: Record<BillingAudience, string> = { student: '/subjects', teacher: '/teacher/classes' };

export function PricingPage({ plans, checkoutOpen, initialAudience = 'student', initialInterval = 'month' }: Props) {
  const { t } = useLanguage();
  const [audience, setAudience] = useState<BillingAudience>(initialAudience);
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);

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
                ) : checkoutOpen ? null : (
                  <>
                    <button type="button" disabled className={buttonVariants({ className: 'w-full' })}>
                      {t({ en: 'Coming soon', vi: 'Sắp mở bán' })}
                    </button>
                    <p className="text-center text-xs text-ink-muted">
                      {t({ en: 'QR and card payment open soon.', vi: 'Thanh toán bằng QR và thẻ sẽ mở sớm.' })}
                    </p>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
