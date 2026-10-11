'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, QrCode, RefreshCcw, Sparkles } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import type { BillingAudience, BillingInterval } from '@scipal/types';
import { INTERVALS, INTERVAL_LABEL, INTERVAL_MONTHS, INTERVAL_NOUN, INTERVAL_SPAN, approxDays, canAutoRenew, savePercent } from './intervals';
import { Alert } from '@/components/ui/alert';
import { PricingLoadError } from './PricingLoadError';
import shared from '@/features/landing/pricing.module.css';
import { tilt, untilt } from '@/features/landing/tilt';
import { formatVnd, limitText, startCheckout, type PublicPlan } from './billingApi';
import s from './pricing-page.module.css';

type Props = {
  plans: PublicPlan[] | null;
  checkoutOpen: boolean;
  payosCheckoutOpen?: boolean;
  momoAutoRenewOpen?: boolean;
  vnpayCheckoutOpen?: boolean;
  vnpayAutoRenewOpen?: boolean;
  vnpaySandbox?: boolean;
  initialProvider?: 'payos' | 'vnpay' | 'momo';
  initialAudience?: BillingAudience;
  initialInterval?: BillingInterval;
  /** Role of the signed-in viewer, null for a visitor; read from the session when not given. */
  viewerRole?: ViewerRole | null;
};

type ViewerRole = 'student' | 'teacher' | 'admin';
type Bilingual = { vi: string; en: string };
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const FREE_START: Record<BillingAudience, string> = { student: '/subjects', teacher: '/teacher/classes' };

// Short answers to what people ask before paying; each one is what the code does today.
const FAQ: Array<{ q: Bilingual; a: Bilingual }> = [
  {
    q: { vi: 'Gói có tự gia hạn không?', en: 'Does a plan renew by itself?' },
    a: { vi: 'Thanh toán một lần qua payOS hoặc VNPAY. Tự gia hạn qua MoMo/VNPAY chỉ bật khi bạn chủ động chọn và đồng ý rõ số tiền, chu kỳ; có thể hủy trong mục Gói của tôi.', en: 'payOS and VNPAY offer one-time payments. MoMo/VNPAY renew only when you opt in and agree to the amount and billing period; cancel it from My Plan.' },
  },
  {
    q: { vi: 'Thanh toán như thế nào?', en: 'How do I pay?' },
    a: { vi: 'Chọn payOS để chuyển khoản VietQR hoặc VNPAY để xem phương thức được hỗ trợ. Gói có hiệu lực ngay khi ngân hàng xác nhận. SciPal không nhận và không lưu thông tin thẻ hay tài khoản ngân hàng.', en: 'Choose payOS for VietQR bank transfer or VNPAY for supported payment methods. The plan starts as soon as the bank confirms. SciPal never receives or stores card or bank details.' },
  },
  {
    q: { vi: 'Không mua gói thì còn học được không?', en: 'Can I learn without a plan?' },
    a: { vi: 'Được. Mọi bài học đều miễn phí; gói trả phí chỉ nâng số lượt Giáo sư Quý, lượt thi có chấm điểm và công cụ dạy học.', en: 'Yes. Every lesson is free; a paid plan only raises Professor Quys questions, graded exams and teaching tools.' },
  },
];

export function PricingPage({ plans, checkoutOpen, payosCheckoutOpen = checkoutOpen, momoAutoRenewOpen = false, vnpayCheckoutOpen = false, vnpayAutoRenewOpen = false, vnpaySandbox = false, initialProvider, initialAudience = 'student', initialInterval = 'month', viewerRole: givenRole }: Props) {
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
  const [oneTimeProvider, setOneTimeProvider] = useState<'payos' | 'vnpay'>(initialProvider === 'vnpay' && vnpayCheckoutOpen ? 'vnpay' : initialProvider === 'momo' || initialProvider === 'payos' ? 'payos' : vnpayCheckoutOpen && !payosCheckoutOpen ? 'vnpay' : 'payos');
  const renewalProvider = oneTimeProvider === 'vnpay' ? 'vnpay' : 'momo';
  const canRenew = (interval === 'month' || interval === 'year') && (renewalProvider === 'vnpay' ? vnpayAutoRenewOpen : momoAutoRenewOpen);
  const renewalName = renewalProvider === 'vnpay' ? 'VNPAY' : 'MoMo';
  const [autoRenew, setAutoRenew] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<Bilingual | null>(null);
  // One key per price while the page is open: a double click or a retry resumes the same order.
  const keys = useRef(new Map<string, string>());

  const buy = async (priceId: string, renew: boolean) => {
    const provider = renew ? renewalProvider : oneTimeProvider;
    if ((renew && !canRenew) || (!renew && !(oneTimeProvider === 'vnpay' ? vnpayCheckoutOpen : payosCheckoutOpen))) return;
    setBuying(priceId);
    setBuyError(null);
    const checkoutKey = `${provider}:${priceId}`;
    let key = keys.current.get(checkoutKey);
    if (!key) {
      key = newKey();
      keys.current.set(checkoutKey, key);
    }
    let result = await startCheckout(priceId, key, provider, renew);
    // That order was cancelled or ran out: this click starts a new one.
    if (result.ok && ['cancelled', 'expired', 'failed'].includes(result.data.status)) {
      key = newKey();
      keys.current.set(checkoutKey, key);
      result = await startCheckout(priceId, key, provider, renew);
    }
    if (!result.ok) {
      setBuyError(result.error);
      setBuying(null);
      return;
    }
    window.location.assign(result.data.checkoutUrl ?? `/checkout/${result.data.orderId}`);
  };

  if (!plans) {
    return <PricingLoadError />;
  }

  const shown = plans.filter((plan) => plan.audience === audience);
  const firstPaid = shown.find((plan) => plan.prices.length > 0);
  const offered = INTERVALS.filter((i) => firstPaid?.prices.some((p) => p.interval === i));

  const action = (plan: PublicPlan, paid: boolean, price: PublicPlan['prices'][number] | undefined) => {
    if (!paid) {
      return (
        <Link href={FREE_START[audience]} className={s.start}>
          {t({ en: 'Start for free', vi: 'Bắt đầu miễn phí' })}
        </Link>
      );
    }
    if (!checkoutOpen) {
      return (
        <>
          <button type="button" disabled className={s.buy}>
            {t({ en: 'Coming soon', vi: 'Sắp mở bán' })}
          </button>
          <p className={s.small}>{t({ en: 'Checkout is not available right now.', vi: 'Hiện chưa thể thanh toán.' })}</p>
        </>
      );
    }
    if (viewerRole === undefined) {
      return (
        <button type="button" disabled className={s.buy}>
          {t({ en: 'Continue to payment', vi: 'Tiếp tục thanh toán' })}
        </button>
      );
    }
    if (viewerRole === null) {
      return (
        <Link href="/login?redirect=%2Fpricing" className={s.buy}>
          {t({ en: 'Sign in to buy', vi: 'Đăng nhập để mua' })}
          <ArrowRight aria-hidden="true" />
        </Link>
      );
    }
    if (viewerRole === 'admin') {
      return <p className={s.small}>{t({ en: 'Admin accounts do not need a plan.', vi: 'Tài khoản quản trị không cần mua gói.' })}</p>;
    }
    if (viewerRole !== plan.audience) {
      return (
        <button type="button" disabled className={s.start}>
          {plan.audience === 'student' ? t({ en: 'A plan for students', vi: 'Gói dành cho học sinh' }) : t({ en: 'A plan for teachers', vi: 'Gói dành cho giáo viên' })}
        </button>
      );
    }
    if (!price) return null;
    const period = t(INTERVAL_NOUN[price.interval]);
    const canBuy = autoRenew ? canRenew : oneTimeProvider === 'vnpay' ? vnpayCheckoutOpen : payosCheckoutOpen;
    return (
      <>
        {vnpayCheckoutOpen && (
          <label className="mb-3 flex flex-col gap-2 text-sm text-ink-muted">
            <span>{t({ vi: 'Cổng thanh toán', en: 'Payment provider' })}</span>
            <select value={oneTimeProvider} onChange={(event) => { setOneTimeProvider(event.currentTarget.value === 'vnpay' ? 'vnpay' : 'payos'); setAutoRenew(false); }} disabled={buying !== null} className="min-h-11 rounded-lg border border-edge bg-surface px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
              <option value="payos" disabled={!payosCheckoutOpen}>payOS · VietQR</option>
              <option value="vnpay">VNPAY</option>
            </select>
          </label>
        )}
        {oneTimeProvider === 'vnpay' && vnpaySandbox && <p className={s.small}>{t({ vi: 'VNPAY đang ở chế độ thử nghiệm, không thu tiền thật.', en: 'VNPAY is in test mode; no real money is charged.' })}</p>}
        {canRenew && canAutoRenew(price.interval) && (
          <label className="mb-3 flex min-h-11 cursor-pointer items-start gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(event) => setAutoRenew(event.currentTarget.checked)}
              className="mt-1 size-4 shrink-0 accent-action"
            />
            <span>
              {t({
                en: `After authorization, ${renewalName} will charge ${formatVnd(price.amountVnd)} each ${period} for the first period, then each following period. Cancel from My Plan; a charge already in progress may finish.`,
                vi: `Sau khi bạn ủy quyền, ${renewalName} tự thu ${formatVnd(price.amountVnd)} mỗi ${period} cho kỳ đầu và các kỳ tiếp theo. Bạn có thể hủy trong mục Gói của tôi; lần thu đã bắt đầu có thể hoàn tất.`,
              })}
            </span>
          </label>
        )}
        <button
          type="button"
          onClick={() => void buy(price.id, autoRenew)}
          disabled={buying !== null || !canBuy}
          aria-busy={buying === price.id}
          className={s.buy}
        >
          {buying === price.id
            ? t({ en: 'Opening payment…', vi: 'Đang mở thanh toán…' })
            : oneTimeProvider === 'vnpay' ? autoRenew ? t({ en: 'Auto-renew with VNPAY', vi: 'Tự gia hạn với VNPAY' }) : t({ en: 'Pay with VNPAY', vi: 'Thanh toán với VNPAY' }) : autoRenew ? t({ en: 'Continue with MoMo', vi: 'Tiếp tục với MoMo' }) : t({ en: 'Buy with QR', vi: 'Mua bằng QR' })}
          {buying !== price.id && <ArrowRight aria-hidden="true" />}
        </button>
        {!autoRenew && oneTimeProvider === 'payos' && payosCheckoutOpen && <p className={s.small}>
          {t({ en: 'One-time bank transfer by VietQR through payOS. The plan starts once the bank confirms.', vi: 'Chuyển khoản VietQR một lần qua payOS. Gói có hiệu lực khi ngân hàng xác nhận.' })}
        </p>}
        {!autoRenew && oneTimeProvider === 'payos' && !payosCheckoutOpen && <p className={s.small}>{t({ en: 'Select MoMo auto-renewal to continue.', vi: 'Chọn gia hạn tự động MoMo để tiếp tục.' })}</p>}
      </>
    );
  };

  return (
    <div className={s.page}>
      <div className={s.controls}>
        <div role="group" aria-label={t({ en: 'Plans for', vi: 'Gói dành cho' })} className={shared.segment}>
        <button type="button" aria-pressed={audience === 'student'} onClick={() => { setAudience('student'); setAutoRenew(false); }}>
            {t({ en: 'Students', vi: 'Học sinh' })}
          </button>
        <button type="button" aria-pressed={audience === 'teacher'} onClick={() => { setAudience('teacher'); setAutoRenew(false); }}>
            {t({ en: 'Teachers', vi: 'Giáo viên' })}
          </button>
        </div>
        <div role="group" aria-label={t({ en: 'Billing period', vi: 'Chu kỳ thanh toán' })} className={shared.segment}>
        {offered.map((value) => {
            const save = savePercent(firstPaid?.prices ?? [], value);
            return (
              <button key={value} type="button" aria-pressed={interval === value} onClick={() => { setInterval(value); setAutoRenew(false); }}>
                {t(INTERVAL_LABEL[value])}
                {save > 0 && <span className={s.save}>−{save}%</span>}
              </button>
            );
          })}
        </div>
      </div>

      {buyError && (
        <Alert tone="danger">
          <p>{t(buyError)}</p>
        </Alert>
      )}

      <div className={`${s.plans} ${shared.pricingPage}`} data-count={shown.length}>
        {shown.map((plan) => {
          const paid = plan.prices.length > 0;
          const price = plan.prices.find((p) => p.interval === interval);
          const monthly = plan.prices.find((p) => p.interval === 'month');
          const paidMonths = price && monthly && interval !== 'month' ? Math.round(price.amountVnd / monthly.amountVnd) : null;
          const perDay = price ? Math.round(price.amountVnd / approxDays(interval) / 100) * 100 : 0;

          const body = (
            <>
              <h2 id={`plan-${plan.code}`} className={shared.planName}>
                {paid && <Sparkles aria-hidden="true" size={20} className={shared.spark} />}
                {t(plan.name)}
              </h2>
              <p className={s.description}>{t(plan.description)}</p>
              <p className={shared.price} key={`${audience}-${interval}`}>
                <span className={`${shared.amount} ${paid ? shared.amountPaid : ''}`}>{formatVnd(price?.amountVnd ?? 0)}</span>
                <span className={shared.per}>
                  {paid ? `/ ${t(INTERVAL_NOUN[interval])}` : t({ en: 'forever', vi: 'mãi mãi' })}
                </span>
              </p>
              {paid && interval !== 'month' && (
                <p className={shared.note}>
                  {t({ en: `Paid up front for ${INTERVAL_SPAN[interval].en}`, vi: `trả trước ${INTERVAL_SPAN[interval].vi}` })}
                  {paidMonths !== null && paidMonths < INTERVAL_MONTHS[interval] && ` · ${t({ en: `the price of ${paidMonths} months`, vi: `bằng giá ${paidMonths} tháng` })}`}
                </p>
              )}
              {paid && perDay > 0 && (
                <p className={s.perDay}>{t({ en: `About ${formatVnd(perDay)} a day`, vi: `Chỉ khoảng ${formatVnd(perDay)} mỗi ngày` })}</p>
              )}
              <ul className={shared.limits}>
                {plan.limits.map((limit) => (
                  <li key={limit.metric}>
                    <Check aria-hidden="true" size={16} />
                    <span>{limitText(limit, t)}</span>
                  </li>
                ))}
                {(plan.perks ?? []).map((p, index) => (
                  <li key={`perk-${index}`}>
                    <Check aria-hidden="true" size={16} />
                    <span>{t(p)}</span>
                  </li>
                ))}
              </ul>
              <div className={s.actions}>{action(plan, paid, price)}</div>
            </>
          );

          if (!paid) {
            return (
              <section key={plan.code} aria-labelledby={`plan-${plan.code}`} className={shared.free}>
                {body}
              </section>
            );
          }
          return (
            <div key={plan.code} className={shared.aura}>
              <span className={shared.sparkles} aria-hidden="true">
                {[0, 1, 2, 3, 4].map((n) => <Sparkles key={n} className={shared.sparkle} style={{ '--i': n } as React.CSSProperties} size={n === 2 ? 18 : 14} />)}
              </span>
              <section aria-labelledby={`plan-${plan.code}`} className={shared.paid} onPointerMove={tilt} onPointerLeave={untilt}>
                <span className={shared.badge}>{t({ en: 'Recommended', vi: 'Khuyên dùng' })}</span>
                {body}
              </section>
            </div>
          );
        })}
      </div>

      <ul className={s.trust}>
        <li><BookOpen aria-hidden="true" size={18} />{t({ en: 'Every lesson stays free', vi: 'Mọi bài học luôn miễn phí' })}</li>
        <li><RefreshCcw aria-hidden="true" size={18} />{t({ en: 'You choose whether to renew', vi: 'Bạn chủ động chọn gia hạn hay không' })}</li>
        {payosCheckoutOpen && <li><QrCode aria-hidden="true" size={18} />{t({ en: 'One-time VietQR via payOS', vi: 'Thanh toán một lần bằng VietQR qua payOS' })}</li>}
        {momoAutoRenewOpen && <li><RefreshCcw aria-hidden="true" size={18} />{t({ en: 'Optional MoMo auto-renewal', vi: 'Có thể chọn tự động gia hạn qua MoMo' })}</li>}
      </ul>

      <section className={s.faq} aria-labelledby="pricing-faq">
        <h2 id="pricing-faq">{t({ en: 'Before you buy', vi: 'Trước khi mua' })}</h2>
        {FAQ.map((item) => (
          <details key={item.q.en}>
            <summary>{t(item.q)}</summary>
            <p>{t(item.a)}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
