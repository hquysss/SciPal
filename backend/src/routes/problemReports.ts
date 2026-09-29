import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { clientIp, guestSecret, visitorHash } from '../guest/visitor.js';

// Anyone reports a problem (landing footer, profile page): an account, or a visitor known only by
// an HMAC of their address. An admin reads open reports on the account management page and marks
// them resolved. Rows are read and written by this backend only.

type Caller = { id?: string; email?: string; app_metadata?: { app_role?: string } };

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES = ['bug', 'content', 'payment', 'account', 'other'] as const;
const COLUMNS = 'id, user_id, email, category, message, page_url, user_agent, status, created_at';
const LIMITS = { messageMin: 10, message: 2000, pageUrl: 2048, userAgent: 500, email: 320 };
/** Reports one person may send in an hour. */
const PER_HOUR = 5;

const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ báo cáo chưa sẵn sàng.', 'The report service is not available.');
const failed = msg('Chưa gửi được báo cáo. Thử lại sau ít phút.', 'Could not send the report. Try again in a few minutes.');

function httpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export const problemReportRoutes: FastifyPluginAsync = async (app) => {
  const caller = (request: FastifyRequest) => (request as FastifyRequest & { user?: Caller }).user;

  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (caller(request)?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send(msg('Chỉ admin mới xem báo cáo.', 'Only admins read reports.'));
    }
  };

  app.post('/api/problem-reports', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const category = CATEGORIES.find((c) => c === body.category);
    if (!category) return reply.code(400).send(msg('Chọn loại vấn đề.', 'Choose what kind of problem it is.'));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (message.length < LIMITS.messageMin || message.length > LIMITS.message) {
      return reply.code(400).send(msg(`Mô tả vấn đề trong ${LIMITS.messageMin}–${LIMITS.message} ký tự.`, `Describe the problem in ${LIMITS.messageMin}–${LIMITS.message} characters.`));
    }
    let pageUrl: string | null = null;
    if (typeof body.page_url === 'string' && body.page_url.trim()) {
      pageUrl = body.page_url.length <= LIMITS.pageUrl ? httpUrl(body.page_url.trim()) : null;
      if (!pageUrl) return reply.code(400).send(msg('Địa chỉ trang không hợp lệ.', 'The page address is not valid.'));
    }
    let typedEmail: string | null = null;
    if (typeof body.email === 'string' && body.email.trim()) {
      typedEmail = body.email.trim();
      if (typedEmail.length > LIMITS.email || !EMAIL.test(typedEmail)) return reply.code(400).send(msg('Email không hợp lệ.', 'The e-mail is not valid.'));
    }

    const user = caller(request);
    let visitor: string | null = null;
    if (!user?.id) {
      const secret = guestSecret();
      if (!secret) return reply.code(401).send(msg('Hãy đăng nhập để gửi báo cáo.', 'Please sign in to send a report.'));
      visitor = visitorHash(clientIp(request), secret);
    }

    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('problem_reports')
      .select('id', { count: 'exact', head: true })
      .eq(user?.id ? 'user_id' : 'visitor_hash', user?.id ?? visitor)
      .gte('created_at', since);
    if (countError) {
      request.log.error({ err: countError }, 'Failed to count recent problem reports');
      return reply.code(500).send(failed);
    }
    if ((count ?? 0) >= PER_HOUR) {
      return reply.code(429).send(msg('Bạn đã gửi nhiều báo cáo trong giờ qua. Thử lại sau nhé.', 'You sent several reports in the last hour. Try again later.'));
    }

    const agent = request.headers['user-agent'];
    const { data, error } = await supabase
      .from('problem_reports')
      .insert({
        user_id: user?.id ?? null,
        visitor_hash: visitor,
        email: user?.email ?? typedEmail,
        category,
        message,
        page_url: pageUrl,
        user_agent: typeof agent === 'string' ? agent.slice(0, LIMITS.userAgent) : null,
      })
      .select('id')
      .single();
    if (error) {
      request.log.error({ err: error }, 'Failed to store a problem report');
      return reply.code(500).send(failed);
    }
    return reply.code(201).send({ report: data });
  });

  app.get('/api/admin/problem-reports', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { data, error } = await supabase
      .from('problem_reports')
      .select(COLUMNS)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      request.log.error({ err: error }, 'Failed to list problem reports');
      return reply.code(500).send(failed);
    }
    return reply.send({ reports: data ?? [] });
  });

  app.post('/api/admin/problem-reports/:id/resolve', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(404).send(msg('Không tìm thấy báo cáo.', 'Report not found.'));
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { data, error } = await supabase
      .from('problem_reports')
      .update({ status: 'resolved', resolved_by: caller(request)!.id!, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'open')
      .select(COLUMNS)
      .maybeSingle();
    if (error) {
      request.log.error({ err: error }, 'Failed to resolve a problem report');
      return reply.code(500).send(failed);
    }
    if (!data) return reply.code(409).send(msg('Báo cáo này đã được xử lý.', 'This report was already handled.'));
    return reply.send({ report: data });
  });
};
