import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { PricingPage } from './PricingPage';
import { MyPlanView } from './MyPlan';
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
