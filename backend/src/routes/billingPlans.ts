import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createBillingRepository } from '../billing/repository.js';
import { checkoutDisabled, payosFromEnv } from '../billing/providers/payos.js';
import { momoRenewalsAvailable } from '../billing/providers/momo.js';

// The public plan catalog and the signed-in account's plan (billing plan Task 9, without payment).
// Prices, limits and wording are rows of billing_plans / billing_prices / billing_plan_limits.
// Checkout opens once payOS credentials are configured in the backend environment.

const PLAN_ORDER = ['student_free', 'student_plus', 'teacher_free', 'teacher_pro'] as const;
const INTERVAL_ORDER = ['month', 'year'] as const;
// Student metrics first, then a teacher's classes, exams, imports and AI.
const METRIC_ORDER = ['tutor_requests', 'voice_minutes', 'graded_exam_attempts', 'active_classes', 'students_per_class', 'active_authored_exams', 'import_files', 'author_ai_requests'];
const UNAVAILABLE = { code: 'BILLING_UNAVAILABLE', error: 'Chưa tải được thông tin gói. Thử lại sau.', error_en: 'Plan information is not available. Try again later.' };

type PlanRow = { code: string; audience: string; name_en: string; name_vi: string; description_en: string; description_vi: string; perks: Array<{ en: string; vi: string }> | null; active: boolean; version: number };
type PriceRow = { id: string; plan_code: string; interval: string; amount_vnd: number };
type LimitRow = { plan_code: string; metric: string; kind: string; limit_value: number };

class IncompleteCatalog extends Error {}

export const billingRoutes: FastifyPluginAsync = async (app) => {
  const actor = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id: string; app_metadata?: { app_role?: string } } }).user;

  app.get('/api/billing/plans', async (request, reply) => {
    const supabase = app.supabase!;
    try {
      const [plans, prices, limits] = await Promise.all([
        supabase.from('billing_plans').select('code, audience, name_en, name_vi, description_en, description_vi, perks, active, version').eq('active', true),
        supabase.from('billing_prices').select('id, plan_code, interval, amount_vnd').eq('active', true),
        supabase.from('billing_plan_limits').select('plan_code, metric, kind, limit_value'),
      ]);
      if (plans.error || prices.error || limits.error) throw plans.error ?? prices.error ?? limits.error;
      const planRows = (plans.data ?? []) as PlanRow[];
      const priceRows = (prices.data ?? []) as PriceRow[];
      const limitRows = (limits.data ?? []) as LimitRow[];

      const catalog = PLAN_ORDER.map((code) => {
        const row = planRows.find((p) => p.code === code);
        if (!row) throw new IncompleteCatalog(`missing plan ${code}`);
        const planPrices = INTERVAL_ORDER.flatMap((interval) => priceRows
          .filter((p) => p.plan_code === code && p.interval === interval)
          .map((p) => ({ id: p.id, interval, amountVnd: p.amount_vnd })));
        // A paid plan needs exactly one monthly and one yearly price; a free plan has none.
        const paid = code.endsWith('_plus') || code.endsWith('_pro');
        if (paid ? planPrices.length !== 2 || planPrices[0].interval === planPrices[1].interval : planPrices.length !== 0) {
          throw new IncompleteCatalog(`bad prices for ${code}`);
        }
        return {
          code,
          audience: row.audience,
          name: { en: row.name_en, vi: row.name_vi },
          description: { en: row.description_en, vi: row.description_vi },
          perks: row.perks ?? [],
          active: row.active,
          version: row.version,
          prices: planPrices,
          limits: limitRows
            .filter((l) => l.plan_code === code)
            .sort((a, b) => METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric))
            .map((l) => ({ metric: l.metric, kind: l.kind, limit: l.limit_value })),
        };
      });
      reply.header('Cache-Control', 'public, max-age=300');
      const payosCheckoutOpen = payosFromEnv() !== null && !checkoutDisabled();
      const momoAutoRenewOpen = momoRenewalsAvailable() && !checkoutDisabled();
      return { plans: catalog, checkoutOpen: payosCheckoutOpen || momoAutoRenewOpen, payosCheckoutOpen, momoAutoRenewOpen };
    } catch (error) {
      request.log.error({ err: error }, 'Billing catalog could not be read');
      return reply.code(503).send(UNAVAILABLE);
    }
  });

  app.get('/api/billing/me', async (request, reply) => {
    const user = actor(request)!;
    const role = user.app_metadata?.app_role;
    if (role === 'admin') return { role: 'admin', plan: null, paidThrough: null, renewal: null, quotas: [] };
    // Sign-up sets no app_role: an account without one is a student (as in the ledger).
    const audience = role === 'teacher' ? 'teacher' : 'student';
    const supabase = app.supabase!;
    const billing = createBillingRepository((name, args) => supabase.rpc(name, args));
    const now = new Date();
    try {
      const [quotas, subscription] = await Promise.all([
        billing.getEffectiveQuotas(user.id, now),
        supabase.from('billing_subscriptions').select('plan_code, paid_through, renewal_mode, mandate_id').eq('user_id', user.id).maybeSingle(),
      ]);
      if (subscription.error) throw subscription.error;
      const sub = subscription.data as { plan_code: string; paid_through: string; renewal_mode: string; mandate_id: string | null } | null;
      const paid = sub && sub.plan_code.startsWith(`${audience}_`) && new Date(sub.paid_through) > now ? sub : null;
      let renewal = { status: 'manual', interval: null as 'month' | 'year' | null, amountVnd: null as number | null, nextChargeAt: null as string | null };
      if (sub?.mandate_id) {
        const mandate = await supabase.from('billing_mandates')
          .select('status, interval, amount_vnd, next_charge_at')
          .eq('id', sub.mandate_id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (mandate.error) throw mandate.error;
        if (mandate.data) {
          const data = mandate.data as { status: string; interval: 'month' | 'year'; amount_vnd: number; next_charge_at: string | null };
          renewal = {
            status: sub.renewal_mode === 'auto' && data.status === 'active' ? 'active' : data.status,
            interval: data.interval,
            amountVnd: data.amount_vnd,
            nextChargeAt: data.next_charge_at ? new Date(data.next_charge_at).toISOString() : null,
          };
        }
      }
      return {
        role: audience,
        plan: paid?.plan_code ?? `${audience}_free`,
        paidThrough: paid ? new Date(paid.paid_through).toISOString() : null,
        renewal,
        quotas,
      };
    } catch (error) {
      request.log.error({ err: error }, 'Billing account could not be read');
      return reply.code(503).send(UNAVAILABLE);
    }
  });
};
