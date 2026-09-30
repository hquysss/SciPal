import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

// Admins edit each plan's default limits, description and prices (migration
// 20260929140000_admin_plan_settings). billing_update_plan checks the version, writes and audits
// in one transaction; a new price replaces the active one and sold orders keep theirs.

const PLAN_ORDER = ['student_free', 'student_plus', 'teacher_free', 'teacher_pro'] as const;
const METRIC_ORDER = ['tutor_requests', 'voice_minutes', 'graded_exam_attempts', 'active_classes', 'students_per_class', 'active_authored_exams', 'import_files', 'author_ai_requests'];
const AUDIT_LIMIT = 20;

type ErrorBody = { code: string; error: string; error_en: string };
const err = (code: string, error: string, error_en: string): ErrorBody => ({ code, error, error_en });
const FORBIDDEN = err('FORBIDDEN', 'Chỉ quản trị viên mới chỉnh được gói.', 'Only admins can edit plans.');
const NOT_FOUND = err('PLAN_NOT_FOUND', 'Không tìm thấy gói.', 'Plan not found.');
const INVALID = err('INVALID_PLAN_CHANGE', 'Thay đổi không hợp lệ: hạn mức là số nguyên ≥ 0, giá từ 1.000 ₫, mô tả EN/VI 1–500 ký tự, tối đa 8 quyền lợi (mỗi dòng EN/VI 1–120 ký tự), lý do 1–500 ký tự; lớp, học sinh/lớp và đề đang hoạt động không tính theo ngày/tháng.', 'Invalid change: limits are whole numbers ≥ 0, prices from 1,000 VND, EN/VI descriptions of 1–500 characters, up to 8 benefits (EN/VI 1–120 characters each), a reason of 1–500 characters; classes, students per class and active exams are not counted per day or month.');
const CONFLICT = err('PLAN_VERSION_CONFLICT', 'Một admin khác vừa sửa gói này. Tải lại rồi sửa tiếp.', 'Another admin has just changed this plan. Reload, then edit again.');
const UNAVAILABLE = err('BILLING_UNAVAILABLE', 'Chưa đọc hoặc lưu được gói. Thử lại sau.', 'Plans could not be read or saved. Try again later.');

const Text = z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(500));
const Perk = z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(120));
const Patch = z.object({
  expectedVersion: z.number().int().min(1),
  reason: Text,
  limits: z.array(z.object({
    metric: z.enum(METRIC_ORDER as [string, ...string[]]),
    kind: z.enum(['daily', 'monthly', 'capacity']),
    limit: z.number().int().min(0).max(1_000_000),
  }).strict()).max(METRIC_ORDER.length).optional(),
  description: z.object({ en: Text, vi: Text }).strict().optional(),
  perks: z.array(z.object({ en: Perk, vi: Perk }).strict()).max(8).optional(),
  prices: z.object({
    month: z.number().int().min(1000).max(100_000_000).optional(),
    year: z.number().int().min(1000).max(100_000_000).optional(),
  }).strict().optional(),
}).strict();

type PlanRow = { code: string; audience: string; name_en: string; name_vi: string; description_en: string; description_vi: string; perks: Array<{ en: string; vi: string }> | null; version: number };
type LimitRow = { plan_code: string; metric: string; kind: string; limit_value: number };
type PriceRow = { plan_code: string; interval: string; amount_vnd: number };
type AuditRow = { id: string; plan_code: string; actor_id: string | null; reason: string; before_state: unknown; after_state: unknown; created_at: string };

export const adminPlanRoutes: FastifyPluginAsync = async (app) => {
  const actor = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string; app_metadata?: { app_role?: string } } }).user;
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (actor(request)?.app_metadata?.app_role !== 'admin') return reply.code(403).send(FORBIDDEN);
  };

  app.get('/api/admin/plans', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase!;
    const [plans, limits, prices, audit] = await Promise.all([
      supabase.from('billing_plans').select('code, audience, name_en, name_vi, description_en, description_vi, perks, version'),
      supabase.from('billing_plan_limits').select('plan_code, metric, kind, limit_value'),
      supabase.from('billing_prices').select('id, plan_code, interval, amount_vnd').eq('active', true),
      supabase.from('billing_plan_audit').select('id, plan_code, actor_id, reason, before_state, after_state, created_at').order('created_at', { ascending: false }).limit(AUDIT_LIMIT),
    ]);
    const failure = plans.error ?? limits.error ?? prices.error ?? audit.error;
    if (failure) {
      request.log.error({ err: failure }, 'Plans could not be read');
      return reply.code(503).send(UNAVAILABLE);
    }
    const planRows = (plans.data ?? []) as PlanRow[];
    const limitRows = (limits.data ?? []) as LimitRow[];
    const priceRows = (prices.data ?? []) as PriceRow[];
    return {
      plans: PLAN_ORDER.flatMap((code) => {
        const row = planRows.find((p) => p.code === code);
        if (!row) return [];
        const paid = priceRows.filter((p) => p.plan_code === code);
        return [{
          code,
          audience: row.audience,
          name: { en: row.name_en, vi: row.name_vi },
          description: { en: row.description_en, vi: row.description_vi },
          perks: row.perks ?? [],
          version: row.version,
          limits: limitRows
            .filter((l) => l.plan_code === code)
            .sort((a, b) => METRIC_ORDER.indexOf(a.metric) - METRIC_ORDER.indexOf(b.metric))
            .map((l) => ({ metric: l.metric, kind: l.kind, limit: l.limit_value })),
          prices: paid.length
            ? { month: paid.find((p) => p.interval === 'month')?.amount_vnd ?? null, year: paid.find((p) => p.interval === 'year')?.amount_vnd ?? null }
            : null,
        }];
      }),
      audit: ((audit.data ?? []) as AuditRow[]).map((a) => ({
        id: a.id,
        planCode: a.plan_code,
        actorId: a.actor_id,
        reason: a.reason,
        before: a.before_state,
        after: a.after_state,
        createdAt: new Date(a.created_at).toISOString(),
      })),
    };
  });

  app.patch('/api/admin/plans/:code', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { code } = request.params as { code: string };
    if (!(PLAN_ORDER as readonly string[]).includes(code)) return reply.code(404).send(NOT_FOUND);
    const parsed = Patch.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(INVALID);
    const body = parsed.data;
    const { data, error } = await app.supabase!.rpc('billing_update_plan', {
      p_actor_id: actor(request)!.id,
      p_plan_code: code,
      p_expected_version: body.expectedVersion,
      p_reason: body.reason,
      p_limits: body.limits ?? null,
      p_description: body.description ?? null,
      p_prices: body.prices ?? null,
      p_perks: body.perks ?? null,
    });
    if (error) {
      if (error.message === 'PLAN_VERSION_CONFLICT') return reply.code(409).send(CONFLICT);
      if (error.message === 'INVALID_PLAN_CHANGE') return reply.code(400).send(INVALID);
      if (error.message === 'PLAN_NOT_FOUND') return reply.code(404).send(NOT_FOUND);
      request.log.error({ err: error }, 'Plan could not be saved');
      return reply.code(503).send(UNAVAILABLE);
    }
    return { version: Number(data) };
  });
};
