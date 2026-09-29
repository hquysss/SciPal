import { createHash } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { BillingRepositoryError, createBillingRepository } from '../billing/repository.js';
import { periodOf, periodWords, type QuotaPeriod } from '../billing/quotaPeriod.js';
import { authorAiSystemPrompt, authorAiUserMessage, parseDraft, type TheoryDraftBlock } from '../authoring/authorAiPrompt.js';
import { BlockSchema } from '../schemas/blocks.js';
import { resolveTutorSettings } from '../tutor/settings.js';

// AI lesson drafts for teachers (billing Task 5b, spec §5): one request of author_ai_requests
// (Free 0, Pro 100 a month; admins not metered) is held, counted only once a valid draft is
// stored, and given back otherwise. The draft is shown to the teacher to add by hand.
// app.aiProvider and app.tutorSettings are declared in routes/tutor.ts.

type User = { id?: string; app_metadata?: { app_role?: string } };
const msg = (error: string, error_en: string) => ({ error, error_en });

const Body = z.object({
  operation_id: z.string().uuid(),
  topic: z.string().trim().min(1).max(200),
  grade: z.number().int().min(1).max(12),
  language: z.enum(['vi', 'en']),
  request: z.string().max(8000).default(''),
}).strict();

const FAILED = msg('AI chưa soạn được bản nháp lúc này. Lượt này không bị tính — thử lại sau nhé.', 'The AI could not write a draft right now. This request was not counted — try again later.');

export const authorAiRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/authoring/ai-draft', async (request, reply) => {
    const user = (request as FastifyRequest & { user?: User }).user;
    const role = user?.app_metadata?.app_role;
    if (role !== 'teacher' && role !== 'admin') {
      return reply.code(403).send({ code: 'FORBIDDEN', ...msg('Chỉ giáo viên mới dùng được AI soạn bài.', 'Only teachers can use AI lesson drafts.') });
    }
    const supabase = app.supabase;
    const uid = user!.id!;
    if (!supabase) return reply.code(503).send(msg('Dịch vụ chưa sẵn sàng.', 'The service is not available.'));
    const parsed = Body.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ code: 'INVALID_REQUEST', ...msg('Yêu cầu chưa hợp lệ: cần chủ đề (≤ 200 ký tự), lớp 1–12 và yêu cầu ≤ 8000 ký tự.', 'Invalid request: a topic (≤ 200 characters), grade 1–12 and a request of ≤ 8000 characters.') });
    }
    const input = parsed.data;
    const hash = createHash('sha256').update(JSON.stringify([uid, input.topic, input.grade, input.language, input.request])).digest('hex');

    // A retried request answers the stored draft: no new model call, no new charge.
    const { data: existing, error: readError } = await supabase.from('author_ai_drafts').select('operation_id, user_id, request_hash, blocks').eq('operation_id', input.operation_id).maybeSingle();
    if (readError) {
      request.log.error({ err: readError }, 'Failed to read an AI draft');
      return reply.code(503).send(msg('Chưa kiểm tra được bản nháp. Thử lại sau nhé.', 'Could not check the draft. Try again later.'));
    }
    const stored = existing as { user_id: string; blocks: TheoryDraftBlock[] } | null;
    if (stored) {
      if (stored.user_id !== uid) return reply.code(409).send({ code: 'IDEMPOTENCY_CONFLICT', ...msg('Mã yêu cầu đã được dùng.', 'This request id is already used.') });
      return { blocks: stored.blocks, remaining: null, period: null, replayed: true };
    }

    const billing = createBillingRepository((name, args) => supabase.rpc(name, args));
    const metered = role === 'teacher';
    let remaining: number | null = null;
    let period: QuotaPeriod | null = null;
    if (metered) {
      try {
        const hold = await billing.reserveQuota(uid, 'author_ai_requests', input.operation_id, 1, hash);
        remaining = hold.remaining;
        period = periodOf(hold.kind);
      } catch (err) {
        if (err instanceof BillingRepositoryError && err.code === 'QUOTA_EXCEEDED') {
          const quota = await billing.getEffectiveQuotas(uid, new Date()).then((qs) => qs.find((q) => q.metric === 'author_ai_requests')).catch(() => undefined);
          const limit = quota?.limit ?? 0;
          const refusedPeriod = periodOf(quota?.kind);
          const words = periodWords(refusedPeriod);
          return reply.code(429).send({
            code: 'QUOTA_EXCEEDED',
            ...(limit === 0
              ? msg('Gói hiện tại chưa có lượt AI soạn bài. Nâng cấp lên Teacher Pro hoặc nhờ admin cấp thêm.', 'Your plan has no AI lesson drafts. Upgrade to Teacher Pro or ask an admin.')
              : msg(`Thầy/cô đã dùng hết ${limit} lượt AI soạn bài ${words.vi}.`, `You have used your ${limit} AI lesson drafts ${words.en}.`)),
            remaining: 0,
            period: refusedPeriod,
            limit,
            resetsAt: quota?.resetsAt ?? null,
          });
        }
        if (err instanceof BillingRepositoryError && err.code === 'IDEMPOTENCY_CONFLICT') {
          return reply.code(409).send({ code: 'IDEMPOTENCY_CONFLICT', ...msg('Mã yêu cầu đã được dùng cho nội dung khác.', 'This request id was used for another request.') });
        }
        request.log.error({ err }, 'Failed to hold an AI draft request');
        return reply.code(503).send({ code: 'BILLING_UNAVAILABLE', ...msg('Chưa kiểm tra được lượt AI. Thử lại sau nhé.', 'Could not check your AI requests. Try again later.') });
      }
    }
    const release = () => (metered ? billing.settleQuota(input.operation_id, 'release').catch((err) => request.log.error({ err }, 'Failed to give back an AI draft request')) : Promise.resolve());

    const settings = app.tutorSettings ? await app.tutorSettings.get() : resolveTutorSettings(null, process.env);
    let blocks: TheoryDraftBlock[] | null = null;
    for (let attempt = 0; attempt < 2 && !blocks; attempt++) {
      try {
        let answer = '';
        for await (const chunk of app.aiProvider.chat([{ role: 'user', content: authorAiUserMessage(input) }], authorAiSystemPrompt(input.grade), { provider: settings.provider, model: settings.model })) answer += chunk;
        blocks = parseDraft(answer);
        // Belt and braces: every block must also pass the lesson block schema.
        if (blocks && !blocks.every((b) => BlockSchema.safeParse(b).success)) blocks = null;
        if (!blocks) request.log.warn({ attempt }, 'AI draft reply was not usable');
      } catch (err) {
        request.log.error({ err, attempt }, 'AI draft provider failed');
      }
    }
    if (!blocks) {
      await release();
      return reply.code(502).send({ code: 'AI_FAILED', ...FAILED });
    }

    const { error: saveError } = await supabase.from('author_ai_drafts').insert({ operation_id: input.operation_id, user_id: uid, request_hash: hash, blocks });
    if (saveError) {
      await release();
      request.log.error({ err: saveError }, 'Failed to store an AI draft');
      return reply.code(500).send(msg('Chưa lưu được bản nháp. Lượt này không bị tính.', 'Could not store the draft. This request was not counted.'));
    }
    if (metered) await billing.settleQuota(input.operation_id, 'commit').catch((err) => request.log.error({ err }, 'Failed to count an AI draft request'));
    return { blocks, remaining, period, replayed: false };
  });
};
