import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { AIProvider } from '../providers/ai.js';
import { PAGE_SIZE } from '../tutor/limits.js';

declare module 'fastify' {
  interface FastifyInstance {
    aiProvider: AIProvider;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ lưu trữ chưa sẵn sàng.', 'Storage is not available.');
const signIn = msg('Hãy đăng nhập để hỏi gia sư.', 'Sign in to ask the tutor.');
export const notFound = msg('Không tìm thấy hội thoại.', 'Conversation not found.');
const CONVERSATION = 'id, title, lesson_id, updated_at';

export const userId = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string } }).user?.id;

export const tutorRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    if (!userId(request)) return reply.code(401).send(signIn);
    if (!app.supabase) return reply.code(503).send(unavailable);
  });

  app.get('/api/tutor/conversations', async (request, reply) => {
    const page = Math.max(1, Number((request.query as { page?: string }).page) || 1);
    const { data, error } = await app.supabase!
      .from('tutor_conversations')
      .select(CONVERSATION)
      .eq('user_id', userId(request)!)
      .order('updated_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) {
      request.log.error({ err: error }, 'Failed to list tutor conversations');
      return reply.code(500).send(msg('Không tải được hội thoại.', 'Could not load conversations.'));
    }
    return reply.send({ conversations: data ?? [] });
  });

  app.get('/api/tutor/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) return reply.code(404).send(notFound);
    const { data: conversation, error } = await app.supabase!
      .from('tutor_conversations').select(CONVERSATION).eq('id', id).eq('user_id', userId(request)!).maybeSingle();
    if (error) {
      request.log.error({ err: error }, 'Failed to read tutor conversation');
      return reply.code(500).send(msg('Không tải được hội thoại.', 'Could not load the conversation.'));
    }
    if (!conversation) return reply.code(404).send(notFound);
    const { data: messages, error: msgError } = await app.supabase!
      .from('tutor_messages').select('id, role, content, created_at').eq('conversation_id', id).order('created_at', { ascending: true });
    if (msgError) {
      request.log.error({ err: msgError }, 'Failed to read tutor messages');
      return reply.code(500).send(msg('Không tải được hội thoại.', 'Could not load the conversation.'));
    }
    return reply.send({ conversation, messages: messages ?? [] });
  });

  app.delete('/api/tutor/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) return reply.code(404).send(notFound);
    const { data, error } = await app.supabase!
      .from('tutor_conversations').delete().eq('id', id).eq('user_id', userId(request)!).select('id');
    if (error) {
      request.log.error({ err: error }, 'Failed to delete tutor conversation');
      return reply.code(500).send(msg('Không xóa được hội thoại.', 'Could not delete the conversation.'));
    }
    if (!data || data.length === 0) return reply.code(404).send(notFound);
    return reply.code(204).send();
  });
};
