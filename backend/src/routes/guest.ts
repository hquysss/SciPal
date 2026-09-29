import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { clientIp, guestSecret, sameSecret, visitorHash } from '../guest/visitor.js';
import { MESSAGE_MAX } from '../tutor/limits.js';
import { resolveTutorSettings } from '../tutor/settings.js';
import { buildSystemPrompt } from '../tutor/systemPrompt.js';

// Guest trials (migration 20260930000000): a visitor may try each page feature for 30 minutes and
// ask the Tutor one question, then must sign in. Both routes are public; the trial route answers
// only the web server (shared key), which names the visitor's address from the request Vercel sent.

const WINDOW_MINUTES = 30;
const DEFAULT_DAILY_CAP = 200;

const msg = (error: string, error_en: string) => ({ error, error_en });
const OFF = { code: 'GUEST_TRIALS_OFF', ...msg('Dùng thử chưa mở. Hãy đăng nhập.', 'Trials are not open. Please sign in.') };
const USED = { code: 'GUEST_TRIAL_USED', ...msg('Em đã dùng lượt hỏi thử. Đăng nhập để hỏi gia sư tiếp nhé.', 'You have used your trial question. Sign in to keep asking the tutor.') };
const BUSY = { code: 'GUEST_TUTOR_BUSY', ...msg('Hôm nay đã hết lượt hỏi thử cho khách. Đăng nhập để hỏi gia sư.', 'Guest questions are used up for today. Sign in to ask the tutor.') };
const UNAVAILABLE = { code: 'GUEST_UNAVAILABLE', ...msg('Chưa kiểm tra được lượt thử. Thử lại sau.', 'Could not check the trial. Try again later.') };

const TrialInput = z.object({
  feature: z.enum(['learn', 'glossary', 'exam', 'pricing']),
  ip: z.string().trim().min(1).max(64),
}).strict();

export const guestRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/guest/trial', async (request, reply) => {
    const secret = guestSecret();
    if (!secret) return reply.code(503).send(OFF);
    const key = request.headers['x-guest-key'];
    if (!sameSecret(Array.isArray(key) ? key[0] : key, secret)) return reply.code(401).send({ code: 'UNAUTHORIZED' });
    const parsed = TrialInput.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'INVALID_GUEST_TRIAL' });
    const { data, error } = await app.supabase!.rpc('guest_trial_open', {
      p_visitor: visitorHash(parsed.data.ip, secret),
      p_feature: parsed.data.feature,
      p_window_minutes: WINDOW_MINUTES,
    });
    const row = data as { allowed?: boolean; expires_at?: string } | null;
    if (error || typeof row?.allowed !== 'boolean' || !row.expires_at) {
      request.log.error({ err: error }, 'Guest trial could not be opened');
      return reply.code(503).send(UNAVAILABLE);
    }
    return { allowed: row.allowed, expiresAt: new Date(row.expires_at).toISOString() };
  });

  app.post('/api/tutor/guest', async (request, reply) => {
    const secret = guestSecret();
    if (!secret) return reply.code(503).send(OFF);
    const body = (request.body ?? {}) as { message?: unknown; language?: unknown };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const language = body.language === 'en' ? 'en' : 'vi';
    if (!message || message.length > MESSAGE_MAX) {
      return reply.code(400).send(msg(`Câu hỏi cần từ 1 đến ${MESSAGE_MAX} ký tự.`, `A question needs 1 to ${MESSAGE_MAX} characters.`));
    }
    const settings = app.tutorSettings ? await app.tutorSettings.get() : resolveTutorSettings(null, process.env);
    if (!settings.enabled) {
      return reply.code(503).send(msg('Gia sư đang tạm nghỉ. Em quay lại sau nhé.', 'The tutor is taking a break. Please come back later.'));
    }

    const visitor = visitorHash(clientIp(request), secret);
    const configured = Number.parseInt(process.env.GUEST_TUTOR_DAILY_CAP ?? '', 10);
    const cap = Number.isInteger(configured) && configured >= 0 ? configured : DEFAULT_DAILY_CAP;
    const claim = await app.supabase!.rpc('guest_tutor_claim', { p_visitor: visitor, p_daily_cap: cap });
    if (claim.error) {
      request.log.error({ err: claim.error }, 'Guest tutor question could not be counted');
      return reply.code(503).send(UNAVAILABLE);
    }
    if (claim.data === 'used') return reply.code(429).send(USED);
    if (claim.data !== 'claimed') return reply.code(429).send(BUSY);

    try {
      let answer = '';
      for await (const text of app.aiProvider.chat([{ role: 'user', content: message }], buildSystemPrompt({ language, level: null }), {
        provider: settings.provider,
        model: settings.model,
      })) {
        answer += text;
      }
      if (!answer.trim()) throw new Error('empty answer');
      return { answer };
    } catch (error) {
      request.log.warn({ err: error }, 'Guest tutor answer failed');
      await app.supabase!.rpc('guest_tutor_release', { p_visitor: visitor });
      return reply.code(502).send(msg('Gia sư chưa trả lời được. Em hỏi lại nhé — lượt thử vẫn còn.', 'The tutor could not answer. Ask again — your trial question is still there.'));
    }
  });
};
