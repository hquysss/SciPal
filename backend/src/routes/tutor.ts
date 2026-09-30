import { createHash, randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { BillingRepositoryError, createBillingRepository } from '../billing/repository.js';
import type { AIProvider } from '../providers/ai.js';
import { CONTEXT_MESSAGES, MESSAGE_MAX, PAGE_SIZE, TITLE_LENGTH, vietnamDayStart } from '../tutor/limits.js';
import { resolveTutorSettings, type SettingsStore } from '../tutor/settings.js';
import { buildSystemPrompt, lessonContext, type EducationLevel } from '../tutor/systemPrompt.js';
import { createVoiceToken, VOICE_SESSION_MINUTES } from '../tutor/voiceToken.js';

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
const isAdmin = (request: FastifyRequest) => (request as FastifyRequest & { user?: { app_metadata?: { app_role?: string } } }).user?.app_metadata?.app_role === 'admin';

type Period = 'day' | 'month';
const quotaRefused = (limit: number, period: Period, resetsAt: string | null) => ({
  code: 'QUOTA_EXCEEDED',
  ...(period === 'day'
    ? msg(`Em đã dùng hết ${limit} lượt hôm nay. Lượt mới có lúc 0 giờ.`, `You have used your ${limit} questions today. New ones arrive at midnight (Vietnam time).`)
    : msg(`Em đã dùng hết ${limit} lượt tháng này.`, `You have used your ${limit} questions this month.`)),
  remaining: 0,
  limit,
  period,
  resetsAt,
});
const quotaUnavailable = { code: 'BILLING_UNAVAILABLE', ...msg('Chưa kiểm tra được lượt hỏi. Em thử lại sau ít phút nhé.', 'Could not check your questions. Try again in a few minutes.') };

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

  // A spoken session (Gemini Live). The student picks 3, 5 or 10 minutes; they come off the plan's
  // voice minutes when the session starts (fewer if fewer are left), since the browser talks to
  // Gemini directly and the backend never sees the end. The browser gets a one-use token locked
  // to the tutor's instruction and that length, never the key.
  app.post('/api/tutor/voice', async (request, reply) => {
    const supabase = app.supabase!;
    const uid = userId(request)!;
    const body = (request.body ?? {}) as { lesson_id?: unknown; language?: unknown; minutes?: unknown };
    const language = body.language === 'en' ? 'en' : 'vi';
    const asked = (VOICE_SESSION_MINUTES as readonly unknown[]).includes(body.minutes) ? (body.minutes as number) : 5;
    const settings = app.tutorSettings ? await app.tutorSettings.get() : resolveTutorSettings(null, process.env);
    if (!settings.enabled) {
      return reply.code(503).send(msg('Gia sư đang tạm nghỉ. Em quay lại sau nhé.', 'The tutor is taking a break. Please come back later.'));
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!settings.voiceEnabled) return reply.code(503).send({ code: 'VOICE_OFF', ...msg('Chế độ nói chuyện đang tắt.', 'Voice chat is turned off.') });
    if (!apiKey) return reply.code(503).send({ code: 'VOICE_UNAVAILABLE', ...msg('Chế độ nói chuyện chưa được bật.', 'Voice chat is not set up yet.') });

    let lessonText: string | undefined;
    if (typeof body.lesson_id === 'string' && UUID.test(body.lesson_id)) {
      const { data: lesson } = await supabase
        .from('lessons').select('title_vi, title_en, blocks, status, subjects(name_vi, name_en)').eq('id', body.lesson_id).maybeSingle();
      const row = lesson as { title_vi: string; title_en: string; blocks: unknown[]; status: string; subjects: { name_vi: string; name_en: string } | null } | null;
      if (row?.status === 'published') {
        lessonText = lessonContext(
          { title_vi: row.title_vi, title_en: row.title_en, blocks: Array.isArray(row.blocks) ? row.blocks : [], subject_name: (language === 'vi' ? row.subjects?.name_vi : row.subjects?.name_en) ?? '' },
          language,
        );
      }
    }
    const { data: profile } = await supabase.from('profiles').select('preferred_education_level').eq('id', uid).maybeSingle();
    const level = ((profile as { preferred_education_level?: EducationLevel | null } | null)?.preferred_education_level ?? null);

    const admin = isAdmin(request);
    const billing = createBillingRepository((name, args) => supabase.rpc(name, args));
    let minutes = asked;
    let hold: { operationId: string; remaining: number; period: Period } | null = null;
    if (!admin) {
      const refused = (limit: number, period: Period, resetsAt: string | null) => ({
        code: 'QUOTA_EXCEEDED',
        ...(period === 'day'
          ? msg(`Em đã dùng hết ${limit} phút nói chuyện hôm nay.`, `You have used your ${limit} voice minutes today.`)
          : msg(`Em đã dùng hết ${limit} phút nói chuyện tháng này.`, `You have used your ${limit} voice minutes this month.`)),
        remaining: 0, limit, period, resetsAt,
      });
      try {
        const quota = (await billing.getEffectiveQuotas(uid, new Date())).find((q) => q.metric === 'voice_minutes');
        const period: Period = quota?.kind === 'daily' ? 'day' : 'month';
        const left = quota ? quota.limit - quota.used - quota.reserved : 0;
        if (left < 1) return reply.code(429).send(refused(quota?.limit ?? 0, period, quota?.resetsAt ?? null));
        minutes = Math.min(asked, left);
        const operationId = randomUUID();
        const r = await billing.reserveQuota(uid, 'voice_minutes', operationId, minutes, createHash('sha256').update(`${uid}:voice:${operationId}`).digest('hex'));
        hold = { operationId, remaining: r.remaining, period: r.kind === 'daily' ? 'day' : 'month' };
      } catch (err) {
        if (err instanceof BillingRepositoryError && err.code === 'QUOTA_EXCEEDED') return reply.code(429).send(refused(0, 'month', null));
        request.log.error({ err }, 'Failed to hold voice minutes');
        return reply.code(503).send(quotaUnavailable);
      }
    }
    try {
      const voice = await createVoiceToken({
        apiKey,
        model: settings.voiceModel,
        systemInstruction: buildSystemPrompt({ language, level, lesson: lessonText, spoken: true }),
        language,
        minutes,
      });
      if (hold) await billing.settleQuota(hold.operationId, 'commit').catch((err) => request.log.error({ err }, 'Failed to count a voice session'));
      return reply.send({ ...voice, remaining: hold?.remaining ?? null, period: hold?.period ?? null });
    } catch (err) {
      if (hold) await billing.settleQuota(hold.operationId, 'release').catch(() => {});
      request.log.error({ err }, 'Failed to start a voice session');
      return reply.code(502).send(msg('Chưa mở được phiên nói chuyện. Em thử lại sau nhé.', 'Could not start voice chat. Please try again later.'));
    }
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
    let questionId: string | null = null;
    if (conversationId) {
      const { data: conv } = await supabase.from('tutor_conversations').select('id, lesson_id').eq('id', conversationId).eq('user_id', uid).maybeSingle();
      if (!conv) return reply.code(404).send(notFound);
      lessonId = (conv as { lesson_id: string | null }).lesson_id;
      lessonFromConversation = true;
      // "Thử lại" after a failed answer: the question is already stored and counted.
      if (body.retry === true) {
        const { data: last } = await supabase
          .from('tutor_messages').select('id, role, content').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const row = last as { id?: string; role: string; content: string } | null;
        resend = row?.role === 'user' && row.content === message;
        if (resend) questionId = row?.id ?? null;
      }
    }

    // Admins are not metered (decided 28/09). For everyone else the admin's daily cap below is an
    // operational ceiling; the plan quota (ledger) decides what they may use.
    const admin = isAdmin(request);
    // Two questions sent at the same moment at limit − 1 can both pass the cap: an overshoot of one is accepted.
    const { count, error: countError } = admin ? { count: 0, error: null } : await supabase
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
    if (!admin && !resend && used >= limit) {
      return reply.code(429).send({ ...msg('Em đã hết lượt hỏi hôm nay. Lượt mới có lúc 0 giờ.', 'You have used today’s questions. New ones arrive at midnight (Vietnam time).'), remaining: 0 });
    }
    const capRemaining = Math.max(0, limit - used - (resend ? 0 : 1));

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

    // Hold one request of the plan quota before storing anything or asking the model; it is counted
    // only once the answer is stored, and given back on any failure (spec §5).
    const billing = createBillingRepository((name, args) => supabase.rpc(name, args));
    let hold: { operationId: string; remaining: number; period: Period } | null = null;
    if (!admin) {
      try {
        const operationId = randomUUID();
        const hash = createHash('sha256').update(`${uid}:${conversationId ?? ''}:${message}`).digest('hex');
        const r = await billing.reserveQuota(uid, 'tutor_requests', operationId, 1, hash);
        hold = { operationId, remaining: r.remaining, period: r.kind === 'monthly' ? 'month' : 'day' };
      } catch (err) {
        if (err instanceof BillingRepositoryError && err.code === 'QUOTA_EXCEEDED') {
          const quota = await billing.getEffectiveQuotas(uid, new Date()).then((qs) => qs.find((q) => q.metric === 'tutor_requests')).catch(() => undefined);
          return reply.code(429).send(quotaRefused(quota?.limit ?? 0, quota?.kind === 'monthly' ? 'month' : 'day', quota?.resetsAt ?? null));
        }
        request.log.error({ err }, 'Failed to hold a tutor request');
        return reply.code(503).send(quotaUnavailable);
      }
    }
    let settled = false;
    const settle = async (outcome: 'commit' | 'release') => {
      if (!hold || settled) return;
      settled = true;
      try {
        await billing.settleQuota(hold.operationId, outcome);
      } catch (err) {
        request.log.error({ err, outcome }, 'Failed to settle a tutor request');
      }
    };
    // What the student sees: the tighter of the plan quota and the daily cap.
    const shown = (extra: number) => {
      if (!hold) return { remaining: null, period: null };
      return capRemaining + extra <= hold.remaining + extra
        ? { remaining: capRemaining + extra, period: 'day' as Period }
        : { remaining: hold.remaining + extra, period: hold.period };
    };

    let id = conversationId;
    if (!id) {
      const { data: created, error } = await supabase
        .from('tutor_conversations').insert({ user_id: uid, title: message.slice(0, TITLE_LENGTH), lesson_id: askedLesson }).select('id').single();
      if (error || !created) {
        await settle('release');
        request.log.error({ err: error }, 'Failed to create tutor conversation');
        return reply.code(500).send(msg('Không tạo được hội thoại.', 'Could not start the conversation.'));
      }
      id = (created as { id: string }).id;
    }
    let saveError: unknown = null;
    if (!resend) {
      const saved = await supabase.from('tutor_messages').insert({ conversation_id: id, user_id: uid, role: 'user', content: message }).select('id').single();
      saveError = saved.error;
      questionId = (saved.data as { id?: string } | null)?.id ?? null;
    }
    if (saveError) {
      await settle('release');
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

    send('meta', { conversation_id: id, ...shown(0) });
    let answer = '';
    let failed = false;
    let stopped = false;
    try {
      for await (const text of app.aiProvider.chat(history, buildSystemPrompt({ language, level, lesson: lessonText }), { provider: settings.provider, model: settings.model, effort: settings.reasoningEffort })) {
        if (closed || raw.destroyed) {
          stopped = true;
          break;
        }
        answer += text;
        send('delta', { text });
      }
    } catch (err) {
      failed = true;
      await settle('release');
      request.log.error({ err }, 'Tutor provider failed');
      const overloaded = (err as { status?: number } | null)?.status === 429;
      if (answer) {
        send('error', msg('Câu trả lời bị ngắt giữa chừng. Em thử hỏi lại sau ít phút nhé.', 'The answer was cut off. Try asking again in a few minutes.'));
      } else {
        // No answer at all: the question is taken back, so it does not use up a daily question.
        if (questionId) await supabase.from('tutor_messages').delete().eq('id', questionId);
        const conversationRemoved = !conversationId;
        if (conversationRemoved) await supabase.from('tutor_conversations').delete().eq('id', id).eq('user_id', uid);
        send('error', {
          ...(overloaded
            ? msg('Gia sư đang quá tải. Câu hỏi này không bị tính lượt — em thử lại sau ít phút nhé.', 'The tutor is overloaded. This question was not counted — try again in a few minutes.')
            : msg('Gia sư đang gặp sự cố. Câu hỏi này không bị tính lượt — em thử lại sau nhé.', 'The tutor ran into a problem. This question was not counted — try again later.')),
          ...shown(1),
          conversation_removed: conversationRemoved,
        });
      }
    }
    if (failed && !answer) {
      raw.end();
      return;
    }
    let stored = false;
    if (answer) {
      const { error: answerError } = await supabase.from('tutor_messages').insert({ conversation_id: id, user_id: uid, role: 'assistant', content: answer.slice(0, 20000) });
      stored = !answerError;
    }
    // Counted only for a complete answer that was stored; a cut-off or unsaved one is given back.
    await settle(!failed && !stopped && stored ? 'commit' : 'release');
    await supabase.from('tutor_conversations').update({ updated_at: new Date().toISOString() }).eq('id', id);
    if (!failed) send('done', {});
    raw.end();
  });
};
