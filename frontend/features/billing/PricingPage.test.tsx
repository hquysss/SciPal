// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PricingPage } from './PricingPage';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ t: (copy: { vi: string }) => copy.vi }) }));

afterEach(() => {
  cleanup();
  refresh.mockReset();
});

describe('PricingPage recovery', () => {
  it('offers an in-page retry when the plan catalog is unavailable', () => {
    render(<PricingPage plans={null} checkoutOpen={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
