import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { cronAuthorized } from '../internal/cron.js';
import { deliverAnnouncement, parseAnnouncement } from './adminAnnouncements.js';

// Scheduled actions: an admin picks a time for an announcement or for maintenance mode to switch on or off.
// A runner called every minute (Supabase pg_cron -> /api/internal/scheduled/run) claims what is due and does it once.

const COLUMNS = 'id, kind, run_at, payload, status, result, error, created_at, finished_at';
const KINDS = ['announcement', 'maintenance_on', 'maintenance_off'] as const;
type Kind = (typeof KINDS)[number];
const MIN_LEAD_MS = 60_000;
const BATCH = 20;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const msg = (error: string, error_en: string) => ({ error, error_en });
const FORBIDDEN = msg('Chỉ admin mới lên lịch.', 'Only admins schedule things.');
const unavailable = msg('Chưa đọc hoặc lưu được lịch. Thử lại sau.', 'The schedule could not be read or saved. Try again later.');
const INVALID = msg(
  'Chọn loại việc, thời điểm ít nhất 1 phút sau bây giờ; thông báo cần nội dung hợp lệ.',
  'Pick a kind and a time at least a minute from now; an announcement needs valid content.',
);

type Row = { id: string; kind: Kind; run_at: string; payload: Record<string, unknown>; status: string };

export const adminScheduledRoutes: FastifyPluginAsync = async (app) => {
  const caller = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string; app_metadata?: { app_role?: string } } }).user;
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (caller(request)?.app_metadata?.app_role !== 'admin') return reply.code(403).send(FORBIDDEN);
  };

  app.get('/api/admin/scheduled', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { data, error } = await app.supabase.from('scheduled_actions').select(COLUMNS).order('run_at', { ascending: false }).limit(50);
    if (error) {
      request.log.error({ err: error }, 'Failed to read scheduled actions');
      return reply.code(500).send(unavailable);
    }
    return reply.send({ scheduled: data ?? [] });
  });

  app.post('/api/admin/scheduled', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = (request.body ?? {}) as { kind?: unknown; run_at?: unknown; payload?: unknown };
    const kind = KINDS.find((k) => k === body.kind);
    const runAt = typeof body.run_at === 'string' ? new Date(body.run_at) : null;
    if (!kind || !runAt || Number.isNaN(runAt.getTime()) || runAt.getTime() < Date.now() + MIN_LEAD_MS) return reply.code(400).send(INVALID);
    let payload: Record<string, unknown> = {};
    if (kind === 'announcement') {
      const requestId = randomUUID();
      if (!parseAnnouncement(body.payload, requestId)) return reply.code(400).send(INVALID);
      payload = { ...(body.payload as Record<string, unknown>), client_request_id: requestId };
    }
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { data, error } = await app.supabase
      .from('scheduled_actions')
      .insert({ kind, run_at: runAt.toISOString(), payload, created_by: caller(request)?.id ?? null })
      .select(COLUMNS)
      .single();
    if (error || !data) {
      request.log.error({ err: error }, 'Failed to store a scheduled action');
      return reply.code(500).send(unavailable);
    }
    return reply.code(201).send({ scheduled: data });
  });

  // Only a pending one can be cancelled; once it started it is the runner's.
  app.delete('/api/admin/scheduled/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(400).send(INVALID);
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { data, error } = await app.supabase
      .from('scheduled_actions')
      .update({ status: 'cancelled', finished_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'pending')
      .select('id');
    if (error) {
      request.log.error({ err: error }, 'Failed to cancel a scheduled action');
      return reply.code(500).send(unavailable);
    }
    if (!data || data.length === 0) return reply.code(404).send(msg('Không có việc nào đang chờ với mã này.', 'No pending item with this id.'));
    return reply.code(204).send();
  });

  // The runner: claim each due row by flipping pending -> running (only one caller wins), then do it.
  app.get('/api/internal/scheduled/run', async (request, reply) => {
    if (!cronAuthorized(request.headers.authorization)) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const due = await supabase.from('scheduled_actions').select(COLUMNS).eq('status', 'pending').lte('run_at', new Date().toISOString()).order('run_at').limit(BATCH);
    if (due.error) {
      request.log.error({ err: due.error }, 'Failed to read due scheduled actions');
      return reply.code(500).send(unavailable);
    }
    let done = 0;
    let failed = 0;
    for (const row of (due.data ?? []) as Row[]) {
      const claimed = await supabase.from('scheduled_actions').update({ status: 'running' }).eq('id', row.id).eq('status', 'pending').select('id');
      if (claimed.error || !claimed.data || claimed.data.length === 0) continue;
      let status: 'done' | 'failed' = 'done';
      let result: Record<string, unknown> | null = null;
      let failure: string | null = null;
      try {
        if (row.kind === 'announcement') {
          const input = parseAnnouncement(row.payload, row.id);
          if (!input) throw new Error('Invalid announcement payload');
          const sent = await deliverAnnouncement(supabase, request.log, null, input);
          if (!sent) throw new Error('Announcement could not be stored');
          result = { app_count: sent.announcement.app_count, email_count: sent.announcement.email_count, ...(sent.warning ? { warning: sent.warning } : {}) };
        } else {
          const { error } = await supabase.from('site_settings').update({ maintenance: row.kind === 'maintenance_on', updated_at: new Date().toISOString() }).eq('id', 1);
          if (error) throw error;
          app.siteSettings?.invalidate();
          result = { maintenance: row.kind === 'maintenance_on' };
        }
      } catch (err) {
        status = 'failed';
        failure = err instanceof Error ? err.message : String(err);
        request.log.error({ err, id: row.id }, 'Scheduled action failed');
      }
      await supabase.from('scheduled_actions').update({ status, result, error: failure, finished_at: new Date().toISOString() }).eq('id', row.id);
      if (status === 'done') done += 1;
      else failed += 1;
    }
    return reply.send({ done, failed });
  });
};
