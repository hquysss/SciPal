import { createHash, randomInt } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

// Highland / hardship support (migration 20261022090000_support_access): a student or teacher sends an
// application, an admin decides it, and an admin can hand out codes that an account redeems. Both end in
// billing_grant_support_time. The rules live in SQL; these routes check the input and map the answers.

type ErrorBody = { code: string; error: string; error_en: string };
const err = (code: string, error: string, error_en: string): ErrorBody => ({ code, error, error_en });
const FORBIDDEN = err('FORBIDDEN', 'Chỉ quản trị viên mới dùng được mục này.', 'Only administrators can use this.');
const INVALID = err('INVALID_SUPPORT_REQUEST', 'Thông tin chưa hợp lệ. Kiểm tra lại các ô đã nhập.', 'Some details are not valid. Check the fields.');
const BAD_CODE = err('INVALID_ACCESS_CODE', 'Mã không hợp lệ hoặc đã hết hạn.', 'The code is not valid or has expired.');
const LOCKED = err('ACCESS_CODE_LOCKED', 'Bạn nhập sai quá nhiều lần. Thử lại sau một giờ.', 'Too many wrong codes. Try again in an hour.');
const PENDING = err('SUPPORT_APPLICATION_PENDING', 'Bạn đã có một đơn đang chờ xem xét.', 'You already have an application waiting for review.');
const TOO_MANY = err('SUPPORT_APPLICATION_LIMIT', 'Bạn đã gửi đủ 3 đơn trong 30 ngày qua. Thử lại sau.', 'You have sent 3 applications in the last 30 days. Try again later.');
const UNSUPPORTED = err('SUPPORT_ROLE_UNSUPPORTED', 'Chỉ tài khoản học sinh và giáo viên dùng được mục này.', 'Only student and teacher accounts can use this.');
const NOT_FOUND = err('SUPPORT_NOT_FOUND', 'Không tìm thấy mục này.', 'Not found.');
const DECIDED = err('SUPPORT_ALREADY_DECIDED', 'Đơn này đã được xử lý.', 'This application has already been decided.');
const UNAVAILABLE = err('SUPPORT_UNAVAILABLE', 'Chưa xử lý được lúc này. Thử lại sau.', 'Could not be done right now. Try again later.');

const Text = (max: number) => z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(max));
const Application = z.object({ fullName: Text(120), school: Text(200), area: Text(200), reason: Text(1000) }).strict();
const Redeem = z.object({ code: z.string().max(64) }).strict();
const Decision = z.object({
  approve: z.boolean(),
  months: z.number().int().min(1).max(12).optional(),
  note: z.string().transform((s) => s.trim()).pipe(z.string().max(500)).optional(),
}).strict().refine((d) => (d.approve ? d.months !== undefined : Boolean(d.note)));
const NewCode = z.object({
  planCode: z.enum(['student_plus', 'teacher_pro']),
  /** The admin's own code. Left out, one is generated. Same shape the redeem route accepts. */
  code: z.string().max(40).optional(),
  months: z.number().int().min(1).max(12).default(3),
  maxUses: z.number().int().min(1).max(1000).default(1),
  expiresAt: z.string().datetime().optional(),
  note: z.string().transform((s) => s.trim()).pipe(z.string().max(200)).optional(),
}).strict();
const Listing = z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() }).strict();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// No 0/O, 1/I/L: a code read out or copied by hand stays unambiguous.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 12;
const newCode = () => Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('').match(/.{4}/g)!.join('-');
/** A code is matched exactly as the admin made it: same letters, same case, same dashes. Only stray outer spaces go. */
const normalizeCode = (raw: string) => raw.trim();
const CODE_SHAPE = /^[A-Za-z0-9-]{8,32}$/;
const BAD_SHAPE = err('INVALID_ACCESS_CODE_SHAPE', 'Mã tự đặt gồm 8–32 ký tự: chữ cái, số hoặc gạch ngang.', 'A custom code is 8–32 characters: letters, digits or dashes.');
const CODE_TAKEN = err('ACCESS_CODE_TAKEN', 'Mã này đã có người dùng. Chọn mã khác.', 'That code already exists. Choose another.');
const hashCode = (normalized: string) => createHash('sha256').update(normalized).digest('hex');

type Row = Record<string, unknown>;
const iso = (value: unknown) => (typeof value === 'string' ? new Date(value).toISOString() : null);

export const supportAccessRoutes: FastifyPluginAsync = async (app) => {
  const actor = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id: string; app_metadata?: { app_role?: string } } }).user!;
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (actor(request).app_metadata?.app_role !== 'admin') return reply.code(403).send(FORBIDDEN);
  };
  const failed = (request: FastifyRequest, reply: FastifyReply, error: unknown, what: string) => {
    request.log.error({ err: error }, what);
    return reply.code(503).send(UNAVAILABLE);
  };

  // ---- an account sends an application and sees how it went ----

  app.post('/api/support/applications', async (request, reply) => {
    const parsed = Application.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(INVALID);
    const { fullName, school, area, reason } = parsed.data;
    const { data, error } = await app.supabase!.rpc('support_submit_application', {
      p_user_id: actor(request).id, p_full_name: fullName, p_school: school, p_area: area, p_reason: reason, p_now: new Date().toISOString(),
    });
    if (error) return failed(request, reply, error, 'Application could not be saved');
    const row = (Array.isArray(data) ? data[0] : data) as { result_status?: string; result_id?: string } | undefined;
    switch (row?.result_status) {
      case 'ok': return reply.code(201).send({ id: row.result_id });
      case 'pending_exists': return reply.code(409).send(PENDING);
      case 'too_many': return reply.code(429).send(TOO_MANY);
      case 'unsupported': return reply.code(403).send(UNSUPPORTED);
      default: return failed(request, reply, row, 'Unexpected application answer');
    }
  });

  app.get('/api/support/applications/mine', async (request, reply) => {
    const userId = actor(request).id;
    const [apps, sub] = await Promise.all([
      app.supabase!.from('support_applications').select('id, role, status, decision_note, granted_months, decided_at, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
      app.supabase!.from('billing_subscriptions').select('plan_code, paid_through').eq('user_id', userId).maybeSingle(),
    ]);
    if (apps.error || sub.error) return failed(request, reply, apps.error ?? sub.error, 'Applications could not be read');
    const a = ((apps.data ?? []) as Row[])[0];
    const s = sub.data as Row | null;
    return {
      application: a ? { id: a.id, role: a.role, status: a.status, decisionNote: a.decision_note ?? null, grantedMonths: a.granted_months ?? null, decidedAt: iso(a.decided_at), createdAt: iso(a.created_at) } : null,
      plan: s ? { planCode: s.plan_code, paidThrough: iso(s.paid_through) } : null,
    };
  });

  // ---- an account redeems a code ----

  app.post('/api/billing/codes/redeem', async (request, reply) => {
    const parsed = Redeem.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(INVALID);
    const code = normalizeCode(parsed.data.code);
    // Not even a shape of a code: same answer as a wrong one, without counting as a guess.
    if (!CODE_SHAPE.test(code)) return reply.code(400).send(BAD_CODE);
    const { data, error } = await app.supabase!.rpc('billing_redeem_code', {
      p_user_id: actor(request).id, p_code_hash: hashCode(code), p_now: new Date().toISOString(),
    });
    if (error) return failed(request, reply, error, 'Code could not be redeemed');
    const row = (Array.isArray(data) ? data[0] : data) as { result_status?: string; result_plan?: string; result_through?: string } | undefined;
    switch (row?.result_status) {
      case 'ok': return { planCode: row.result_plan, paidThrough: iso(row.result_through) };
      case 'invalid': return reply.code(400).send(BAD_CODE);
      case 'locked': return reply.code(429).send(LOCKED);
      default: return failed(request, reply, row, 'Unexpected redeem answer');
    }
  });

  // ---- admin: applications ----

  app.get('/api/admin/support/applications', { preHandler: [requireAdmin] }, async (request, reply) => {
    const query = Listing.safeParse(request.query);
    if (!query.success) return reply.code(400).send(INVALID);
    let select = app.supabase!.from('support_applications')
      .select('id, user_id, role, full_name, school, area, reason, status, decision_note, granted_months, decided_at, created_at');
    if (query.data.status) select = select.eq('status', query.data.status);
    const { data, error } = await select.order('created_at', { ascending: false }).limit(100);
    if (error) return failed(request, reply, error, 'Applications could not be listed');
    return {
      applications: ((data ?? []) as Row[]).map((a) => ({
        id: a.id, userId: a.user_id, role: a.role, fullName: a.full_name, school: a.school, area: a.area, reason: a.reason,
        status: a.status, decisionNote: a.decision_note ?? null, grantedMonths: a.granted_months ?? null,
        decidedAt: iso(a.decided_at), createdAt: iso(a.created_at),
      })),
    };
  });

  app.post('/api/admin/support/applications/:id/decision', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = Decision.safeParse(request.body);
    if (!UUID.test(id) || !parsed.success) return reply.code(400).send(INVALID);
    const { approve, months, note } = parsed.data;
    const { data, error } = await app.supabase!.rpc('support_decide_application', {
      p_id: id, p_admin: actor(request).id, p_approve: approve, p_months: approve ? months : null, p_note: note || null, p_now: new Date().toISOString(),
    });
    if (error) return failed(request, reply, error, 'Application could not be decided');
    const row = (Array.isArray(data) ? data[0] : data) as { result_status?: string; result_plan?: string; result_through?: string } | undefined;
    switch (row?.result_status) {
      case 'approved': return { status: 'approved', planCode: row.result_plan, paidThrough: iso(row.result_through) };
      case 'rejected': return { status: 'rejected' };
      case 'not_found': return reply.code(404).send(NOT_FOUND);
      case 'already_decided': return reply.code(409).send(DECIDED);
      case 'unsupported': return reply.code(409).send(UNSUPPORTED);
      default: return failed(request, reply, row, 'Unexpected decision answer');
    }
  });

  // ---- admin: codes ----

  app.post('/api/admin/billing/codes', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = NewCode.safeParse(request.body);
    if (!parsed.success || (parsed.data.expiresAt && new Date(parsed.data.expiresAt) <= new Date())) return reply.code(400).send(INVALID);
    const { planCode, months, maxUses, expiresAt, note } = parsed.data;
    const typed = parsed.data.code ? normalizeCode(parsed.data.code) : '';
    if (parsed.data.code && !CODE_SHAPE.test(typed)) return reply.code(400).send(BAD_SHAPE);
    const code = typed || newCode();
    const hash = hashCode(code);
    const insert = () => app.supabase!.from('billing_access_codes').insert({
      code_hash: hash, code_hint: code.slice(-4), plan_code: planCode, months, max_uses: maxUses,
      expires_at: expiresAt ?? null, note: note || null, created_by: actor(request).id,
    }).select('id').single();
    let { data, error } = await insert();
    if (error?.code === '23505' && typed) {
      // A revoked code frees its text: rename the old row so the same code can be made again.
      const old = await app.supabase!.from('billing_access_codes').select('id').eq('code_hash', hash).not('revoked_at', 'is', null).maybeSingle();
      const oldId = (old.data as Row | null)?.id;
      if (oldId) {
        const freed = await app.supabase!.from('billing_access_codes').update({ code_hash: hashCode(`revoked:${oldId}`) }).eq('id', oldId);
        if (!freed.error) ({ data, error } = await insert());
      }
    }
    if (error?.code === '23505') return reply.code(409).send(CODE_TAKEN);
    if (error) return failed(request, reply, error, 'Code could not be created');
    // The only time the code is shown: only its hash is kept.
    return reply.code(201).send({ id: (data as Row).id, code, display: code });
  });

  app.get('/api/admin/billing/codes', { preHandler: [requireAdmin] }, async (request, reply) => {
    const codes = await app.supabase!.from('billing_access_codes')
      .select('id, code_hint, plan_code, months, max_uses, expires_at, note, revoked_at, created_at').order('created_at', { ascending: false }).limit(100);
    if (codes.error) return failed(request, reply, codes.error, 'Codes could not be listed');
    const rows = (codes.data ?? []) as Row[];
    const uses = new Map<string, number>();
    if (rows.length) {
      const used = await app.supabase!.from('billing_code_redemptions').select('code_id').in('code_id', rows.map((c) => c.id));
      if (used.error) return failed(request, reply, used.error, 'Redemptions could not be read');
      for (const r of (used.data ?? []) as Row[]) uses.set(String(r.code_id), (uses.get(String(r.code_id)) ?? 0) + 1);
    }
    return {
      codes: rows.map((c) => ({
        id: c.id, hint: c.code_hint, planCode: c.plan_code, months: c.months, maxUses: c.max_uses, uses: uses.get(String(c.id)) ?? 0,
        expiresAt: iso(c.expires_at), note: c.note ?? null, revokedAt: iso(c.revoked_at), createdAt: iso(c.created_at),
      })),
    };
  });

  app.post('/api/admin/billing/codes/:id/revoke', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) return reply.code(400).send(INVALID);
    const { data, error } = await app.supabase!.from('billing_access_codes')
      .update({ revoked_at: new Date().toISOString() }).eq('id', id).is('revoked_at', null).select('id');
    if (error) return failed(request, reply, error, 'Code could not be revoked');
    if (!((data ?? []) as Row[]).length) return reply.code(404).send(NOT_FOUND);
    return { revoked: true };
  });
};
