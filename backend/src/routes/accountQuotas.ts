import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { BillingRepositoryError, createBillingRepository } from '../billing/repository.js';

// Admins set per-account quota overrides (plan Task 2, spec §3 and §6). The database function
// billing_update_account_quotas does the version check, the writes and the audit in one transaction.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIT_PAGE = 20;
const METRICS = ['tutor_requests', 'graded_exam_attempts', 'active_classes', 'students_per_class', 'import_files', 'active_authored_exams', 'author_ai_requests', 'voice_minutes'] as const;

type ErrorBody = { code: string; error: string; error_en: string };
const err = (code: string, error: string, error_en: string): ErrorBody => ({ code, error, error_en });
const FORBIDDEN = err('FORBIDDEN', 'Chỉ admin mới chỉnh được hạn mức tài khoản.', 'Only admins can change account quotas.');
const NOT_FOUND = err('BILLING_ACCOUNT_NOT_FOUND', 'Không tìm thấy tài khoản.', 'Account not found.');
const ADMIN_ACCOUNT = err('UNSUPPORTED_BILLING_ROLE', 'Tài khoản admin không có gói hay hạn mức.', 'Admin accounts have no plan or quotas.');
const INVALID = err('INVALID_QUOTA_CHANGE', 'Thay đổi không hợp lệ: hạn mức là số nguyên ≥ 0, ngày hết hạn ở tương lai, mỗi mục một lần, lý do 1–500 ký tự.', 'Invalid change: a limit is a whole number ≥ 0, an expiry is in the future, each item once, a reason of 1–500 characters.');
const CONFLICT = err('QUOTA_VERSION_CONFLICT', 'Một admin khác vừa sửa hạn mức này. Tải lại rồi sửa tiếp.', 'Another admin has just changed these quotas. Reload, then edit again.');
const UNAVAILABLE = err('BILLING_UNAVAILABLE', 'Chưa đọc được dữ liệu hạn mức. Thử lại sau.', 'Quota data is not available. Try again later.');

const Change = z.discriminatedUnion('action', [
  z.object({
    metric: z.enum(METRICS),
    action: z.literal('set'),
    limit: z.number().int().min(0).max(1_000_000),
    expiresAt: z.string().datetime({ offset: true }).nullable(),
  }).strict(),
  z.object({ metric: z.enum(METRICS), action: z.literal('reset') }).strict(),
]);
const Patch = z.object({
  expectedVersion: z.number().int().min(0),
  reason: z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(500)),
  changes: z.array(Change).min(1).max(METRICS.length),
}).strict();

const iso = (value: string | null | undefined) => (value ? new Date(value).toISOString() : null);

export const accountQuotaRoutes: FastifyPluginAsync = async (app) => {
  const actor = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string; app_metadata?: { app_role?: string } } }).user;
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (actor(request)?.app_metadata?.app_role !== 'admin') return reply.code(403).send(FORBIDDEN);
  };

  /** Maps a database refusal to its answer; anything unexpected is 503 without the raw message. */
  const refusal = (request: FastifyRequest, reply: FastifyReply, error: unknown) => {
    const code = error instanceof BillingRepositoryError ? error.code : '';
    if (code === 'BILLING_ACCOUNT_NOT_FOUND') return reply.code(404).send(NOT_FOUND);
    if (code === 'UNSUPPORTED_BILLING_ROLE') return reply.code(409).send(ADMIN_ACCOUNT);
    if (code === 'QUOTA_VERSION_CONFLICT') return reply.code(409).send(CONFLICT);
    if (code === 'INVALID_QUOTA_CHANGE') return reply.code(400).send(INVALID);
    request.log.error({ err: error }, 'Account quota request failed');
    return reply.code(503).send(UNAVAILABLE);
  };

  const targetOf = (request: FastifyRequest) => (request.params as { id: string }).id;

  /** Plan, version and effective quotas (with each plan default) of one account. */
  const snapshot = async (id: string) => {
    const supabase = app.supabase!;
    const billing = createBillingRepository((name, args) => supabase.rpc(name, args));
    const now = new Date();
    const quotas = await billing.getEffectiveQuotas(id, now);
    const [version, subscription] = await Promise.all([
      supabase.from('account_quota_versions').select('version').eq('user_id', id).maybeSingle(),
      supabase.from('billing_subscriptions').select('plan_code, paid_through').eq('user_id', id).maybeSingle(),
    ]);
    if (version.error || subscription.error) throw version.error ?? subscription.error;
    const sub = subscription.data as { plan_code: string; paid_through: string } | null;
    const paid = sub && new Date(sub.paid_through) > now ? sub : null;
    // Free plans are not stored: the audience shows in which metrics the account has.
    const plan = paid?.plan_code ?? (quotas.some((q) => q.metric === 'tutor_requests') ? 'student_free' : 'teacher_free');
    const limits = await supabase.from('billing_plan_limits').select('metric, limit_value').eq('plan_code', plan);
    if (limits.error) throw limits.error;
    const planLimit = new Map(((limits.data ?? []) as Array<{ metric: string; limit_value: number }>).map((l) => [l.metric, l.limit_value]));
    return {
      account: { id, plan, paidThrough: iso(paid?.paid_through) },
      version: (version.data as { version: number } | null)?.version ?? 0,
      quotas: quotas.map((q) => ({
        metric: q.metric,
        kind: q.kind,
        limit: q.limit,
        planLimit: planLimit.get(q.metric) ?? q.limit,
        used: q.used,
        reserved: q.reserved,
        source: q.source,
        expiresAt: q.expiresAt,
        resetsAt: q.resetsAt,
      })),
    };
  };

  app.get('/api/admin/accounts/:id/quotas', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const id = targetOf(request);
    if (!UUID.test(id)) return reply.code(404).send(NOT_FOUND);
    try {
      return await snapshot(id);
    } catch (error) {
      return refusal(request, reply, error);
    }
  });

  app.patch('/api/admin/accounts/:id/quotas', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(UNAVAILABLE);
    const id = targetOf(request);
    if (!UUID.test(id)) return reply.code(404).send(NOT_FOUND);
    const parsed = Patch.safeParse(request.body);
    const now = new Date();
    if (!parsed.success) return reply.code(400).send(INVALID);
    const { changes, expectedVersion, reason } = parsed.data;
    const metrics = changes.map((c) => c.metric);
    if (new Set(metrics).size !== metrics.length) return reply.code(400).send(INVALID);
    if (changes.some((c) => c.action === 'set' && c.expiresAt !== null && new Date(c.expiresAt) <= now)) return reply.code(400).send(INVALID);

    const { error } = await app.supabase.rpc('billing_update_account_quotas', {
      p_actor_id: actor(request)!.id,
      p_target_id: id,
      p_expected_version: expectedVersion,
      p_changes: changes.map((c) => (c.action === 'set' ? { metric: c.metric, action: 'set', limit: c.limit, expires_at: c.expiresAt } : c)),
      p_reason: reason,
      p_now: now.toISOString(),
    });
    if (error) {
      const known = ['QUOTA_VERSION_CONFLICT', 'INVALID_QUOTA_CHANGE', 'BILLING_ACCOUNT_NOT_FOUND', 'UNSUPPORTED_BILLING_ROLE'].find((c) => error.message?.includes(c));
      return refusal(request, reply, known ? new BillingRepositoryError(known, error.message ?? known) : error);
    }
    try {
      return await snapshot(id);
    } catch (e) {
      return refusal(request, reply, e);
    }
  });

  app.get('/api/admin/accounts/:id/quota-audit', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(UNAVAILABLE);
    const id = targetOf(request);
    if (!UUID.test(id)) return reply.code(404).send(NOT_FOUND);
    const cursor = (request.query as { cursor?: string }).cursor;
    if (cursor !== undefined && Number.isNaN(Date.parse(cursor))) return reply.code(400).send(err('INVALID_CURSOR', 'Con trỏ trang không hợp lệ.', 'Invalid page cursor.'));

    let query = supabase.from('account_quota_audit').select('id, actor_id, before_state, after_state, reason, created_at').eq('target_id', id);
    if (cursor) query = query.lt('created_at', new Date(cursor).toISOString());
    const { data, error } = await query.order('created_at', { ascending: false }).limit(AUDIT_PAGE + 1);
    if (error) return refusal(request, reply, error);
    const rows = (data ?? []) as Array<{ id: string; actor_id: string | null; before_state: unknown; after_state: unknown; reason: string; created_at: string }>;
    const page = rows.slice(0, AUDIT_PAGE);
    const actorIds = [...new Set(page.flatMap((r) => (r.actor_id ? [r.actor_id] : [])))];
    const people = actorIds.length ? await supabase.from('profiles').select('id, display_name').in('id', actorIds) : { data: [] };
    const names = new Map(((people.data ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name]));
    return {
      entries: page.map((r) => ({
        id: r.id,
        actor: r.actor_id ? { id: r.actor_id, name: names.get(r.actor_id) ?? null } : null,
        before: r.before_state,
        after: r.after_state,
        reason: r.reason,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      next: rows.length > AUDIT_PAGE ? new Date(page[page.length - 1].created_at).toISOString() : null,
    };
  });
};
