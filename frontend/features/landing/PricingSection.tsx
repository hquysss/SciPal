'use client';

import { useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CreditCard, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { BillingAudience, BillingInterval } from '@scipal/types';
import { INTERVALS, INTERVAL_LABEL, INTERVAL_MONTHS, INTERVAL_NOUN, INTERVAL_SPAN } from '@/features/billing/intervals';
import { formatVnd, limitText, type Catalog } from '@/features/billing/billingApi';
import { useCountUp, useInView } from './countUp';
import { tilt, untilt } from './tilt';
import styles from './pricing.module.css';

/** The price counting up from zero as the plans come into view; readers get the final amount. */
function CountingPrice({ amount, run, className }: { amount: number; run: boolean; className: string }) {
  const shown = useCountUp(amount, run);
  return (
    <>
      <span className={className} aria-hidden="true">{formatVnd(shown)}</span>
      <span className={styles.srOnly}>{formatVnd(amount)}</span>
    </>
  );
}

const item = (index: number) => ({ '--i': index }) as CSSProperties;

type Copy = { en: string; vi: string };
type PaymentMethod = { id: string; name: string; text: Copy; logo?: { src: string; width: number; height: number }; Icon?: LucideIcon };

/** The payment providers SciPal checks out with, with their logos; each shows only while the catalog says it is open. */
export function paymentMethods(catalog: Catalog): PaymentMethod[] {
  const all: Array<PaymentMethod | false> = [
    catalog.payosCheckoutOpen === true && { id: 'payos', name: 'payOS', text: { vi: 'Chuyển khoản qua payOS', en: 'Bank transfer via payOS' }, logo: { src: '/icons/payment/payos.png', width: 468, height: 192 } },
    catalog.payosCheckoutOpen === true && { id: 'vietqr', name: 'VietQR', text: { vi: 'Quét mã VietQR', en: 'Scan VietQR' }, logo: { src: '/icons/payment/vietqr.svg', width: 3000, height: 860 } },
    catalog.vnpayCheckoutOpen === true && { id: 'vnpay', name: 'VNPAY', text: { vi: 'Cổng thanh toán VNPAY', en: 'VNPAY payment gateway' }, Icon: CreditCard },
    catalog.momoAutoRenewOpen === true && { id: 'momo', name: 'MoMo', text: { vi: 'Ví MoMo, tự gia hạn', en: 'MoMo wallet, auto-renewal' }, logo: { src: '/icons/payment/momo.svg', width: 570, height: 570 } },
  ];
  return all.filter((m): m is PaymentMethod => m !== false);
}

/**
 * The plans on the landing page: the free sheet of paper next to the paid plan in its aura.
 * Prices and limits come from the backend catalog; buying happens on /pricing.
 */
export function PricingSection({
  catalog,
  initialAudience = 'student',
  initialInterval = 'month',
}: {
  catalog: Catalog;
  initialAudience?: BillingAudience;
  initialInterval?: BillingInterval;
}) {
  const { t } = useLanguage();
  const [audience, setAudience] = useState<BillingAudience>(initialAudience);
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, 0.2);

  const plans = catalog.plans.filter((p) => p.audience === audience);
  const free = plans.find((p) => p.prices.length === 0);
  const paid = plans.find((p) => p.prices.length > 0);
  const price = paid?.prices.find((p) => p.interval === interval);
  const monthly = paid?.prices.find((p) => p.interval === 'month');
  const paidMonths = price && monthly && interval !== 'month' ? Math.round(price.amountVnd / monthly.amountVnd) : null;
  const offered = INTERVALS.filter((i) => paid?.prices.some((p) => p.interval === i));
  const methods = catalog.checkoutOpen ? paymentMethods(catalog) : [];
  const renewable = catalog.momoAutoRenewOpen === true || catalog.vnpayAutoRenewOpen === true;

  return (
    <section ref={sectionRef} className={styles.pricing} aria-labelledby="pricing-title" data-inview={inView}>
      <div className={styles.stage} aria-hidden="true">
        <span className={styles.orbSun} />
        <span className={styles.orbCoral} />
        <span className={styles.orbSky} />
      </div>
      <div className={styles.intro} data-landing-reveal>
        <h2 id="pricing-title" className={styles.title}>
          <span className={styles.titleLine}>{t({ en: 'Learn free.', vi: 'Học miễn phí.' })}</span>{' '}
          <span className={`${styles.titleLine} ${styles.titleGlow}`}>
            {t({ en: 'Go further when you need to.', vi: 'Cần thêm thì nâng cấp.' })}
          </span>
        </h2>
        <p className={styles.lead}>
          {t({
            en: 'Every lesson stays free. A paid plan adds AI Professor tokens, graded exams and teaching tools.',
            vi: 'Mọi bài học vẫn miễn phí. Gói trả phí mở thêm token hỏi Giáo sư AI, lượt thi có chấm điểm và công cụ dạy học.',
          })}
        </p>
        <div className={styles.switches}>
          <div role="group" aria-label={t({ en: 'Plans for', vi: 'Gói dành cho' })} className={styles.segment}>
            <button type="button" aria-pressed={audience === 'student'} onClick={() => setAudience('student')}>
              {t({ en: 'Students', vi: 'Học sinh' })}
            </button>
            <button type="button" aria-pressed={audience === 'teacher'} onClick={() => setAudience('teacher')}>
              {t({ en: 'Teachers', vi: 'Giáo viên' })}
            </button>
          </div>
          <div role="group" aria-label={t({ en: 'Billing period', vi: 'Chu kỳ thanh toán' })} className={styles.segment}>
            {offered.map((value) => (
              <button key={value} type="button" aria-pressed={interval === value} onClick={() => setInterval(value)}>
                {t(INTERVAL_LABEL[value])}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.plans}>
        {free && (
          <article className={styles.free} aria-labelledby={`landing-${free.code}`}>
            <div className={styles.ticketMain}>
              <h3 id={`landing-${free.code}`} className={styles.planName}>{t(free.name)}</h3>
              <ul className={styles.limits}>
                {free.limits.map((l, index) => (
                  <li key={l.metric} style={item(index)}>
                    <Check aria-hidden="true" size={16} />
                    <span>{limitText(l, t)}</span>
                  </li>
                ))}
                {(free.perks ?? []).map((p, index) => (
                  <li key={`perk-${index}`} style={item(free.limits.length + index)}>
                    <Check aria-hidden="true" size={16} />
                    <span>{t(p)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.ticketStub}>
              <p className={styles.price}>
                <span className={styles.amount}>{formatVnd(0)}</span>
                <span className={styles.per}>{t({ en: 'forever', vi: 'mãi mãi' })}</span>
              </p>
              <Link href="/subjects" className={styles.freeAction}>
                {t({ en: 'Learn for free', vi: 'Học miễn phí' })}
              </Link>
            </div>
          </article>
        )}

        {paid && (
          <div className={styles.aura} data-aura="">
            <span className={styles.sparkles} aria-hidden="true">
              {[0, 1, 2, 3, 4].map((n) => <Sparkles key={n} className={styles.sparkle} style={item(n)} size={n === 2 ? 18 : 14} />)}
            </span>
            <article className={styles.paid} aria-labelledby={`landing-${paid.code}`} onPointerMove={tilt} onPointerLeave={untilt}>
              <span className={styles.badge}>{t({ en: 'Recommended', vi: 'Khuyên dùng' })}</span>
              <div className={styles.ticketMain}>
                <h3 id={`landing-${paid.code}`} className={styles.planName}>
                  <Sparkles aria-hidden="true" size={20} className={styles.spark} />
                  {t(paid.name)}
                </h3>
                <ul className={styles.limits}>
                  {paid.limits.map((l, index) => (
                    <li key={l.metric} style={item(index + 1)}>
                      <Check aria-hidden="true" size={16} />
                      <span>{limitText(l, t)}</span>
                    </li>
                  ))}
                  {(paid.perks ?? []).map((p, index) => (
                    <li key={`perk-${index}`} style={item(paid.limits.length + index + 1)}>
                      <Check aria-hidden="true" size={16} />
                      <span>{t(p)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.ticketStub}>
                <p className={styles.price} key={`${audience}-${interval}`}>
                  <CountingPrice amount={price?.amountVnd ?? 0} run={inView} className={`${styles.amount} ${styles.amountPaid}`} />
                  <span className={styles.per}>{`/ ${t(INTERVAL_NOUN[interval])}`}</span>
                </p>
                <p className={styles.note}>
                  {interval !== 'month'
                    ? `${t({ en: `Paid up front for ${INTERVAL_SPAN[interval].en}`, vi: `trả trước ${INTERVAL_SPAN[interval].vi}` })}${paidMonths !== null && paidMonths < INTERVAL_MONTHS[interval] ? ` · ${t({ en: `the price of ${paidMonths} months`, vi: `bằng giá ${paidMonths} tháng` })}` : ''}`
                    : renewable
                      ? t({ en: 'Renews only if you opt in with MoMo or VNPAY; otherwise it runs to the end of the period.', vi: 'Chỉ tự gia hạn khi bạn chọn qua MoMo hoặc VNPAY; nếu không, gói chạy tới hết kỳ đã trả.' })
                      : t({ en: 'No auto-renewal; the plan runs to the end of the period you paid for.', vi: 'Không tự gia hạn; gói chạy tới hết kỳ đã trả.' })}
                </p>
                {catalog.checkoutOpen ? (
                  <Link href={`/profile/payment-methods?plan=${paid.code}&interval=${interval}`} className={styles.paidAction}>
                    {t({ en: 'Upgrade now', vi: 'Nâng cấp ngay' })}
                    <ArrowRight aria-hidden="true" size={18} />
                  </Link>
                ) : (
                  <span className={`${styles.paidAction} ${styles.soon}`} aria-disabled="true">
                    {t({ en: 'Coming soon', vi: 'Sắp mở bán' })}
                  </span>
                )}
              </div>
            </article>
          </div>
        )}
      </div>

      {methods.length > 0 && (
        <div className={styles.methods} data-landing-reveal>
          <p className={styles.methodsTitle}>{t({ en: 'Pay securely with', vi: 'Thanh toán an toàn qua' })}</p>
          <ul className={styles.methodList}>
            {methods.map(({ id, name, Icon, logo, text }) => (
              <li key={id} className={styles.method}>
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a small brand logo from /public
                  <img src={logo.src} width={logo.width} height={logo.height} alt={name} className={styles.methodLogo} data-logo={id} loading="lazy" />
                ) : (
                  <span className={styles.methodName}>{Icon && <Icon aria-hidden="true" size={20} />}{name}</span>
                )}
                <span className={styles.methodText}>{t(text)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.methodsSafe}>
            <ShieldCheck aria-hidden="true" size={16} />
            {t({ en: 'SciPal never receives or stores card or bank details.', vi: 'SciPal không nhận và không lưu thông tin thẻ hay tài khoản ngân hàng.' })}
          </p>
        </div>
      )}
    </section>
  );
}
