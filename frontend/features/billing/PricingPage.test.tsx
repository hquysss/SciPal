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

  it('keeps MoMo renewal opt-in and shows the exact amount and cycle', () => {
    render(<PricingPage plans={plans} checkoutOpen payosCheckoutOpen momoAutoRenewOpen viewerRole="student" />);

    const consent = screen.getByRole('checkbox') as HTMLInputElement;
    expect(consent.checked).toBe(false);
    expect((screen.getByRole('button', { name: 'Mua bằng QR' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText(/39\.000 ₫ mỗi tháng/)).toBeTruthy();

    fireEvent.click(consent);
    expect(consent.checked).toBe(true);
    expect((screen.getByRole('button', { name: 'Tiếp tục với MoMo' }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /Theo năm/ }));
    expect(consent.checked).toBe(false);
    expect(screen.getByText(/390\.000 ₫ mỗi năm/)).toBeTruthy();
  });

  it('requires explicit MoMo opt-in when QR checkout is unavailable', () => {
    render(<PricingPage plans={plans} checkoutOpen payosCheckoutOpen={false} momoAutoRenewOpen viewerRole="student" />);

    expect((screen.getByRole('button', { name: 'Mua bằng QR' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    expect((screen.getByRole('button', { name: 'Tiếp tục với MoMo' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
