import { describe, expect, it } from 'vitest';
import { classifyReconciliationReason, type ReconciliationFacts } from '../billing/reconciliationReason.js';

const base: ReconciliationFacts = {
  orderId: 'c0000000-0000-4000-8000-000000000001',
  amountReceivedVnd: 39000,
  expectedAmountVnd: 39000,
  orderAmountVnd: 39000,
  paidAt: '2026-09-29T03:15:00.000Z',
  orderExpiresAt: '2026-09-29T03:30:00.000Z',
  attemptStatus: 'reconciliation',
  orderStatus: 'reconciliation',
  userId: 'a0000000-0000-4000-8000-000000000001',
  currentRole: 'student',
  planAudience: 'student',
};

describe('classifyReconciliationReason', () => {
  it.each([
    ['order_not_found', { orderId: null }],
    ['incorrect_amount', { amountReceivedVnd: 3900 }],
    ['late_payment', { paidAt: '2026-09-29T03:31:00.000Z' }],
    ['duplicate_payment', { orderStatus: 'paid' }],
    ['role_changed', { currentRole: 'teacher' }],
  ] as const)('classifies %s from persisted transaction facts', (code, patch) => {
    expect(classifyReconciliationReason({ ...base, ...patch }).code).toBe(code);
  });

  it('labels a deleted account with the missing order/account case', () => {
    expect(classifyReconciliationReason({ ...base, userId: null }).code).toBe('order_not_found');
  });
});
