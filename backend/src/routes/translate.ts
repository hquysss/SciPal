import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { vietnamDayStart } from '../tutor/limits.js';
import { resolveTutorSettings } from '../tutor/settings.js';
import { isCopyThrough, parseTranslations, translationSystemPrompt } from '../translate/translatePrompt.js';

// app.aiProvider and app.tutorSettings are declared in routes/tutor.ts.
const MAX_TEXTS = 40;
const MAX_TEXT_CHARS = 8000;
const MAX_REQUEST_CHARS = 20_000;
const DEFAULT_DAILY_CHARS = 200_000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

type Lang = 'vi' | 'en';
type User = { id?: string; app_metadata?: { app_role?: string } };

const msg = (error: string, error_en: string) => ({ error, error_en });
const BAD_BODY = msg('Yêu cầu dịch không hợp lệ.', 'The translation request is not valid.');
const TOO_BIG = msg('Nội dung cần dịch quá dài cho một lần.', 'Too much text to translate at once.');
const FAILED = msg('Chưa dịch được lúc này. Thử lại sau.', 'Could not translate right now. Try again later.');

function dailyLimit(): number {
  const n = Number(process.env.AUTHOR_TRANSLATE_DAILY_CHARS);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_CHARS;
}

/** Today's date in Vietnam as YYYY-MM-DD. */
const vietnamDay = (now: Date) => new Date(vietnamDayStart(now).getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);

const isLang = (v: unknown): v is Lang => v === 'vi' || v === 'en';

/** Automatic translation of lesson text for teachers and admins, with a daily character budget each. */
export const translateRoutes: FastifyPluginAsync = async (app) => {
  const requireAuthor = async (request: FastifyRequest, reply: FastifyReply) => {
    const role = (request as FastifyRequest & { user?: User }).user?.app_metadata?.app_role;
    if (role !== 'teacher' && role !== 'admin') {
      return reply.code(403).send(msg('Chỉ giáo viên và admin mới dùng được tự động dịch.', 'Only teachers and admins can use automatic translation.'));
    }
  };

  app.post('/api/authoring/translate', { preHandler: [requireAuthor] }, async (request, reply) => {
    const supabase = app.supabase;
    const uid = (request as FastifyRequest & { user?: User }).user?.id;
    if (!supabase || !uid) return reply.code(503).send(FAILED);

    const body = (request.body ?? {}) as { from?: unknown; to?: unknown; texts?: unknown };
    const { from, to, texts } = body;
    if (!isLang(from) || !isLang(to) || from === to) return reply.code(400).send(BAD_BODY);
    if (!Array.isArray(texts) || texts.length === 0 || !texts.every((t) => typeof t === 'string')) return reply.code(400).send(BAD_BODY);
    if (texts.length > MAX_TEXTS || texts.some((t) => t.length > MAX_TEXT_CHARS)) return reply.code(400).send(TOO_BIG);
    if (texts.reduce((n, t) => n + t.length, 0) > MAX_REQUEST_CHARS) return reply.code(400).send(TOO_BIG);

    const result = [...(texts as string[])];
    const send = result.map((text, i) => ({ text, i })).filter(({ text }) => !isCopyThrough(text));
    if (send.length === 0) return { texts: result };
    const chars = send.reduce((n, s) => n + s.text.length, 0);

    const day = vietnamDay(new Date());
    const { data: usage, error: usageError } = await supabase
      .from('translation_usage').select('chars').eq('user_id', uid).eq('day', day).maybeSingle();
    if (usageError) {
      request.log.error({ err: usageError }, 'Failed to read translation usage');
      return reply.code(503).send(FAILED);
    }
    const used = (usage as { chars?: number } | null)?.chars ?? 0;
    if (used + chars > dailyLimit()) {
      return reply.code(429).send(msg('Hôm nay thầy/cô đã dùng hết lượt dịch tự động. Mai dùng tiếp được.', 'You have used today’s automatic translation. It resets tomorrow.'));
    }

    const settings = app.tutorSettings ? await app.tutorSettings.get() : resolveTutorSettings(null, process.env);
    const system = translationSystemPrompt(from, to);
    const input = JSON.stringify(send.map((s) => s.text));
    let translated: string[] | null = null;
    for (let attempt = 0; attempt < 2 && !translated; attempt++) {
      try {
        let answer = '';
        for await (const chunk of app.aiProvider.chat([{ role: 'user', content: input }], system, { provider: settings.provider, model: settings.model })) answer += chunk;
        translated = parseTranslations(answer, send.length);
        if (!translated) request.log.warn({ attempt }, 'Translation reply did not match the input');
      } catch (err) {
        request.log.error({ err, attempt }, 'Translation provider failed');
      }
    }
    if (!translated) return reply.code(502).send(FAILED);

    const { error: countError } = await supabase.rpc('add_translation_usage', { p_user: uid, p_day: day, p_chars: chars });
    if (countError) request.log.error({ err: countError }, 'Failed to record translation usage');

    send.forEach((s, k) => { result[s.i] = translated![k]; });
    return { texts: result };
  });
};
