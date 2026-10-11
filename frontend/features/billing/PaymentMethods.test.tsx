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
 expect(screen.getByRole('link', { name: /Chọn gói để trả qua VNPAY/ }).getAttribute('href')).toBe('/pricing?provider=vnpay');
 expect(screen.getByText('Thanh toán một lần cho kỳ này, không tự gia hạn.')).toBeTruthy();
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
const plan = {
 code: 'student_plus', audience: 'student', name: { en: 'Plus', vi: 'Plus' }, description: { en: 'Plus', vi: 'Plus' }, perks: [], active: true, version: 1, limits: [],
 prices: [
  { id: 'b0000000-0000-4000-8000-000000000001', interval: 'month', amountVnd: 39000 },
  { id: 'b0000000-0000-4000-8000-000000000003', interval: 'quarter', amountVnd: 105000 },
 ],
} as const;
const buyCatalog = { ...catalog, plans: [plan], momoAutoRenewOpen: true };
const student = { role: 'student', plan: null, quotas: [], paidThrough: null, renewal: null } as const;
it('pays for the plan picked on pricing: provider chosen here, renewal only by explicit consent', () => {
 const onBuy = vi.fn();
 render(<PaymentMethodsView catalog={buyCatalog} account={student} accountStatus="ready" context={{ plan: 'student_plus', interval: 'month' }} onBuy={onBuy} />);
 expect(screen.getByRole('region', { name: 'Gói đã chọn' }).textContent).toMatch(/Plus.*39\.000 ₫\/ tháng/);
 fireEvent.click(screen.getByRole('button', { name: /Thanh toán với payOS/ }));
 expect(onBuy).toHaveBeenLastCalledWith('payos', false);
 fireEvent.click(screen.getByRole('radio', { name: /VNPAY/ }));
 fireEvent.click(screen.getByRole('button', { name: /Thanh toán với VNPAY/ }));
 expect(onBuy).toHaveBeenLastCalledWith('vnpay', false);
 fireEvent.click(screen.getByRole('checkbox'));
 fireEvent.click(screen.getByRole('button', { name: /Tự gia hạn với VNPAY/ }));
 expect(onBuy).toHaveBeenLastCalledWith('vnpay', true);
 fireEvent.click(screen.getByRole('radio', { name: /MoMo/ }));
 expect((screen.getByRole('button', { name: /Tự gia hạn với MoMo/ }) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('checkbox'));
 expect((screen.getByRole('button', { name: /Tự gia hạn với MoMo/ }) as HTMLButtonElement).disabled).toBe(false);
});
it('sells 3- and 6-month plans as one-time payments only', () => {
 const onBuy = vi.fn();
 render(<PaymentMethodsView catalog={buyCatalog} account={student} accountStatus="ready" context={{ plan: 'student_plus', interval: 'quarter' }} onBuy={onBuy} />);
 expect((screen.getByRole('radio', { name: /MoMo/ }) as HTMLInputElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('radio', { name: /VNPAY/ }));
 expect(screen.queryByRole('checkbox')).toBeNull();
});
it('does not let a teacher pay for a student plan', () => {
 render(<PaymentMethodsView catalog={buyCatalog} account={{ ...student, role: 'teacher' }} accountStatus="ready" context={{ plan: 'student_plus', interval: 'month' }} onBuy={() => {}} />);
 expect(screen.getByText('Gói này dành cho học sinh.')).toBeTruthy();
 expect((screen.getByRole('button', { name: /Thanh toán với payOS/ }) as HTMLButtonElement).disabled).toBe(true);
});
