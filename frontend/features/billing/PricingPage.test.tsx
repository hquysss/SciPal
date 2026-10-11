// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PricingPage } from './PricingPage';
import type { PublicPlan } from './billingApi';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ t: (copy: { vi: string }) => copy.vi }) }));

afterEach(() => {
  cleanup();
  refresh.mockReset();
});

const plans: PublicPlan[] = [
  {
    code: 'student_free', audience: 'student', name: { en: 'Free', vi: 'Miễn phí' }, description: { en: 'Free plan', vi: 'Gói miễn phí' },
    perks: [], active: true, version: 1, prices: [], limits: [],
  },
  {
    code: 'student_plus', audience: 'student', name: { en: 'Plus', vi: 'Plus' }, description: { en: 'Paid plan', vi: 'Gói trả phí' },
    perks: [], active: true, version: 1,
    prices: [
      { id: 'b0000000-0000-4000-8000-000000000001', interval: 'month', amountVnd: 39_000 },
      { id: 'b0000000-0000-4000-8000-000000000002', interval: 'year', amountVnd: 390_000 },
    ],
    limits: [],
  },
];

describe('PricingPage recovery', () => {
  it('offers an in-page retry when the plan catalog is unavailable', () => {
    render(<PricingPage plans={null} checkoutOpen={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('sends a signed-in student to payment methods with the plan and the period picked here', () => {
    render(<PricingPage plans={plans} checkoutOpen payosCheckoutOpen viewerRole="student" />);

    expect(screen.getByRole('link', { name: /Tiếp tục thanh toán/ }).getAttribute('href')).toBe('/profile/payment-methods?plan=student_plus&interval=month');
    fireEvent.click(screen.getByRole('button', { name: /Theo năm/ }));
    expect(screen.getByRole('link', { name: /Tiếp tục thanh toán/ }).getAttribute('href')).toBe('/profile/payment-methods?plan=student_plus&interval=year');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
