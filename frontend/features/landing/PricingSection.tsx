'use client';

import { useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { BillingAudience, BillingInterval } from '@scipal/types';
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
  const yearMonths = price && monthly && interval === 'year' ? Math.round(price.amountVnd / monthly.amountVnd) : null;

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
            en: 'Every lesson stays free. A paid plan adds AI tutor questions, graded exams and teaching tools.',
            vi: 'Mọi bài học vẫn miễn phí. Gói trả phí mở thêm lượt hỏi Gia sư AI, lượt thi có chấm điểm và công cụ dạy học.',
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
            <button type="button" aria-pressed={interval === 'month'} onClick={() => setInterval('month')}>
              {t({ en: 'Monthly', vi: 'Theo tháng' })}
            </button>
            <button type="button" aria-pressed={interval === 'year'} onClick={() => setInterval('year')}>
              {t({ en: 'Yearly', vi: 'Theo năm' })}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.plans}>
        {free && (
          <article className={styles.free} aria-labelledby={`landing-${free.code}`}>
            <h3 id={`landing-${free.code}`} className={styles.planName}>{t(free.name)}</h3>
            <p className={styles.price}>
              <span className={styles.amount}>{formatVnd(0)}</span>
              <span className={styles.per}>{t({ en: 'forever', vi: 'mãi mãi' })}</span>
            </p>
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
            <a href="#mon-hoc" className={styles.freeAction}>
              {t({ en: 'Learn for free', vi: 'Học miễn phí' })}
            </a>
          </article>
        )}

        {paid && (
          <div className={styles.aura} data-aura="">
            <span className={styles.sparkles} aria-hidden="true">
              {[0, 1, 2, 3, 4].map((n) => <span key={n} style={item(n)}>✦</span>)}
            </span>
            <article className={styles.paid} aria-labelledby={`landing-${paid.code}`} onPointerMove={tilt} onPointerLeave={untilt}>
              <span className={styles.badge}>{t({ en: 'Recommended', vi: 'Khuyên dùng' })}</span>
              <h3 id={`landing-${paid.code}`} className={styles.planName}>
                <Sparkles aria-hidden="true" size={20} className={styles.spark} />
                {t(paid.name)}
              </h3>
              <p className={styles.price} key={`${audience}-${interval}`}>
                <CountingPrice amount={price?.amountVnd ?? 0} run={inView} className={`${styles.amount} ${styles.amountPaid}`} />
                <span className={styles.per}>{interval === 'year' ? t({ en: '/ year', vi: '/ năm' }) : t({ en: '/ month', vi: '/ tháng' })}</span>
              </p>
              <p className={styles.note}>
                {interval === 'year'
                  ? `${t({ en: 'Paid up front for 1 year', vi: 'trả trước 1 năm' })}${yearMonths !== null && yearMonths < 12 ? ` · ${t({ en: `the price of ${yearMonths} months`, vi: `bằng giá ${yearMonths} tháng` })}` : ''}`
                  : t({ en: 'No auto-renewal; the plan runs to the end of the period you paid for.', vi: 'Không tự gia hạn; gói chạy tới hết kỳ đã trả.' })}
              </p>
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
              {catalog.checkoutOpen ? (
                <Link href="/pricing" className={styles.paidAction}>
                  {t({ en: 'Upgrade now', vi: 'Nâng cấp ngay' })}
                  <ArrowRight aria-hidden="true" size={18} />
                </Link>
              ) : (
                <span className={`${styles.paidAction} ${styles.soon}`} aria-disabled="true">
                  {t({ en: 'Coming soon', vi: 'Sắp mở bán' })}
                </span>
              )}
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
