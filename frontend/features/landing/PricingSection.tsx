'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { BillingAudience, BillingInterval } from '@scipal/types';
import { formatVnd, limitText, type Catalog } from '@/features/billing/billingApi';
import styles from './pricing.module.css';

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

  const plans = catalog.plans.filter((p) => p.audience === audience);
  const free = plans.find((p) => p.prices.length === 0);
  const paid = plans.find((p) => p.prices.length > 0);
  const price = paid?.prices.find((p) => p.interval === interval);
  const monthly = paid?.prices.find((p) => p.interval === 'month');
  const yearMonths = price && monthly && interval === 'year' ? Math.round(price.amountVnd / monthly.amountVnd) : null;

  return (
    <section className={styles.pricing} aria-labelledby="pricing-title">
      <div className={styles.intro} data-landing-reveal>
        <h2 id="pricing-title" className={styles.title}>
          {t({ en: 'Learn free. Go further when you need to.', vi: 'Học miễn phí. Cần thêm thì nâng cấp.' })}
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

      <div className={styles.plans} data-landing-reveal>
        {free && (
          <article className={styles.free} aria-labelledby={`landing-${free.code}`}>
            <h3 id={`landing-${free.code}`} className={styles.planName}>{t(free.name)}</h3>
            <p className={styles.price}>
              <span className={styles.amount}>{formatVnd(0)}</span>
              <span className={styles.per}>{t({ en: 'forever', vi: 'mãi mãi' })}</span>
            </p>
            <ul className={styles.limits}>
              {free.limits.map((l) => (
                <li key={l.metric}>
                  <Check aria-hidden="true" size={16} />
                  <span>{limitText(l, t)}</span>
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
            <article className={styles.paid} aria-labelledby={`landing-${paid.code}`}>
              <h3 id={`landing-${paid.code}`} className={styles.planName}>
                <Sparkles aria-hidden="true" size={20} className={styles.spark} />
                {t(paid.name)}
              </h3>
              <p className={styles.price}>
                <span className={`${styles.amount} ${styles.amountPaid}`}>{formatVnd(price?.amountVnd ?? 0)}</span>
                <span className={styles.per}>{interval === 'year' ? t({ en: '/ year', vi: '/ năm' }) : t({ en: '/ month', vi: '/ tháng' })}</span>
              </p>
              <p className={styles.note}>
                {interval === 'year'
                  ? `${t({ en: 'Paid up front for 1 year', vi: 'trả trước 1 năm' })}${yearMonths !== null && yearMonths < 12 ? ` · ${t({ en: `the price of ${yearMonths} months`, vi: `bằng giá ${yearMonths} tháng` })}` : ''}`
                  : t({ en: 'No auto-renewal; the plan runs to the end of the period you paid for.', vi: 'Không tự gia hạn; gói chạy tới hết kỳ đã trả.' })}
              </p>
              <ul className={styles.limits}>
                {paid.limits.map((l) => (
                  <li key={l.metric}>
                    <Check aria-hidden="true" size={16} />
                    <span>{limitText(l, t)}</span>
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
