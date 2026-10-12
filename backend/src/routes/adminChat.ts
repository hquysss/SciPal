import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

// Moderation for community chat: open reports (each about a whole conversation, with the messages that
// were there when it was reported), soft-deleting a message, banning an account from chat.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable = { error: 'Dịch vụ trò chuyện chưa sẵn sàng.', error_en: 'Chat is not available yet.' };
const failed = { error: 'Chưa xử lý được. Thử lại sau nhé.', error_en: 'That did not work. Try again later.' };
const notFound = { error: 'Không tìm thấy.', error_en: 'Not found.' };
const invalid = { error: 'Yêu cầu không hợp lệ.', error_en: 'That request is not valid.' };

type Evidence = { id: string; sender_id: string; sender_name: string; body: string; image_url: string | null; created_at: string };
type ReportRow = { id: string; reason: string; created_at: string; label: string | null; snapshot: Evidence[] | null };

export const adminChatRoutes: FastifyPluginAsync = async (app) => {
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as FastifyRequest & { user?: { id?: string; app_metadata?: { app_role?: string } } }).user;
    if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Sign in again.' });
    if (user.app_metadata?.app_role !== 'admin') return reply.code(403).send({ error: 'Chỉ quản trị viên mới có quyền này.', error_en: 'Admins only.' });
  };

  /** Deletes a message's picture from the store; only files under chat/ are ever touched, and a failure is only logged. */
  const removePicture = async (request: FastifyRequest, url: string | null) => {
    const store = app.mediaStore;
    if (!url || !store) return;
    const base = store.publicUrl('');
    const key = url.startsWith(base) ? url.slice(base.length) : '';
    if (!key.startsWith('chat/') || key.includes('..')) return;
    try {
      await store.remove(key);
    } catch (err) {
      request.log.warn({ err, key }, 'Chat picture was not removed');
    }
  };

  app.get('/api/admin/chat/reports', { preHandler: [requireAdmin] }, async (_request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { data, error } = await app.supabase.from('chat_reports')
      .select('id, reason, created_at, label, snapshot')
      .is('handled_at', null).not('conversation_key', 'is', null).order('created_at', { ascending: false }).limit(100);
    if (error) return reply.code(500).send(failed);
    const rows = (data ?? []) as ReportRow[];
    const ids = rows.flatMap((r) => (r.snapshot ?? []).map((m) => m.id));

    // The snapshot keeps what was said; this only marks which of those messages an admin has since removed.
    let removed = new Set<string>();
    if (ids.length > 0) {
      const gone = await app.supabase.from('chat_messages').select('id').in('id', ids).not('deleted_at', 'is', null);
      if (gone.error) return reply.code(500).send(failed);
      removed = new Set(((gone.data ?? []) as Array<{ id: string }>).map((m) => m.id));
    }
    const reports = rows.map((r) => ({
      id: r.id, reason: r.reason, created_at: r.created_at, label: r.label ?? '',
      messages: (r.snapshot ?? []).map((m) => ({ ...m, deleted: removed.has(m.id) })),
    }));
    return reply.send({ reports });
  });

  app.post('/api/admin/chat/reports/:id/resolve', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const id = (request.params as { id: string }).id;
    if (!UUID_PATTERN.test(id)) return reply.code(404).send(notFound);
    const { data, error } = await app.supabase.from('chat_reports').update({ handled_at: new Date().toISOString() })
      .eq('id', id).is('handled_at', null).select('id');
    if (error) return reply.code(500).send(failed);
    if (((data as unknown[] | null) ?? []).length === 0) return reply.code(404).send(notFound);
    return reply.send({});
  });

  app.delete('/api/admin/chat/messages/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const id = (request.params as { id: string }).id;
    if (!UUID_PATTERN.test(id)) return reply.code(404).send(notFound);
    const removed = await app.supabase.from('chat_messages').update({ deleted_at: new Date().toISOString() })
      .eq('id', id).is('deleted_at', null).select('id, image_url');
    if (removed.error) return reply.code(500).send(failed);
    const rows = (removed.data ?? []) as Array<{ image_url: string | null }>;
    if (rows.length === 0) return reply.code(404).send(notFound);
    await removePicture(request, rows[0].image_url);
    return reply.send({});
  });

  app.post('/api/admin/chat/ban', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const input = (request.body ?? {}) as { user_id?: unknown; banned?: unknown };
    if (typeof input.user_id !== 'string' || !UUID_PATTERN.test(input.user_id) || typeof input.banned !== 'boolean') {
      return reply.code(400).send(invalid);
    }
    const { data, error } = await app.supabase.from('profiles').update({ chat_banned: input.banned }).eq('id', input.user_id).select('id');
    if (error) return reply.code(500).send(failed);
    if (((data as unknown[] | null) ?? []).length === 0) return reply.code(404).send(notFound);
    return reply.send({});
  });
};
