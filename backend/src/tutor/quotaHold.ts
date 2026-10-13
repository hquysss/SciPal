import type { FastifyBaseLogger } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BillingRepositoryError, createBillingRepository } from '../billing/repository.js';
import { periodOf } from '../billing/quotaPeriod.js';

// One paid request to the AI Professor outside the chat (writing feedback, dictionary lookup):
// hold tokens on the learner's quota first, then count what was really used or give it all back.

const msg = (error: string, error_en: string) => ({ error, error_en });

export type TutorHold = {
  /** Commit what the answer used, or release the whole hold. Never throws. */
  settle: (outcome: 'commit' | 'release', used?: number) => Promise<void>;
  /** Tokens left after committing `used`; null for an admin (not metered). */
  remainingAfter: (used: number) => number | null;
};

type HoldResult = { ok: true; hold: TutorHold } | { ok: false; status: 429 | 503; body: Record<string, unknown> };

export async function holdTutorTokens(
  supabase: SupabaseClient,
  user: { id: string; app_metadata?: { app_role?: string } },
  units: number,
  log: FastifyBaseLogger,
): Promise<HoldResult> {
  if (user.app_metadata?.app_role === 'admin') {
    return { ok: true, hold: { settle: async () => {}, remainingAfter: () => null } };
  }
  const billing = createBillingRepository((name, args) => supabase.rpc(name, args));
  const operationId = crypto.randomUUID();
  let remaining: number;
  try {
    remaining = (await billing.reserveQuota(user.id, 'tutor_tokens', operationId, units, operationId)).remaining;
  } catch (err) {
    if (err instanceof BillingRepositoryError && err.code === 'QUOTA_EXCEEDED') {
      const quota = await billing
        .getEffectiveQuotas(user.id, new Date())
        .then((qs) => qs.find((q) => q.metric === 'tutor_tokens'))
        .catch(() => undefined);
      const monthly = periodOf(quota?.kind) === 'month';
      return {
        ok: false,
        status: 429,
        body: {
          code: 'QUOTA_EXCEEDED',
          ...(monthly
            ? msg('Em đã dùng hết token Giáo sư AI tháng này.', "You have used this month's Professor tokens.")
            : msg('Em đã dùng hết token Giáo sư AI hôm nay.', "You have used today's Professor tokens.")),
          remaining: 0,
          resetsAt: quota?.resetsAt ?? null,
        },
      };
    }
    log.error({ err }, 'Failed to hold Professor tokens');
    return { ok: false, status: 503, body: msg('Chưa kiểm tra được hạn mức Giáo sư AI. Thử lại sau nhé.', 'Could not check your Professor tokens. Try again later.') };
  }
  return {
    ok: true,
    hold: {
      settle: (outcome, used) =>
        billing.settleQuota(operationId, outcome, used).then(
          () => {},
          (err) => log.error({ err, outcome }, 'Failed to settle Professor tokens'),
        ),
      remainingAfter: (used) => Math.max(0, remaining + units - used),
    },
  };
}
