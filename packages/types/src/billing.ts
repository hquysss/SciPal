import { z } from 'zod';

export const PlanCodeSchema = z.enum([
  'student_free',
  'student_plus',
  'teacher_free',
  'teacher_pro',
]);

export const BillingAudienceSchema = z.enum(['student', 'teacher']);
export const BillingIntervalSchema = z.enum(['month', 'year']);
export const QuotaMetricSchema = z.enum([
  'tutor_requests',
  'graded_exam_attempts',
  'active_classes',
  'students_per_class',
  'import_files',
  'active_authored_exams',
  'author_ai_requests',
]);
export const QuotaKindSchema = z.enum(['daily', 'monthly', 'capacity']);
export const QuotaSourceSchema = z.enum(['plan', 'override']);

const BilingualTextSchema = z.object({ en: z.string(), vi: z.string() }).strict();
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const BillingPriceSchema = z.object({
  id: z.string().uuid(),
  interval: BillingIntervalSchema,
  amountVnd: z.number().int().positive(),
}).strict();

export const PlanLimitSchema = z.object({
  metric: QuotaMetricSchema,
  kind: QuotaKindSchema,
  limit: z.number().int().nonnegative(),
}).strict();

export const BillingPlanSchema = z.object({
  code: PlanCodeSchema,
  audience: BillingAudienceSchema,
  name: BilingualTextSchema,
  description: BilingualTextSchema,
  active: z.boolean(),
  version: z.number().int().positive(),
  prices: z.array(BillingPriceSchema),
  limits: z.array(PlanLimitSchema),
}).strict().superRefine((plan, context) => {
  const expectedAudience = plan.code.startsWith('student_') ? 'student' : 'teacher';
  if (plan.audience !== expectedAudience) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['audience'], message: 'Plan audience does not match its code' });
  }
  const intervals = new Set(plan.prices.map((price) => price.interval));
  if (plan.code.endsWith('_free') && plan.prices.length > 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['prices'], message: 'Free plans cannot be checked out' });
  }
  if (!plan.code.endsWith('_free') && (plan.prices.length !== 2 || intervals.size !== 2)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['prices'], message: 'Paid plans require monthly and annual prices' });
  }
});

export const BillingCatalogSchema = z.array(BillingPlanSchema).superRefine((plans, context) => {
  if (new Set(plans.map((plan) => plan.code)).size !== plans.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Plan codes must be unique' });
  }
});

export const EffectiveQuotaSchema = z.object({
  metric: QuotaMetricSchema,
  kind: QuotaKindSchema,
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  source: QuotaSourceSchema,
  expiresAt: IsoDateTimeSchema.nullable(),
  resetsAt: IsoDateTimeSchema.nullable(),
}).strict();

/** GET /api/billing/me: the plan of the signed-in account; admins have no plan and no limits. */
export const BillingAccountSchema = z.object({
  role: z.enum(['student', 'teacher', 'admin']),
  plan: PlanCodeSchema.nullable(),
  paidThrough: IsoDateTimeSchema.nullable(),
  quotas: z.array(EffectiveQuotaSchema),
}).strict();

export const QuotaChangeSchema = z.discriminatedUnion('action', [
  z.object({
    metric: QuotaMetricSchema,
    action: z.literal('set'),
    limit: z.number().int().nonnegative(),
    expiresAt: IsoDateTimeSchema.nullable(),
  }).strict(),
  z.object({ metric: QuotaMetricSchema, action: z.literal('reset') }).strict(),
]);

export const CheckoutInputSchema = z.object({
  priceId: z.string().uuid(),
  provider: z.enum(['payos', 'vnpay']),
  idempotencyKey: z.string().min(8).max(120),
  autoRenew: z.boolean(),
}).strict();

export const PaymentEventSchema = z.object({
  provider: z.enum(['payos', 'vnpay']),
  merchantRef: z.string().min(1).max(160),
  providerTransactionId: z.string().min(1).max(160),
  amountVnd: z.number().int().positive(),
  currency: z.literal('VND'),
  outcome: z.enum(['paid', 'failed', 'cancelled', 'expired']),
  paidAt: IsoDateTimeSchema.nullable(),
}).strict();

export const ReservationSchema = z.object({
  operationId: z.string().uuid(),
  state: z.enum(['reserved', 'committed', 'released']),
  remaining: z.number().int().nonnegative(),
  resetsAt: IsoDateTimeSchema.nullable(),
}).strict();

export type PlanCode = z.infer<typeof PlanCodeSchema>;
export type BillingAudience = z.infer<typeof BillingAudienceSchema>;
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;
export type QuotaMetric = z.infer<typeof QuotaMetricSchema>;
export type QuotaKind = z.infer<typeof QuotaKindSchema>;
export type EffectiveQuota = z.infer<typeof EffectiveQuotaSchema>;
export type BillingCatalog = z.infer<typeof BillingCatalogSchema>;
export type BillingPlan = z.infer<typeof BillingPlanSchema>;
export type BillingPrice = z.infer<typeof BillingPriceSchema>;
export type PlanLimit = z.infer<typeof PlanLimitSchema>;
export type BillingAccount = z.infer<typeof BillingAccountSchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
