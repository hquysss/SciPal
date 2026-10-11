// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PaymentMethodsView } from './PaymentMethods';
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (copy: { vi: string }) => copy.vi }) }));
afterEach(cleanup);
const catalog = { plans: [], checkoutOpen: true, payosCheckoutOpen: true, vnpayCheckoutOpen: true, vnpayAutoRenewOpen: true, momoAutoRenewOpen: false };
it('selects an available provider for pricing and keeps unconfigured providers visible but disabled', () => {
 render(<PaymentMethodsView catalog={catalog} account={null} accountStatus="ready" />);
 expect((screen.getByRole('radio', { name: /MoMo/ }) as HTMLInputElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('radio', { name: /VNPAY/ }));
 expect(screen.getByRole('link', { name: /Tiếp tục với VNPAY/ }).getAttribute('href')).toBe('/pricing?provider=vnpay');
 expect(screen.getByText('Có thể tự gia hạn')).toBeTruthy();
});
it('keeps cancellation pending visible alongside paid access', () => {
 render(<PaymentMethodsView catalog={catalog} accountStatus="ready" account={{ role: 'student', plan: 'student_plus', quotas: [], paidThrough: '2026-11-10T00:00:00.000Z', renewal: { provider: 'vnpay', status: 'cancel_pending', interval: 'month', amountVnd: 39000, nextChargeAt: null } }} onCancel={()=>{}} />);
 expect(screen.getByText(/Đang chờ VNPAY xác nhận hủy/)).toBeTruthy();
 expect(screen.getByRole('button', { name: 'Kiểm tra trạng thái hủy' })).toBeTruthy();
 expect(screen.getByText(/Không bắt đầu kỳ thu mới/)).toBeTruthy();
});
it('does not pretend account-loading failure means no linked renewal', () => {
 render(<PaymentMethodsView catalog={catalog} account={null} accountStatus="error" />);
 expect(screen.getByRole('alert').textContent).toContain('Chưa tải được trạng thái tự gia hạn');
});
