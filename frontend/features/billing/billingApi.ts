import type { BillingAccount, BillingPlan, PlanLimit, QuotaMetric } from '@scipal/types';
import { authoringCall, type ApiResult } from '../authoring/apiClient';

// The plan catalog (public) and the signed-in account's plan, both from the backend; prices and
// limits are never written into the page.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

type Bilingual = { vi: string; en: string };
export type PublicPlan = BillingPlan;
export type Catalog = { plans: PublicPlan[]; checkoutOpen: boolean };

/** The catalog for the pricing page, or null when it cannot be read (no made-up prices). */
export async function fetchCatalog(): Promise<Catalog | null> {
  try {
    // A slow backend must not hold up the page that shows the prices (the landing waits for it).
    const res = await fetch(`${API_BASE}/api/billing/plans`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(3000) } as RequestInit);
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<Catalog>;
    return Array.isArray(body.plans) && body.plans.length > 0 ? { plans: body.plans, checkoutOpen: body.checkoutOpen === true } : null;
  } catch {
    return null;
  }
}

export type CheckoutAnswer = { orderId: string; status: string; checkoutUrl: string | null; expiresAt: string };
export type OrderView = {
  id: string;
  planCode: string;
  interval: string;
  amountVnd: number;
  status: 'pending' | 'paid' | 'expired' | 'failed' | 'cancelled' | 'reconciliation';
  expiresAt: string;
  paidAt: string | null;
  checkoutUrl: string | null;
};

/** Starts (or, with the same key, resumes) a QR checkout; the backend sets the amount. */
export const startCheckout = (priceId: string, idempotencyKey: string): Promise<ApiResult<CheckoutAnswer>> =>
  authoringCall<CheckoutAnswer>('/api/billing/checkout', 'POST', { priceId, provider: 'payos', idempotencyKey, autoRenew: false });

export const cancelOrder = (id: string): Promise<ApiResult<OrderView>> => authoringCall<OrderView>(`/api/billing/orders/${encodeURIComponent(id)}/cancel`, 'POST');

export const fetchOrder = (id: string): Promise<ApiResult<OrderView>> => authoringCall<OrderView>(`/api/billing/orders/${encodeURIComponent(id)}`, 'GET');

export type Transaction = { id: string; planCode: string; interval: string; amountVnd: number; status: string; createdAt: string; paidAt: string | null };

export const fetchTransactions = (cursor?: string): Promise<ApiResult<{ items: Transaction[]; nextCursor: string | null }>> =>
  authoringCall(`/api/billing/transactions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, 'GET');

export const fetchMyPlan = (): Promise<ApiResult<BillingAccount>> => authoringCall<BillingAccount>('/api/billing/me', 'GET');

/** "390.000 ₫" */
export const formatVnd = (amount: number) => `${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;

/** Title of a quota, and the noun used after a number ("5 lượt hỏi Gia sư AI"). */
export const METRIC: Record<QuotaMetric, { title: Bilingual; unit: Bilingual }> = {
  tutor_requests: { title: { vi: 'Lượt hỏi Gia sư AI', en: 'AI tutor requests' }, unit: { vi: 'lượt hỏi Gia sư AI', en: 'AI tutor requests' } },
  graded_exam_attempts: { title: { vi: 'Lượt thi có chấm điểm', en: 'Graded exam attempts' }, unit: { vi: 'lượt thi có chấm điểm', en: 'graded exam attempts' } },
  import_files: { title: { vi: 'Tệp nhập', en: 'Imported files' }, unit: { vi: 'tệp nhập', en: 'imported files' } },
  voice_minutes: { title: { vi: 'Phút nói chuyện với Gia sư AI', en: 'Minutes talking with the AI tutor' }, unit: { vi: 'phút nói chuyện với Gia sư AI', en: 'minutes talking with the AI tutor' } },
  author_ai_requests: { title: { vi: 'Lượt AI soạn bài', en: 'Lesson-drafting AI requests' }, unit: { vi: 'lượt AI soạn bài', en: 'lesson-drafting AI requests' } },
  active_classes: { title: { vi: 'Lớp đang hoạt động', en: 'Active classes' }, unit: { vi: 'lớp đang hoạt động', en: 'active classes' } },
  students_per_class: { title: { vi: 'Học sinh mỗi lớp', en: 'Students per class' }, unit: { vi: 'học sinh mỗi lớp', en: 'students per class' } },
  active_authored_exams: { title: { vi: 'Đề tự soạn đang hoạt động', en: 'Active authored exams' }, unit: { vi: 'đề tự soạn đang hoạt động', en: 'active authored exams' } },
};

export const PLAN_NAME: Record<string, Bilingual> = {
  student_free: { vi: 'Học sinh Miễn phí', en: 'Student Free' },
  student_plus: { vi: 'Học sinh Plus', en: 'Student Plus' },
  teacher_free: { vi: 'Giáo viên Miễn phí', en: 'Teacher Free' },
  teacher_pro: { vi: 'Giáo viên Pro', en: 'Teacher Pro' },
};

/** "5 lượt hỏi Gia sư AI mỗi ngày", "1 lớp đang hoạt động", "Không có lượt AI soạn bài". */
export function limitText(limit: PlanLimit, t: (text: Bilingual) => string): string {
  const unit = t(METRIC[limit.metric]?.unit ?? { vi: limit.metric, en: limit.metric });
  if (limit.limit === 0) return t({ vi: `Không có ${unit}`, en: `No ${unit}` });
  const period = limit.kind === 'daily' ? t({ vi: ' mỗi ngày', en: ' a day' }) : limit.kind === 'monthly' ? t({ vi: ' mỗi tháng', en: ' a month' }) : '';
  return `${limit.limit} ${unit}${period}`;
}
