import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

// Moderation for community chat: open reports, soft-deleting a message, banning an account from chat.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable = { error: 'Dịch vụ trò chuyện chưa sẵn sàng.', error_en: 'Chat is not available yet.' };
const failed = { error: 'Chưa xử lý được. Thử lại sau nhé.', error_en: 'That did not work. Try again later.' };
const notFound = { error: 'Không tìm thấy.', error_en: 'Not found.' };
const invalid = { error: 'Yêu cầu không hợp lệ.', error_en: 'That request is not valid.' };

type MessageEmbed = { body?: string; sender_id?: string; sender_name?: string };
type ReportRow = { id: string; message_id: string; reason: string; created_at: string; chat_messages: MessageEmbed | MessageEmbed[] | null };

export const adminChatRoutes: FastifyPluginAsync = async (app) => {
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as FastifyRequest & { user?: { id?: string; app_metadata?: { app_role?: string } } }).user;
    if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Sign in again.' });
    if (user.app_metadata?.app_role !== 'admin') return reply.code(403).send({ error: 'Chỉ quản trị viên mới có quyền này.', error_en: 'Admins only.' });
  };

  app.get('/api/admin/chat/reports', { preHandler: [requireAdmin] }, async (_request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { data, error } = await app.supabase.from('chat_reports')
      .select('id, message_id, reason, created_at, chat_messages(body, sender_id, sender_name)')
      .is('handled_at', null).order('created_at', { ascending: false }).limit(200);
    if (error) return reply.code(500).send(failed);
    const reports = ((data ?? []) as ReportRow[]).map((r) => {
      const message = Array.isArray(r.chat_messages) ? r.chat_messages[0] : r.chat_messages;
      return {
        id: r.id, message_id: r.message_id, reason: r.reason, created_at: r.created_at,
        body: message?.body ?? '', sender_id: message?.sender_id ?? '', sender_name: message?.sender_name ?? '',
      };
    });
    return reply.send({ reports });
  });

  app.delete('/api/admin/chat/messages/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const id = (request.params as { id: string }).id;
    if (!UUID_PATTERN.test(id)) return reply.code(404).send(notFound);
    const now = new Date().toISOString();
    const removed = await app.supabase.from('chat_messages').update({ deleted_at: now }).eq('id', id).is('deleted_at', null).select('id');
    if (removed.error) return reply.code(500).send(failed);
    if (((removed.data as unknown[] | null) ?? []).length === 0) return reply.code(404).send(notFound);
    const closed = await app.supabase.from('chat_reports').update({ handled_at: now }).eq('message_id', id).is('handled_at', null);
    if (closed.error) return reply.code(500).send(failed);
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
