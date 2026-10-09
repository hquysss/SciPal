import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { PricingSection } from './PricingSection';
import { LandingPage } from './LandingPage';
import type { Catalog, PublicPlan } from '@/features/billing/billingApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/features/survey/DemandPollBanner', () => ({ DemandPollBanner: () => <div data-poll="" /> }));
vi.mock('./hero/HeroStage', () => ({ HeroStage: () => <div /> }));

const P = (n: number) => `b0000000-0000-4000-8000-00000000000${n}`;
const plan = (code: PublicPlan['code'], vi: string, prices: PublicPlan['prices'], limits: PublicPlan['limits']): PublicPlan => ({
  code, audience: code.startsWith('student') ? 'student' : 'teacher', name: { en: code, vi }, description: { en: 'd', vi: `Mô tả ${vi}` }, active: true, version: 1, prices, limits,
});
const catalog = (checkoutOpen: boolean): Catalog => ({
  checkoutOpen,
  plans: [
    plan('student_free', 'Học sinh Miễn phí', [], [{ metric: 'tutor_requests', kind: 'daily', limit: 5 }]),
    plan('student_plus', 'Học sinh Plus', [{ id: P(1), interval: 'month', amountVnd: 39000 }, { id: P(2), interval: 'year', amountVnd: 390000 }], [{ metric: 'tutor_requests', kind: 'monthly', limit: 200 }]),
    plan('teacher_free', 'Giáo viên Miễn phí', [], [{ metric: 'active_classes', kind: 'capacity', limit: 1 }]),
    plan('teacher_pro', 'Giáo viên Pro', [{ id: P(3), interval: 'month', amountVnd: 99000 }, { id: P(4), interval: 'year', amountVnd: 990000 }], [{ metric: 'active_classes', kind: 'capacity', limit: 10 }]),
  ],
});

describe('PricingSection (landing)', () => {
  it('shows the free and paid student plans, the paid one crowned with the aura and a way to buy', () => {
    const html = renderToStaticMarkup(<PricingSection catalog={catalog(true)} />);
    expect(html).toContain('Học sinh Miễn phí');
    expect(html).toContain('Học sinh Plus');
    expect(html).toContain('39.000 ₫');
    expect(html).toContain('200 lượt hỏi Giáo sư SciPal mỗi tháng');
    expect(html).toContain('data-aura=""');
    expect(html).toContain('href="/pricing"');
    expect(html).not.toContain('Giáo viên Pro');
    expect(countRawColors(html).total).toBe(0);
  });

  it('crowns the paid plan and plays its entrance each time it scrolls into view', () => {
    const html = renderToStaticMarkup(<PricingSection catalog={catalog(true)} />);
    expect(html).toContain('Khuyên dùng');
    // Off screen until the observer says otherwise; the entrance keys off this attribute.
    expect(html).toMatch(/<section[^>]*data-inview="false"/);
    // The counting number is decoration; readers get the price once.
    expect(html).toMatch(/<span class="[^"]*srOnly[^"]*">39\.000 ₫<\/span>/);
  });

  it('switches to teachers and to the yearly price paid up front', () => {
    const html = renderToStaticMarkup(<PricingSection catalog={catalog(true)} initialAudience="teacher" initialInterval="year" />);
    expect(html).toContain('Giáo viên Pro');
    expect(html).toContain('990.000 ₫');
    expect(html).toContain('trả trước 1 năm');
  });

  it('says paid plans are coming soon while checkout is closed', () => {
    const html = renderToStaticMarkup(<PricingSection catalog={catalog(false)} />);
    expect(html).toContain('Sắp mở bán');
  });
});

describe('LandingPage with pricing', () => {
  const render = (pricing: Catalog | null) => renderToStaticMarkup(
    <LandingPage level="upper_secondary" catalog={{ kind: 'ready', subjects: [] }} informatics={{ kind: 'empty' }} pricing={pricing} />,
  );

  it('puts the plans between the tutor and the final call to action', () => {
    const html = render(catalog(true));
    const tutor = html.indexOf('id="tutor-title"');
    const pricing = html.indexOf('id="pricing-title"');
    const final = html.indexOf('id="start-title"');
    expect(tutor).toBeGreaterThan(-1);
    expect(pricing).toBeGreaterThan(tutor);
    expect(final).toBeGreaterThan(pricing);
  });

  it('leaves the section out when the catalog could not be read', () => {
    expect(render(null)).not.toContain('id="pricing-title"');
  });
});
