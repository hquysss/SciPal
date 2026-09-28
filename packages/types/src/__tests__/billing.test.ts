import { describe, expect, it } from 'vitest';
import {
  BillingCatalogSchema,
  CheckoutInputSchema,
  EffectiveQuotaSchema,
  PaymentEventSchema,
  PlanCodeSchema,
  QuotaChangeSchema,
  QuotaMetricSchema,
} from '../billing.js';

describe('billing contracts', () => {
  it('accepts only the four published plan codes and quota metrics', () => {
    expect(['student_free', 'student_plus', 'teacher_free', 'teacher_pro'].every(
      (code) => PlanCodeSchema.safeParse(code).success,
    )).toBe(true);
    expect(PlanCodeSchema.safeParse('admin').success).toBe(false);
    expect(QuotaMetricSchema.safeParse('author_ai_requests').success).toBe(true);
    expect(QuotaMetricSchema.safeParse('unlimited').success).toBe(false);
  });

  it('validates bilingual catalog entries and requires both paid intervals', () => {
    const catalog = [
      { code: 'student_free', audience: 'student', name: { en: 'Free', vi: 'Miễn phí' }, description: { en: 'Free', vi: 'Miễn phí' }, active: true, version: 1, limits: [], prices: [] },
      { code: 'student_plus', audience: 'student', name: { en: 'Plus', vi: 'Plus' }, description: { en: 'Plus', vi: 'Plus' }, active: true, version: 1, limits: [{ metric: 'tutor_requests', kind: 'monthly', limit: 200 }], prices: [
        { id: 'b0000000-0000-4000-8000-000000000001', interval: 'month', amountVnd: 39000 },
        { id: 'b0000000-0000-4000-8000-000000000002', interval: 'year', amountVnd: 390000 },
      ] },
      { code: 'teacher_free', audience: 'teacher', name: { en: 'Free', vi: 'Miễn phí' }, description: { en: 'Free', vi: 'Miễn phí' }, active: true, version: 1, limits: [], prices: [] },
      { code: 'teacher_pro', audience: 'teacher', name: { en: 'Pro', vi: 'Pro' }, description: { en: 'Pro', vi: 'Pro' }, active: true, version: 1, limits: [{ metric: 'tutor_requests', kind: 'monthly', limit: 200 }], prices: [
        { id: 'b0000000-0000-4000-8000-000000000003', interval: 'month', amountVnd: 99000 },
        { id: 'b0000000-0000-4000-8000-000000000004', interval: 'year', amountVnd: 990000 },
      ] },
    ];
    expect(BillingCatalogSchema.safeParse(catalog).success).toBe(true);
    expect(BillingCatalogSchema.safeParse(catalog.map((plan) => plan.code === 'student_free'
      ? { ...plan, prices: [{ id: 'b0000000-0000-4000-8000-000000000005', interval: 'month', amountVnd: 1 }] }
      : plan)).success).toBe(false);
    expect(BillingCatalogSchema.safeParse(catalog.map((plan) => plan.code === 'teacher_pro'
      ? { ...plan, prices: plan.prices.slice(0, 1) }
      : plan)).success).toBe(false);
  });

  it('accepts zero limits, non-negative usage, and nullable effective overrides', () => {
    expect(EffectiveQuotaSchema.safeParse({
      metric: 'author_ai_requests',
      kind: 'monthly',
      limit: 0,
      used: 0,
      reserved: 0,
      source: 'plan',
      expiresAt: null,
      resetsAt: '2026-10-01T00:00:00.000Z',
    }).success).toBe(true);
    expect(EffectiveQuotaSchema.safeParse({
      metric: 'tutor_requests',
      kind: 'monthly',
      limit: 200,
      used: -1,
      reserved: 0,
      source: 'override',
      expiresAt: null,
      resetsAt: null,
    }).success).toBe(false);
  });

  it('requires explicit set or reset quota changes and rejects negative/fractional limits', () => {
    expect(QuotaChangeSchema.safeParse({
      metric: 'tutor_requests',
      action: 'set',
      limit: 500,
      expiresAt: null,
    }).success).toBe(true);
    expect(QuotaChangeSchema.safeParse({ metric: 'tutor_requests', action: 'set', limit: -1, expiresAt: null }).success).toBe(false);
    expect(QuotaChangeSchema.safeParse({ metric: 'tutor_requests', action: 'set', limit: 1.5, expiresAt: null }).success).toBe(false);
    expect(QuotaChangeSchema.safeParse({ metric: 'tutor_requests', action: 'reset', limit: 0 }).success).toBe(false);
  });

  it('keeps checkout requests server-priced and rejects caller-supplied fields', () => {
    expect(CheckoutInputSchema.safeParse({
      priceId: 'b0000000-0000-4000-8000-000000000001',
      provider: 'vnpay',
      idempotencyKey: 'order-attempt-1',
      autoRenew: false,
    }).success).toBe(true);
    expect(CheckoutInputSchema.safeParse({
      priceId: 'b0000000-0000-4000-8000-000000000001',
      provider: 'vnpay',
      idempotencyKey: 'order-attempt-1',
      autoRenew: false,
      amountVnd: 1,
    }).success).toBe(false);
    expect(CheckoutInputSchema.safeParse({
      priceId: 'b0000000-0000-4000-8000-000000000001',
      provider: 'vnpay',
      idempotencyKey: 'order-attempt-1',
      autoRenew: false,
      userId: 'another-account',
    }).success).toBe(false);
  });

  it('accepts only normalized verified VND payment events', () => {
    const event = {
      provider: 'payos',
      merchantRef: 'order-1001',
      providerTransactionId: 'payment-1',
      amountVnd: 39000,
      currency: 'VND',
      outcome: 'paid',
      paidAt: '2026-09-28T10:00:00.000Z',
    };
    expect(PaymentEventSchema.safeParse(event).success).toBe(true);
    expect(PaymentEventSchema.safeParse({ ...event, amountVnd: -1 }).success).toBe(false);
    expect(PaymentEventSchema.safeParse({ ...event, currency: 'USD' }).success).toBe(false);
  });
});
