import { describe, expect, it, vi } from 'vitest';
import { runMomoRenewals, type MomoRenewalAttempt } from '../billing/renewals.js';
import type { MomoClient } from '../billing/providers/momo.js';

const attempt: MomoRenewalAttempt = {
  attemptId: 'attempt-1',
  mandateId: 'mandate-1',
  orderId: 'renewal-1',
  initialOrderId: 'initial-1',
  requestId: 'request-1',
  partnerClientId: 'user-1',
  amountVnd: 39_000,
  interval: 'month',
  nextPaymentDate: '2026-11-10',
  aesToken: 'encrypted-token',
  state: 'ready',
};
const unknownAttempt: MomoRenewalAttempt = { ...attempt, state: 'unknown' };

const paid: { orderId: string; amountVnd: number; transactionId: string; resultCode: number; paidAt: string | null } = {
  orderId: attempt.orderId, amountVnd: attempt.amountVnd, transactionId: 'momo-tx-1', resultCode: 0, paidAt: '2026-11-10T00:10:00.000Z',
};
const notFound = { resultCode: 42, amountVnd: null, transactionId: null, paidAt: null };
const successQuery = { resultCode: 0, amountVnd: 39_000, transactionId: 'momo-tx-1', paidAt: '2026-11-10T00:10:00.000Z' };

function deps(overrides: Partial<{
  claimDue: () => Promise<readonly MomoRenewalAttempt[]>;
  momo: Pick<MomoClient, 'queryTransaction' | 'chargeSubscription'>;
  apply: (item: MomoRenewalAttempt, payment: typeof paid) => Promise<'applied' | 'duplicate' | 'reconciliation'>;
  markUnknown: (item: MomoRenewalAttempt) => Promise<void>;
  markFailed: (item: MomoRenewalAttempt, resultCode: number) => Promise<void>;
}> = {}) {
  return {
    claimDue: vi.fn(async () => [attempt]),
    momo: {
      queryTransaction: vi.fn(async () => notFound),
      chargeSubscription: vi.fn(async () => paid),
    },
    apply: vi.fn(async () => 'applied' as const),
    markUnknown: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('runMomoRenewals', () => {
  it('charges only a consented, claimed renewal and applies the verified amount', async () => {
    const d = deps();
    const result = await runMomoRenewals(d);

    expect(d.momo.chargeSubscription).toHaveBeenCalledWith(expect.objectContaining({
      orderId: attempt.orderId,
      requestId: attempt.requestId,
      amountVnd: attempt.amountVnd,
      aesToken: attempt.aesToken,
    }));
    expect(d.apply).toHaveBeenCalledWith(attempt, paid);
    expect(result).toMatchObject({ claimed: 1, applied: 1, failed: 0, pending: 0 });
  });

  it('queries MoMo before retrying an attempt with an unknown prior result', async () => {
    const calls: string[] = [];
    const d = deps({
      claimDue: vi.fn(async () => [unknownAttempt]),
      momo: {
        queryTransaction: vi.fn(async () => { calls.push('query'); return notFound; }),
        chargeSubscription: vi.fn(async () => { calls.push('charge'); return paid; }),
      },
    });

    await runMomoRenewals(d);

    expect(calls).toEqual(['query', 'charge']);
  });

  it('applies a query-confirmed payment without charging again', async () => {
    const d = deps({
      claimDue: vi.fn(async () => [unknownAttempt]),
      momo: {
        queryTransaction: vi.fn(async () => successQuery),
        chargeSubscription: vi.fn(async () => paid),
      },
    });

    const result = await runMomoRenewals(d);

    expect(d.apply).toHaveBeenCalledOnce();
    expect(d.momo.chargeSubscription).not.toHaveBeenCalled();
    expect(result.applied).toBe(1);
  });

  it('does not grant or extend a plan after a definitive MoMo decline', async () => {
    const d = deps({
      momo: {
        queryTransaction: vi.fn(async () => notFound),
        chargeSubscription: vi.fn(async () => ({ ...paid, resultCode: 2007 })),
      },
    });

    const result = await runMomoRenewals(d);

    expect(d.apply).not.toHaveBeenCalled();
    expect(d.markFailed).toHaveBeenCalledWith(attempt, 2007);
    expect(result.failed).toBe(1);
  });

  it('leaves a transport-unknown charge pending for a later status query', async () => {
    const d = deps({
      momo: {
        queryTransaction: vi.fn(async () => notFound),
        chargeSubscription: vi.fn(async () => { throw new Error('timeout'); }),
      },
    });

    const result = await runMomoRenewals(d);

    expect(d.apply).not.toHaveBeenCalled();
    expect(d.markUnknown).toHaveBeenCalledWith(attempt);
    expect(result.pending).toBe(1);
  });
});
