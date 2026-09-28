import { describe, expect, it, vi } from 'vitest';
import { createBillingRepository } from '../billing/repository.js';

const USER_ID = 'a0000000-0000-4000-8000-000000000001';
const OPERATION_ID = 'b0000000-0000-4000-8000-000000000001';
const now = new Date('2026-09-30T16:00:00.000Z');

describe('billing repository', () => {
  it('loads normalized effective quotas for the supplied account and clock', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        metric: 'tutor_requests',
        kind: 'monthly',
        quota_limit: 200,
        used: 40,
        reserved: 1,
        source: 'override',
        expires_at: null,
        resets_at: '2026-09-30T17:00:00+00:00',
      }],
      error: null,
    });
    const repository = createBillingRepository(rpc);

    await expect(repository.getEffectiveQuotas(USER_ID, now)).resolves.toEqual([{
      metric: 'tutor_requests',
      kind: 'monthly',
      limit: 200,
      used: 40,
      reserved: 1,
      source: 'override',
      expiresAt: null,
      resetsAt: '2026-09-30T17:00:00.000Z',
    }]);
    expect(rpc).toHaveBeenCalledWith('billing_get_effective_quotas', {
      p_user_id: USER_ID,
      p_now: now.toISOString(),
    });
  });

  it('passes a stable idempotency key and hash to the atomic reserve RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        operation_id: OPERATION_ID,
        state: 'reserved',
        remaining: 0,
        resets_at: '2026-09-30T17:00:00+00:00',
      },
      error: null,
    });
    const repository = createBillingRepository(rpc);

    await expect(repository.reserveQuota(USER_ID, 'tutor_requests', OPERATION_ID, 1, 'a'.repeat(64))).resolves.toEqual({
      operationId: OPERATION_ID,
      state: 'reserved',
      remaining: 0,
      resetsAt: '2026-09-30T17:00:00.000Z',
    });
    expect(rpc).toHaveBeenCalledWith('billing_reserve_quota', {
      p_user_id: USER_ID,
      p_metric: 'tutor_requests',
      p_operation_id: OPERATION_ID,
      p_request_hash: 'a'.repeat(64),
      p_units: 1,
    });
  });

  it('propagates quota exhaustion and provider-neutral database errors', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'QUOTA_EXCEEDED' },
    });
    const repository = createBillingRepository(rpc);

    await expect(repository.reserveQuota(USER_ID, 'tutor_requests', OPERATION_ID, 1, 'a'.repeat(64)))
      .rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
  });

  it('settles a reservation exactly once through the database function', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const repository = createBillingRepository(rpc);

    await repository.settleQuota(OPERATION_ID, 'commit');
    expect(rpc).toHaveBeenCalledWith('billing_settle_quota', {
      p_operation_id: OPERATION_ID,
      p_outcome: 'commit',
    });
  });

  it('rejects a settlement when the database lease has expired', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    const repository = createBillingRepository(rpc);

    await expect(repository.settleQuota(OPERATION_ID, 'commit'))
      .rejects.toMatchObject({ code: 'QUOTA_SETTLEMENT_REJECTED' });
  });
});
