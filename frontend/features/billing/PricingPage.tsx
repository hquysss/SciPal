'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, QrCode, RefreshCcw, Sparkles } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import type { BillingAudience, BillingInterval } from '@scipal/types';
import { Alert } from '@/components/ui/alert';
import shared from '@/features/landing/pricing.module.css';
import { tilt, untilt } from '@/features/landing/tilt';
import { formatVnd, limitText, startCheckout, type PublicPlan } from './billingApi';
import s from './pricing-page.module.css';

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

const FREE_START: Record<BillingAudience, string> = { student: '/subjects', teacher: '/teacher/classes' };

// Short answers to what people ask before paying; each one is what the code does today.
const FAQ: Array<{ q: Bilingual; a: Bilingual }> = [
  {
    q: { vi: 'Gói có tự gia hạn không?', en: 'Does a plan renew by itself?' },
    a: { vi: 'Không. Gói chạy tới hết kỳ bạn đã trả; muốn dùng tiếp thì mua thêm kỳ mới.', en: 'No. A plan runs to the end of the period you paid for; buy another period to keep it.' },
  },
  {
    q: { vi: 'Thanh toán như thế nào?', en: 'How do I pay?' },
    a: { vi: 'Quét mã VietQR bằng ứng dụng ngân hàng, qua cổng payOS. Gói có hiệu lực ngay khi ngân hàng xác nhận. SciPal không nhận và không lưu thông tin thẻ hay tài khoản ngân hàng.', en: 'Scan the VietQR code with your banking app, through payOS. The plan starts as soon as the bank confirms. SciPal never receives or stores card or bank details.' },
  },
  {
    q: { vi: 'Không mua gói thì còn học được không?', en: 'Can I learn without a plan?' },
    a: { vi: 'Được. Mọi bài học đều miễn phí; gói trả phí chỉ nâng số lượt Giáo sư SciPal, lượt thi có chấm điểm và công cụ dạy học.', en: 'Yes. Every lesson is free; a paid plan only raises SciPal Professor questions, graded exams and teaching tools.' },
  },
];

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
    let result = await startCheckout(priceId, key);
    // That order was cancelled or ran out: this click starts a new one.
    if (result.ok && ['cancelled', 'expired', 'failed'].includes(result.data.status)) {
      key = newKey();
      keys.current.set(priceId, key);
      result = await startCheckout(priceId, key);
    }
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
  const firstPaid = shown.find((plan) => plan.prices.length > 0);
  const firstMonth = firstPaid?.prices.find((p) => p.interval === 'month');
  const firstYear = firstPaid?.prices.find((p) => p.interval === 'year');
  const savePercent = firstMonth && firstYear ? Math.round((1 - firstYear.amountVnd / (firstMonth.amountVnd * 12)) * 100) : 0;

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
          <p className={s.small}>{t({ en: 'QR and card payment open soon.', vi: 'Thanh toán bằng QR và thẻ sẽ mở sớm.' })}</p>
        </>
      );
    }
    if (viewerRole === undefined) {
      return (
        <button type="button" disabled className={s.buy}>
          {t({ en: 'Buy with QR', vi: 'Mua bằng QR' })}
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
    return (
      <>
        <button
          type="button"
          onClick={() => void buy(price.id)}
          disabled={buying !== null}
          aria-busy={buying === price.id}
          className={s.buy}
        >
          {buying === price.id ? t({ en: 'Opening the QR code…', vi: 'Đang mở mã QR…' }) : t({ en: 'Buy with QR', vi: 'Mua bằng QR' })}
          {buying !== price.id && <ArrowRight aria-hidden="true" />}
        </button>
        <p className={s.small}>
          {t({ en: 'Bank transfer by VietQR through payOS. The plan starts once the bank confirms.', vi: 'Chuyển khoản VietQR qua payOS. Gói có hiệu lực khi ngân hàng xác nhận.' })}
        </p>
      </>
    );
  };

  return (
    <div className={s.page}>
      <div className={s.controls}>
        <div role="group" aria-label={t({ en: 'Plans for', vi: 'Gói dành cho' })} className={shared.segment}>
          <button type="button" aria-pressed={audience === 'student'} onClick={() => setAudience('student')}>
            {t({ en: 'Students', vi: 'Học sinh' })}
          </button>
          <button type="button" aria-pressed={audience === 'teacher'} onClick={() => setAudience('teacher')}>
            {t({ en: 'Teachers', vi: 'Giáo viên' })}
          </button>
        </div>
        <div role="group" aria-label={t({ en: 'Billing period', vi: 'Chu kỳ thanh toán' })} className={shared.segment}>
          <button type="button" aria-pressed={interval === 'month'} onClick={() => setInterval('month')}>
            {t({ en: 'Monthly', vi: 'Theo tháng' })}
          </button>
          <button type="button" aria-pressed={interval === 'year'} onClick={() => setInterval('year')}>
            {t({ en: 'Yearly', vi: 'Theo năm' })}
            {savePercent > 0 && <span className={s.save}>−{savePercent}%</span>}
          </button>
        </div>
      </div>

      {buyError && (
        <Alert tone="danger">
          <p>{t(buyError)}</p>
        </Alert>
      )}

      <div className={s.plans} data-count={shown.length}>
        {shown.map((plan) => {
          const paid = plan.prices.length > 0;
          const price = plan.prices.find((p) => p.interval === interval);
          const monthly = plan.prices.find((p) => p.interval === 'month');
          const yearMonths = price && monthly && interval === 'year' ? Math.round(price.amountVnd / monthly.amountVnd) : null;
          const perDay = price ? Math.round(price.amountVnd / (interval === 'year' ? 365 : 30) / 100) * 100 : 0;

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
                  {paid ? (interval === 'year' ? t({ en: '/ year', vi: '/ năm' }) : t({ en: '/ month', vi: '/ tháng' })) : t({ en: 'forever', vi: 'mãi mãi' })}
                </span>
              </p>
              {paid && interval === 'year' && (
                <p className={shared.note}>
                  {t({ en: 'Paid up front for 1 year', vi: 'trả trước 1 năm' })}
                  {yearMonths !== null && yearMonths < 12 && ` · ${t({ en: `the price of ${yearMonths} months`, vi: `bằng giá ${yearMonths} tháng` })}`}
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
                {[0, 1, 2, 3, 4].map((n) => <span key={n} style={{ '--i': n } as CSSProperties}>✦</span>)}
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
        <li><RefreshCcw aria-hidden="true" size={18} />{t({ en: 'No auto-renewal', vi: 'Không tự gia hạn' })}</li>
        <li><QrCode aria-hidden="true" size={18} />{t({ en: 'VietQR via payOS', vi: 'Thanh toán VietQR qua payOS' })}</li>
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
