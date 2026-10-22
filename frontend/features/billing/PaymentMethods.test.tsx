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
const slide = (name: RegExp) => fireEvent.keyDown(screen.getByRole('slider', { name }), { key: 'End' });
const buyView = (onBuy: () => Promise<unknown>) => <PaymentMethodsView catalog={buyCatalog} account={student} accountStatus="ready" context={{ plan: 'student_plus', interval: 'month' }} onBuy={onBuy} />;
it('pays for the plan picked on pricing: provider chosen here, renewal only by explicit consent', () => {
 const onBuy = vi.fn(() => new Promise<void>(() => {}));
 render(buyView(onBuy));
 expect(screen.getByRole('region', { name: 'Gói đã chọn' }).textContent).toMatch(/Plus.*39\.000 ₫.*cho 1 tháng/);
 slide(/Trượt để thanh toán với payOS/);
 expect(onBuy).toHaveBeenLastCalledWith('payos', false);
 cleanup();
 render(buyView(onBuy));
 fireEvent.click(screen.getByRole('radio', { name: /VNPAY/ }));
 slide(/Trượt để thanh toán với VNPAY/);
 expect(onBuy).toHaveBeenLastCalledWith('vnpay', false);
 cleanup();
 render(buyView(onBuy));
 fireEvent.click(screen.getByRole('radio', { name: /VNPAY/ }));
 fireEvent.click(screen.getByRole('checkbox'));
 slide(/Trượt để tự gia hạn với VNPAY/);
 expect(onBuy).toHaveBeenLastCalledWith('vnpay', true);
 cleanup();
 render(buyView(onBuy));
 fireEvent.click(screen.getByRole('radio', { name: /MoMo/ }));
 expect(screen.getByRole('slider', { name: /Trượt để tự gia hạn với MoMo/ }).getAttribute('aria-disabled')).toBe('true');
 fireEvent.click(screen.getByRole('checkbox'));
 expect(screen.getByRole('slider', { name: /Trượt để tự gia hạn với MoMo/ }).getAttribute('aria-disabled')).toBeNull();
});
it('does not start checkout from a disabled slider', () => {
 const onBuy = vi.fn(() => Promise.resolve());
 render(buyView(onBuy));
 fireEvent.click(screen.getByRole('radio', { name: /MoMo/ }));
 slide(/Trượt để tự gia hạn với MoMo/);
 expect(onBuy).not.toHaveBeenCalled();
});
it('says so when checkout cannot open', async () => {
 const onBuy = vi.fn(() => Promise.reject({ vi: 'Lỗi', en: 'Error' }));
 render(buyView(onBuy));
 slide(/Trượt để thanh toán với payOS/);
 expect((await screen.findAllByText('Chưa mở được thanh toán', {}, { timeout: 2000 })).length).toBeGreaterThan(0);
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
 expect(screen.getByRole('slider', { name: /Trượt để thanh toán với payOS/ }).getAttribute('aria-disabled')).toBe('true');
});
