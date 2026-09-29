import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

// A student asks to become a teacher (profile page); an admin approves or declines it on the
// account management page. Approving sets the account's app_role to teacher through the Auth
// admin API, the only way roles change. Rows are read and written by this backend only.

type Caller = { id?: string; email?: string; user_metadata?: { display_name?: unknown; full_name?: unknown }; app_metadata?: { app_role?: string } };

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = 'id, user_id, email, display_name, school, subject, note, evidence_url, status, review_note, reviewed_at, created_at';
const LIMITS = { school: 200, subject: 100, note: 1000, evidenceUrl: 2048, reviewNote: 1000, displayName: 100 };

const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ tài khoản chưa sẵn sàng.', 'The account service is not available.');
const failed = msg('Chưa xử lý được yêu cầu. Thử lại sau ít phút.', 'Could not handle the request. Try again in a few minutes.');
const notFound = msg('Không tìm thấy yêu cầu.', 'Request not found.');

const text = (value: unknown, max: number): string | null | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > max ? null : trimmed;
};

function httpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export const teacherRequestRoutes: FastifyPluginAsync = async (app) => {
  const caller = (request: FastifyRequest) => (request as FastifyRequest & { user?: Caller }).user;

  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!caller(request)?.id) return reply.code(401).send(msg('Hãy đăng nhập.', 'Please sign in.'));
  };
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (caller(request)?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send(msg('Chỉ admin mới duyệt yêu cầu làm giáo viên.', 'Only admins review teacher requests.'));
    }
  };

  app.post('/api/teacher-requests', { preHandler: [requireUser] }, async (request, reply) => {
    const user = caller(request)!;
    const role = user.app_metadata?.app_role ?? 'student';
    if (role !== 'student') {
      return reply.code(409).send({ code: 'ALREADY_STAFF', ...msg('Tài khoản này đã là giáo viên hoặc admin.', 'This account is already a teacher or admin.') });
    }
    const body = (request.body ?? {}) as Record<string, unknown>;
    const school = text(body.school, LIMITS.school);
    const subject = text(body.subject, LIMITS.subject);
    const note = text(body.note, LIMITS.note);
    const evidence = text(body.evidence_url, LIMITS.evidenceUrl);
    if (!school) return reply.code(400).send(msg(`Nhập tên trường (tối đa ${LIMITS.school} ký tự).`, `Enter your school (up to ${LIMITS.school} characters).`));
    if (!subject) return reply.code(400).send(msg(`Nhập môn dạy (tối đa ${LIMITS.subject} ký tự).`, `Enter the subject you teach (up to ${LIMITS.subject} characters).`));
    if (note === null) return reply.code(400).send(msg(`Lời nhắn tối đa ${LIMITS.note} ký tự.`, `The message is limited to ${LIMITS.note} characters.`));
    const evidenceUrl = evidence ? httpUrl(evidence) : evidence === '' ? '' : evidence;
    if (evidenceUrl === null) return reply.code(400).send(msg('Link minh chứng phải bắt đầu bằng http:// hoặc https://.', 'The evidence link must start with http:// or https://.'));

    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const named = user.user_metadata?.display_name ?? user.user_metadata?.full_name;
    const { data, error } = await supabase
      .from('teacher_requests')
      .insert({
        user_id: user.id,
        email: user.email ?? null,
        display_name: typeof named === 'string' ? named.slice(0, LIMITS.displayName) : null,
        school,
        subject,
        note: note || null,
        evidence_url: evidenceUrl || null,
      })
      .select(COLUMNS)
      .single();
    if (error?.code === '23505') {
      return reply.code(409).send({ code: 'REQUEST_PENDING', ...msg('Bạn đã có một yêu cầu đang chờ duyệt.', 'You already have a request waiting for review.') });
    }
    if (error) {
      request.log.error({ err: error }, 'Failed to store a teacher request');
      return reply.code(500).send(failed);
    }
    return reply.code(201).send({ request: data });
  });

  app.get('/api/teacher-requests/mine', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { data, error } = await supabase
      .from('teacher_requests')
      .select(COLUMNS)
      .eq('user_id', caller(request)!.id!)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      request.log.error({ err: error }, 'Failed to read a teacher request');
      return reply.code(500).send(failed);
    }
    return reply.send({ request: data ?? null });
  });

  app.delete('/api/teacher-requests/mine', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { error } = await supabase
      .from('teacher_requests')
      .update({ status: 'cancelled' })
      .eq('user_id', caller(request)!.id!)
      .eq('status', 'pending')
      .select('id');
    if (error) {
      request.log.error({ err: error }, 'Failed to cancel a teacher request');
      return reply.code(500).send(failed);
    }
    return reply.code(204).send();
  });

  app.get('/api/admin/teacher-requests', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { data, error } = await supabase
      .from('teacher_requests')
      .select(COLUMNS)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) {
      request.log.error({ err: error }, 'Failed to list teacher requests');
      return reply.code(500).send(failed);
    }
    return reply.send({ requests: data ?? [] });
  });

  app.get('/api/admin/teacher-requests/count', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { count, error } = await supabase.from('teacher_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    if (error) {
      request.log.error({ err: error }, 'Failed to count teacher requests');
      return reply.code(500).send(failed);
    }
    return reply.send({ pending: count ?? 0 });
  });

  /** Close a pending request (only one admin wins); null when it is not pending any more. */
  const close = async (id: string, adminId: string, changes: Record<string, unknown>) => {
    const { data, error } = await app.supabase!
      .from('teacher_requests')
      .update({ ...changes, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select(COLUMNS)
      .maybeSingle();
    return { row: data as { id: string; user_id: string } | null, error };
  };
  const handled = msg('Yêu cầu này đã được xử lý hoặc đã bị hủy.', 'This request was already handled or cancelled.');

  app.post('/api/admin/teacher-requests/:id/approve', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(404).send(notFound);
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);

    const { row, error } = await close(id, caller(request)!.id!, { status: 'approved', review_note: null });
    if (error) {
      request.log.error({ err: error }, 'Failed to approve a teacher request');
      return reply.code(500).send(failed);
    }
    if (!row) return reply.code(409).send(handled);

    const { error: roleError } = await supabase.auth.admin.updateUserById(row.user_id, { app_metadata: { app_role: 'teacher' } });
    if (roleError) {
      // The role did not change: put the request back so it can be approved again.
      await supabase.from('teacher_requests').update({ status: 'pending', reviewed_by: null, reviewed_at: null }).eq('id', id);
      request.log.error({ err: roleError }, 'Failed to make an account a teacher');
      return reply.code(503).send(msg('Chưa đổi được vai trò tài khoản. Thử lại sau ít phút.', 'Could not change the account role. Try again in a few minutes.'));
    }
    const { error: profileError } = await supabase.from('profiles').update({ role: 'teacher' }).eq('id', row.user_id);
    if (profileError) request.log.warn({ err: profileError }, 'Teacher approved; profile role not updated');
    return reply.send({ request: row });
  });

  app.post('/api/admin/teacher-requests/:id/reject', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(404).send(notFound);
    const note = text((request.body as { note?: unknown } | undefined)?.note, LIMITS.reviewNote);
    if (!note) return reply.code(400).send(msg(`Ghi lý do từ chối (1–${LIMITS.reviewNote} ký tự).`, `Give a reason (1–${LIMITS.reviewNote} characters).`));
    if (!app.supabase) return reply.code(503).send(unavailable);

    const { row, error } = await close(id, caller(request)!.id!, { status: 'rejected', review_note: note });
    if (error) {
      request.log.error({ err: error }, 'Failed to decline a teacher request');
      return reply.code(500).send(failed);
    }
    if (!row) return reply.code(409).send(handled);
    return reply.send({ request: row });
  });
};
