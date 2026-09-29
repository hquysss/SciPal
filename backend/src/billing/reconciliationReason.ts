export type ReconciliationFacts = {
  orderId: string | null;
  amountReceivedVnd: number | null;
  expectedAmountVnd: number | null;
  orderAmountVnd: number | null;
  paidAt: string | null;
  orderExpiresAt: string | null;
  attemptStatus: string | null;
  orderStatus: string | null;
  userId: string | null;
  currentRole: string | null;
  planAudience: string | null;
};

export type ReconciliationReason = {
  code: 'incorrect_amount' | 'late_payment' | 'duplicate_payment' | 'order_not_found' | 'role_changed' | 'unclassified';
  en: string;
  vi: string;
};

const REASONS: Record<ReconciliationReason['code'], ReconciliationReason> = {
  incorrect_amount: { code: 'incorrect_amount', en: 'Incorrect payment amount', vi: 'Sai số tiền thanh toán' },
  late_payment: { code: 'late_payment', en: 'Payment received after the order expired', vi: 'Thanh toán sau hạn đơn hàng' },
  duplicate_payment: { code: 'duplicate_payment', en: 'The order was already paid', vi: 'Đơn hàng đã được thanh toán trước đó' },
  order_not_found: { code: 'order_not_found', en: 'Order or account not found', vi: 'Không tìm thấy đơn hàng hoặc tài khoản' },
  role_changed: { code: 'role_changed', en: 'Account role no longer matches the plan', vi: 'Vai trò tài khoản đã đổi so với gói' },
  unclassified: { code: 'unclassified', en: 'Payment needs provider review', vi: 'Giao dịch cần được kiểm tra thêm' },
};

function isAfter(value: string | null, boundary: string | null): boolean {
  if (!value || !boundary) return false;
  const date = Date.parse(value);
  const limit = Date.parse(boundary);
  return Number.isFinite(date) && Number.isFinite(limit) && date > limit;
}

export function classifyReconciliationReason(facts: ReconciliationFacts): ReconciliationReason {
  if (!facts.orderId || !facts.userId) return REASONS.order_not_found;
  if (facts.amountReceivedVnd !== null && facts.amountReceivedVnd !== facts.expectedAmountVnd) return REASONS.incorrect_amount;
  if (facts.amountReceivedVnd !== null && facts.amountReceivedVnd !== facts.orderAmountVnd) return REASONS.incorrect_amount;
  if (isAfter(facts.paidAt, facts.orderExpiresAt)) return REASONS.late_payment;
  if (facts.attemptStatus === 'paid' || facts.orderStatus === 'paid') return REASONS.duplicate_payment;
  if (facts.currentRole !== facts.planAudience) return REASONS.role_changed;
  return REASONS.unclassified;
}
