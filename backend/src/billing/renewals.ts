import type { MomoClient } from './providers/momo.js';

const MOMO_TRANSACTION_NOT_FOUND = 42;

export type MomoRenewalAttempt = {
  attemptId: string;
  mandateId: string;
  orderId: string;
  initialOrderId: string;
  requestId: string;
  partnerClientId: string;
  amountVnd: number;
  interval: 'month' | 'year';
  nextPaymentDate: string;
  aesToken: string;
  state: 'ready' | 'unknown';
};

type PaidRenewal = {
  orderId: string;
  amountVnd: number;
  transactionId: string;
  resultCode: number;
  paidAt: string | null;
};

type ProviderRenewal = Omit<PaidRenewal, 'transactionId'> & { transactionId: string | null };

type Dependencies = {
  claimDue: () => Promise<readonly MomoRenewalAttempt[]>;
  momo: Pick<MomoClient, 'queryTransaction' | 'chargeSubscription'>;
  apply: (item: MomoRenewalAttempt, payment: PaidRenewal) => Promise<'applied' | 'duplicate' | 'reconciliation'>;
  markUnknown: (item: MomoRenewalAttempt) => Promise<void>;
  markFailed: (item: MomoRenewalAttempt, resultCode: number) => Promise<void>;
};

type RenewalResult = { claimed: number; applied: number; failed: number; pending: number };

function isUsablePayment(payment: ProviderRenewal, item: MomoRenewalAttempt): payment is PaidRenewal {
  return payment.resultCode === 0
    && payment.orderId === item.orderId
    && payment.amountVnd === item.amountVnd
    && payment.transactionId !== null;
}

export async function runMomoRenewals(deps: Dependencies): Promise<RenewalResult> {
  const attempts = await deps.claimDue();
  const result: RenewalResult = { claimed: attempts.length, applied: 0, failed: 0, pending: 0 };

  for (const item of attempts) {
    try {
      if (item.state === 'unknown') {
        const status = await deps.momo.queryTransaction({ orderId: item.orderId, requestId: item.requestId });
        if (status.resultCode === 0 && status.amountVnd !== null && status.transactionId !== null) {
          const payment: PaidRenewal = {
            orderId: item.orderId,
            amountVnd: status.amountVnd,
            transactionId: status.transactionId,
            resultCode: status.resultCode,
            paidAt: status.paidAt,
          };
          if (!isUsablePayment(payment, item)) {
            await deps.markUnknown(item);
            result.pending += 1;
            continue;
          }
          await deps.apply(item, payment);
          result.applied += 1;
          continue;
        }
        if (status.resultCode === 0) {
          await deps.markUnknown(item);
          result.pending += 1;
          continue;
        }
        if (status.resultCode !== MOMO_TRANSACTION_NOT_FOUND) {
          await deps.markUnknown(item);
          result.pending += 1;
          continue;
        }
      }

      const payment = await deps.momo.chargeSubscription({
        orderId: item.orderId,
        requestId: item.requestId,
        amountVnd: item.amountVnd,
        orderInfo: `SciPal ${item.interval} renewal`,
        partnerClientId: item.partnerClientId,
        nextPaymentDate: item.nextPaymentDate,
        aesToken: item.aesToken,
      });
      if (payment.resultCode !== 0) {
        await deps.markFailed(item, payment.resultCode);
        result.failed += 1;
      } else if (!isUsablePayment(payment, item)) {
        await deps.markUnknown(item);
        result.pending += 1;
      } else {
        await deps.apply(item, payment);
        result.applied += 1;
      }
    } catch {
      await deps.markUnknown(item);
      result.pending += 1;
    }
  }

  return result;
}
