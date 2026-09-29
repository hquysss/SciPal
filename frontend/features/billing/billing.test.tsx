import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { PricingPage } from './PricingPage';
import { MyPlanView, TransactionsView } from './MyPlan';
import { CheckoutStatusView, countdown } from './CheckoutStatus';
import { formatVnd, limitText, type PublicPlan } from './billingApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const P = (n: number) => `b0000000-0000-4000-8000-00000000000${n}`;
const plan = (code: PublicPlan['code'], vi: string, prices: PublicPlan['prices'], limits: PublicPlan['limits']): PublicPlan => ({
  code, audience: code.startsWith('student') ? 'student' : 'teacher', name: { en: code, vi }, description: { en: 'd', vi: `Mô tả ${vi}` }, active: true, version: 1, prices, limits,
});
const plans: PublicPlan[] = [
  plan('student_free', 'Học sinh Miễn phí', [], [{ metric: 'tutor_requests', kind: 'daily', limit: 5 }, { metric: 'graded_exam_attempts', kind: 'monthly', limit: 3 }]),
  plan('student_plus', 'Học sinh Plus', [{ id: P(1), interval: 'month', amountVnd: 39000 }, { id: P(2), interval: 'year', amountVnd: 390000 }], [{ metric: 'tutor_requests', kind: 'monthly', limit: 200 }]),
  plan('teacher_free', 'Giáo viên Miễn phí', [], [{ metric: 'author_ai_requests', kind: 'monthly', limit: 0 }]),
  plan('teacher_pro', 'Giáo viên Pro', [{ id: P(3), interval: 'month', amountVnd: 99000 }, { id: P(4), interval: 'year', amountVnd: 990000 }], [{ metric: 'active_classes', kind: 'capacity', limit: 10 }]),
];

describe('billing copy', () => {
  it('writes Vietnamese đồng with dot thousands and each limit by its period', () => {
    expect(formatVnd(390000)).toBe('390.000 ₫');
    const t = (o: { vi: string }) => o.vi;
    expect(limitText({ metric: 'tutor_requests', kind: 'daily', limit: 5 }, t)).toBe('5 lượt hỏi Gia sư AI mỗi ngày');
    expect(limitText({ metric: 'import_files', kind: 'monthly', limit: 100 }, t)).toBe('100 tệp nhập mỗi tháng');
    expect(limitText({ metric: 'active_classes', kind: 'capacity', limit: 1 }, t)).toBe('1 lớp đang hoạt động');
    expect(limitText({ metric: 'author_ai_requests', kind: 'monthly', limit: 0 }, t)).toBe('Không có lượt AI soạn bài');
  });
});

describe('PricingPage', () => {
  it('shows the student plans by the month, without asking anyone to sign in first', () => {
    const html = renderToStaticMarkup(<PricingPage plans={plans} checkoutOpen={false} />);
    expect(html).toContain('Học sinh Plus');
    expect(html).toContain('39.000 ₫');
    expect(html).toContain('5 lượt hỏi Gia sư AI mỗi ngày');
    expect(html).not.toContain('Giáo viên Pro');
    expect(html).not.toContain('/login');
    expect(countRawColors(html).total).toBe(0);
  });

  it('shows the yearly price as paid up front, for teachers too', () => {
    const html = renderToStaticMarkup(<PricingPage plans={plans} checkoutOpen={false} initialAudience="teacher" initialInterval="year" />);
    expect(html).toContain('Giáo viên Pro');
    expect(html).toContain('990.000 ₫');
    expect(html).toContain('trả trước 1 năm');
    expect(html).toContain('Không có lượt AI soạn bài');
  });

  it('says paid plans are coming soon while checkout is closed, with no way to pay', () => {
    const html = renderToStaticMarkup(<PricingPage plans={plans} checkoutOpen={false} />);
    expect(html).toContain('Sắp mở bán');
    expect(html).not.toContain('/checkout');
  });

  it('never shows made-up prices when the catalog did not load', () => {
    const html = renderToStaticMarkup(<PricingPage plans={null} checkoutOpen={false} />);
    expect(html).toContain('Chưa tải được bảng giá');
    expect(html).not.toContain('₫');
  });
});

describe('MyPlanView', () => {
  const quota = (metric: string, kind: string, limit: number, used: number, reserved = 0) =>
    ({ metric, kind, limit, used, reserved, source: 'plan', expiresAt: null, resetsAt: '2026-09-30T17:00:00.000Z' }) as never;

  it('shows the plan and what is left of each quota', () => {
    const html = renderToStaticMarkup(<MyPlanView state={{ status: 'ready', account: { role: 'student', plan: 'student_free', paidThrough: null, quotas: [quota('tutor_requests', 'daily', 5, 2, 1), quota('graded_exam_attempts', 'monthly', 3, 3)] } }} />);
    expect(html).toContain('Học sinh Miễn phí');
    expect(html).toContain('Lượt hỏi Gia sư AI');
    expect(html).toContain('Còn 2 / 5 hôm nay');
    expect(html).toContain('Còn 0 / 3 tháng này');
    expect(html).toContain('href="/pricing"');
    expect(countRawColors(html).total).toBe(0);
  });

  it('tells an admin there are no limits', () => {
    const html = renderToStaticMarkup(<MyPlanView state={{ status: 'ready', account: { role: 'admin', plan: null, paidThrough: null, quotas: [] } }} />);
    expect(html).toContain('không bị giới hạn');
  });

  it('shows the error with a retry, not empty meters', () => {
    const html = renderToStaticMarkup(<MyPlanView state={{ status: 'error', message: { en: 'x', vi: 'Chưa tải được thông tin gói.' } }} onRetry={() => {}} />);
    expect(html).toContain('Chưa tải được thông tin gói.');
    expect(html).toContain('Thử lại');
  });
});

describe('PricingPage selling points', () => {
  it('shows the yearly saving, the price per day and the recommended paid plan', () => {
    const html = renderToStaticMarkup(<PricingPage plans={plans} checkoutOpen={false} />);
    expect(html).toContain('−17%');
    expect(html).toContain('Chỉ khoảng 1.300 ₫ mỗi ngày');
    expect(html).toContain('Khuyên dùng');
    expect(html).toContain('Gói có tự gia hạn không?');
  });
});

describe('PricingPage checkout', () => {
  it('asks a visitor to sign in to buy, and brings them back to the pricing page', () => {
    const html = renderToStaticMarkup(<PricingPage plans={plans} checkoutOpen viewerRole={null} />);
    expect(html).toContain('href="/login?redirect=%2Fpricing"');
    expect(html).toContain('Đăng nhập để mua');
  });

  it('lets a student buy the student plan by QR', () => {
    const html = renderToStaticMarkup(<PricingPage plans={plans} checkoutOpen viewerRole="student" />);
    expect(html).toContain('Mua bằng QR');
    expect(html).not.toContain('Sắp mở bán');
  });

  it('does not sell a teacher the student plan, nor an admin anything', () => {
    const teacher = renderToStaticMarkup(<PricingPage plans={plans} checkoutOpen viewerRole="teacher" />);
    expect(teacher).toContain('Gói dành cho học sinh');
    expect(teacher).not.toContain('Mua bằng QR');
    const admin = renderToStaticMarkup(<PricingPage plans={plans} checkoutOpen viewerRole="admin" initialAudience="teacher" />);
    expect(admin).toContain('Tài khoản quản trị không cần mua gói');
  });
});

describe('CheckoutStatusView', () => {
  const order = { id: 'o1', planCode: 'student_plus', interval: 'month', amountVnd: 39000, expiresAt: '2026-09-29T03:45:00.000Z', paidAt: null, checkoutUrl: null } as const;

  it('waits for the bank, with the payment page and a check-again button', () => {
    const html = renderToStaticMarkup(<CheckoutStatusView state={{ status: 'ready', order: { ...order, status: 'pending', checkoutUrl: 'https://pay.payos.vn/web/x' } }} onCheck={() => {}} />);
    expect(html).toContain('Đang chờ xác nhận thanh toán');
    expect(html).toContain('href="https://pay.payos.vn/web/x"');
    expect(html).toContain('Kiểm tra lại');
    expect(html).toContain('39.000 ₫');
    expect(countRawColors(html).total).toBe(0);
  });

  it('says the plan is active once paid', () => {
    const html = renderToStaticMarkup(<CheckoutStatusView state={{ status: 'ready', order: { ...order, status: 'paid', paidAt: '2026-09-29T03:20:00.000Z' } }} />);
    expect(html).toContain('Thanh toán thành công');
    expect(html).toContain('href="/profile/plan"');
  });

  it('explains an expired order and money kept for review', () => {
    const expired = renderToStaticMarkup(<CheckoutStatusView state={{ status: 'ready', order: { ...order, status: 'expired' } }} />);
    expect(expired).toContain('Đơn đã hết hạn');
    expect(expired).toContain('href="/pricing"');
    const review = renderToStaticMarkup(<CheckoutStatusView state={{ status: 'ready', order: { ...order, status: 'reconciliation' } }} />);
    expect(review).toContain('đang được đối soát');
  });
});

describe('TransactionsView', () => {
  const tx = (patch: Record<string, unknown> = {}) => ({ id: 'o1', planCode: 'student_plus', interval: 'month', amountVnd: 39000, status: 'paid', createdAt: '2026-09-29T03:00:00.000Z', paidAt: '2026-09-29T03:20:00.000Z', ...patch });

  it('lists payments with plan, period, amount and state, and more when there are more', () => {
    const html = renderToStaticMarkup(<TransactionsView state={{ status: 'ready', items: [tx(), tx({ id: 'o2', interval: 'year', amountVnd: 390000, status: 'pending', paidAt: null })], nextCursor: 'x', loadingMore: false }} onMore={() => {}} />);
    expect(html).toContain('Lịch sử giao dịch');
    expect(html).toContain('Học sinh Plus · 1 tháng');
    expect(html).toContain('39.000 ₫');
    expect(html).toContain('Đã thanh toán');
    expect(html).toContain('Đang chờ thanh toán');
    expect(html).toContain('href="/checkout/o2"');
    expect(html).toContain('Xem thêm');
    expect(countRawColors(html).total).toBe(0);
  });

  it('says there are none yet', () => {
    const html = renderToStaticMarkup(<TransactionsView state={{ status: 'ready', items: [], nextCursor: null, loadingMore: false }} onMore={() => {}} />);
    expect(html).toContain('Chưa có giao dịch nào');
    expect(html).not.toContain('Xem thêm');
  });
});

describe('checkout countdown and cancel', () => {
  const order = { id: 'o1', planCode: 'student_plus', interval: 'month', amountVnd: 39000, expiresAt: '2026-09-29T03:30:00.000Z', paidAt: null, checkoutUrl: 'https://pay.payos.vn/web/x', status: 'pending' } as const;

  it('counts down the minutes and seconds left, never below zero', () => {
    expect(countdown('2026-09-29T03:30:00.000Z', new Date('2026-09-29T03:00:30.000Z'))).toBe('29:30');
    expect(countdown('2026-09-29T03:30:00.000Z', new Date('2026-09-29T03:29:59.000Z'))).toBe('00:01');
    expect(countdown('2026-09-29T03:30:00.000Z', new Date('2026-09-29T04:00:00.000Z'))).toBe('00:00');
  });

  it('shows the time left and a cancel button while waiting', () => {
    const html = renderToStaticMarkup(<CheckoutStatusView state={{ status: 'ready', order }} now={new Date('2026-09-29T03:10:00.000Z')} onCheck={() => {}} onCancel={() => {}} />);
    expect(html).toContain('Còn 20:00');
    expect(html).toContain('Hủy giao dịch');
  });

  it('says the order was cancelled', () => {
    const html = renderToStaticMarkup(<CheckoutStatusView state={{ status: 'ready', order: { ...order, status: 'cancelled', checkoutUrl: null } }} />);
    expect(html).toContain('Đã hủy giao dịch');
    expect(html).not.toContain('Hủy giao dịch</button>');
  });
});
