import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { AIProvider } from '../providers/ai.js';
import { CONTEXT_MESSAGES, MESSAGE_MAX, PAGE_SIZE, TITLE_LENGTH, vietnamDayStart } from '../tutor/limits.js';
import { resolveTutorSettings, type SettingsStore } from '../tutor/settings.js';
import { buildSystemPrompt, lessonContext, type EducationLevel } from '../tutor/systemPrompt.js';

declare module 'fastify' {
  interface FastifyInstance {
    aiProvider: AIProvider;
    /** The admin's AI settings (routes/aiSettings.ts); without it the environment applies. */
    tutorSettings?: SettingsStore;
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

  app.post('/api/tutor/chat', async (request, reply) => {
    const supabase = app.supabase!;
    const uid = userId(request)!;
    const body = (request.body ?? {}) as { conversation_id?: unknown; lesson_id?: unknown; message?: unknown; language?: unknown; retry?: unknown };
    const settings = app.tutorSettings ? await app.tutorSettings.get() : resolveTutorSettings(null, process.env);
    if (!settings.enabled) {
      return reply.code(503).send(msg('Gia sư đang tạm nghỉ. Em quay lại sau nhé.', 'The tutor is taking a break. Please come back later.'));
    }
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const language = body.language === 'en' ? 'en' : 'vi';
    if (!message || message.length > MESSAGE_MAX) {
      return reply.code(400).send(msg(`Câu hỏi cần từ 1 đến ${MESSAGE_MAX} ký tự.`, `A question needs 1 to ${MESSAGE_MAX} characters.`));
    }
    const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id : undefined;
    if (conversationId !== undefined && !UUID.test(conversationId)) return reply.code(404).send(notFound);
    const askedLesson = typeof body.lesson_id === 'string' && UUID.test(body.lesson_id) ? body.lesson_id : null;

    let lessonId = askedLesson;
    let lessonFromConversation = false;
    let resend = false;
    if (conversationId) {
      const { data: conv } = await supabase.from('tutor_conversations').select('id, lesson_id').eq('id', conversationId).eq('user_id', uid).maybeSingle();
      if (!conv) return reply.code(404).send(notFound);
      lessonId = (conv as { lesson_id: string | null }).lesson_id;
      lessonFromConversation = true;
      // "Thử lại" after a failed answer: the question is already stored and counted.
      if (body.retry === true) {
        const { data: last } = await supabase
          .from('tutor_messages').select('role, content').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const row = last as { role: string; content: string } | null;
        resend = row?.role === 'user' && row.content === message;
      }
    }

    // Two questions sent at the same moment at limit − 1 can both pass: an overshoot of one is accepted.
    const { count, error: countError } = await supabase
      .from('tutor_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('role', 'user')
      .gte('created_at', vietnamDayStart(new Date()).toISOString());
    if (countError) {
      request.log.error({ err: countError }, 'Failed to count tutor questions');
      return reply.code(500).send(msg('Không kiểm tra được lượt hỏi.', 'Could not check your questions today.'));
    }
    const limit = settings.dailyLimit;
    const used = count ?? 0;
    if (!resend && used >= limit) {
      return reply.code(429).send({ ...msg('Em đã hết lượt hỏi hôm nay. Lượt mới có lúc 0 giờ.', 'You have used today’s questions. New ones arrive at midnight (Vietnam time).'), remaining: 0 });
    }
    const remaining = Math.max(0, limit - used - (resend ? 0 : 1));

    let lessonText: string | undefined;
    if (lessonId) {
      const { data: lesson } = await supabase
        .from('lessons').select('title_vi, title_en, blocks, status, subjects(name_vi, name_en)').eq('id', lessonId).maybeSingle();
      const row = lesson as { title_vi: string; title_en: string; blocks: unknown[]; status: string; subjects: { name_vi: string; name_en: string } | null } | null;
      if (!row || row.status !== 'published') {
        // A new question about a lesson needs it published; an older conversation carries on
        // without the lesson's text once the lesson is unpublished (e.g. back in review).
        if (!lessonFromConversation) return reply.code(404).send(msg('Không tìm thấy bài học.', 'Lesson not found.'));
      } else lessonText = lessonContext(
        { title_vi: row.title_vi, title_en: row.title_en, blocks: Array.isArray(row.blocks) ? row.blocks : [], subject_name: (language === 'vi' ? row.subjects?.name_vi : row.subjects?.name_en) ?? '' },
        language,
      );
    }

    const { data: profile } = await supabase.from('profiles').select('preferred_education_level').eq('id', uid).maybeSingle();
    const level = ((profile as { preferred_education_level?: EducationLevel | null } | null)?.preferred_education_level ?? null);

    let id = conversationId;
    if (!id) {
      const { data: created, error } = await supabase
        .from('tutor_conversations').insert({ user_id: uid, title: message.slice(0, TITLE_LENGTH), lesson_id: askedLesson }).select('id').single();
      if (error || !created) {
        request.log.error({ err: error }, 'Failed to create tutor conversation');
        return reply.code(500).send(msg('Không tạo được hội thoại.', 'Could not start the conversation.'));
      }
      id = (created as { id: string }).id;
    }
    const { error: saveError } = resend
      ? { error: null }
      : await supabase.from('tutor_messages').insert({ conversation_id: id, user_id: uid, role: 'user', content: message });
    if (saveError) {
      request.log.error({ err: saveError }, 'Failed to store tutor question');
      return reply.code(500).send(msg('Không lưu được câu hỏi.', 'Could not save your question.'));
    }
    const { data: recent } = await supabase
      .from('tutor_messages').select('role, content').eq('conversation_id', id).order('created_at', { ascending: false }).limit(CONTEXT_MESSAGES);
    const history = ((recent ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>).reverse();
    // The model's conversation starts with the student: drop assistant turns cut off at the front.
    while (history.length > 1 && history[0].role === 'assistant') history.shift();

    reply.hijack();
    const raw = reply.raw;
    // hijack() skips onSend hooks: carry the headers already set on the reply (CORS) by hand.
    raw.writeHead(200, {
      ...(reply.getHeaders() as Record<string, string | string[]>),
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    const send = (event: string, data: unknown) => {
      if (!raw.writableEnded && !raw.destroyed) raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    // The response's close event is the disconnect signal (the request's fires once its body is read).
    let closed = raw.destroyed;
    raw.on('close', () => { closed = true; });

    send('meta', { conversation_id: id, remaining });
    let answer = '';
    let failed = false;
    try {
      for await (const text of app.aiProvider.chat(history, buildSystemPrompt({ language, level, lesson: lessonText }), { provider: settings.provider, model: settings.model })) {
        if (closed || raw.destroyed) break;
        answer += text;
        send('delta', { text });
      }
    } catch (err) {
      failed = true;
      request.log.error({ err }, 'Tutor provider failed');
      send('error', msg('Gia sư đang bận. Hãy thử lại sau ít phút.', 'The tutor is busy. Try again in a few minutes.'));
    }
    if (answer) {
      await supabase.from('tutor_messages').insert({ conversation_id: id, user_id: uid, role: 'assistant', content: answer.slice(0, 20000) });
    }
    await supabase.from('tutor_conversations').update({ updated_at: new Date().toISOString() }).eq('id', id);
    if (!failed) send('done', {});
    raw.end();
  });
};
