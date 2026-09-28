import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { vietnamDayStart } from '../tutor/limits.js';
import { DAILY_LIMIT_MAX, DEFAULT_MODELS, TRANSLATE_DAILY_CHARS_MAX, TRANSLATE_DAILY_CHARS_MIN, resolveTranslateSettings, resolveTutorSettings, type AiSettingsRow } from '../tutor/settings.js';

// Admin settings of the AI tutor (/admin/ai): provider, model, daily limit, on/off, a connection
// test and usage counts. API keys are never read from or written to the page: only whether each
// one is set (invariant 5).

const COLUMNS = 'provider, model, daily_limit, enabled, translate_enabled, translate_daily_chars, updated_at';
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
/** A Vietnam day as YYYY-MM-DD, the key of translation_usage. */
const vietnamDate = (d: Date) => new Date(vietnamDayStart(d).getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
const MODEL = /^[A-Za-z0-9._:/-]{1,100}$/;
const TEST_TIMEOUT_MS = 20_000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ lưu trữ chưa sẵn sàng.', 'Storage is not available.');

/** The `ai_settings` row for the settings store; throws on a database error. */
export async function loadAiSettings(supabase: SupabaseClient | null | undefined): Promise<AiSettingsRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('ai_settings').select(COLUMNS).eq('id', 1).maybeSingle();
  if (error) throw error;
  return (data as AiSettingsRow | null) ?? null;
}

type Patch = { provider: 'gemini' | 'openai' | null; model: string | null; daily_limit: number | null; enabled: boolean; translate_enabled: boolean; translate_daily_chars: number | null };

function parsePatch(body: unknown): Patch | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const provider = b.provider === null || b.provider === undefined ? null : b.provider;
  if (provider !== null && provider !== 'gemini' && provider !== 'openai') return null;
  const model = typeof b.model === 'string' && b.model.trim() ? b.model.trim() : null;
  if (b.model !== null && b.model !== undefined && typeof b.model !== 'string') return null;
  if (model !== null && !MODEL.test(model)) return null;
  const limit = b.daily_limit === null || b.daily_limit === undefined ? null : b.daily_limit;
  if (limit !== null && !(Number.isInteger(limit) && (limit as number) >= 1 && (limit as number) <= DAILY_LIMIT_MAX)) return null;
  if (typeof b.enabled !== 'boolean') return null;
  // Translation fields may be left out (older pages): on, and the environment's limit.
  if (b.translate_enabled !== undefined && typeof b.translate_enabled !== 'boolean') return null;
  const chars = b.translate_daily_chars === null || b.translate_daily_chars === undefined ? null : b.translate_daily_chars;
  if (chars !== null && !(Number.isInteger(chars) && (chars as number) >= TRANSLATE_DAILY_CHARS_MIN && (chars as number) <= TRANSLATE_DAILY_CHARS_MAX)) return null;
  return {
    provider,
    model,
    daily_limit: limit as number | null,
    enabled: b.enabled,
    translate_enabled: (b.translate_enabled as boolean | undefined) ?? true,
    translate_daily_chars: chars as number | null,
  };
}

export const aiSettingsRoutes: FastifyPluginAsync = async (app) => {
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as FastifyRequest & { user?: { app_metadata?: { app_role?: string } } }).user?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send(msg('Chỉ admin mới chỉnh cài đặt AI.', 'Only admins change the AI settings.'));
    }
  };

  /** Saved row, effective settings, which keys are set, and question counts. */
  const snapshot = async (supabase: SupabaseClient) => {
    const saved = await loadAiSettings(supabase);
    const now = new Date();
    const since = (from: Date) =>
      supabase.from('tutor_messages').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', from.toISOString());
    const weekStart = new Date(now.getTime() - WEEK_MS);
    const [today, week, students, translated] = await Promise.all([
      since(vietnamDayStart(now)),
      since(weekStart),
      supabase.from('tutor_messages').select('user_id').eq('role', 'user').gte('created_at', weekStart.toISOString()).limit(10_000),
      supabase.from('translation_usage').select('day, chars').gte('day', vietnamDate(weekStart)).limit(10_000),
    ]);
    const days = (translated.data ?? []) as Array<{ day: string; chars: number }>;
    const todayKey = vietnamDate(now);
    return {
      saved,
      effective: resolveTutorSettings(saved, process.env),
      keys: { gemini: Boolean(process.env.GEMINI_API_KEY), openai: Boolean(process.env.OPENAI_API_KEY) },
      defaults: DEFAULT_MODELS,
      usage: {
        today: today.count ?? 0,
        week: week.count ?? 0,
        students_week: new Set(((students.data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id)).size,
      },
      translate: {
        effective: resolveTranslateSettings(saved, process.env),
        usage: {
          today: days.filter((d) => d.day === todayKey).reduce((n, d) => n + d.chars, 0),
          week: days.reduce((n, d) => n + d.chars, 0),
        },
      },
    };
  };

  app.get('/api/admin/ai-settings', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    try {
      return reply.send(await snapshot(app.supabase));
    } catch (err) {
      request.log.error({ err }, 'Failed to read AI settings');
      return reply.code(500).send(msg('Không đọc được cài đặt AI.', 'Could not read the AI settings.'));
    }
  });

  app.patch('/api/admin/ai-settings', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const patch = parsePatch(request.body);
    if (!patch) {
      return reply
        .code(400)
        .send(msg(`Cài đặt không hợp lệ: nhà cung cấp Gemini/OpenAI, tên model chỉ gồm chữ, số và . _ : / -, giới hạn 1–${DAILY_LIMIT_MAX} câu, dịch ${TRANSLATE_DAILY_CHARS_MIN}–${TRANSLATE_DAILY_CHARS_MAX} ký tự.`, `Invalid settings: provider Gemini/OpenAI, model name of letters, digits and . _ : / -, limit 1–${DAILY_LIMIT_MAX} questions, translation ${TRANSLATE_DAILY_CHARS_MIN}–${TRANSLATE_DAILY_CHARS_MAX} characters.`));
    }
    const userId = (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
    const { error } = await app.supabase
      .from('ai_settings')
      .upsert({ id: 1, ...patch, updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: 'id' })
      .select(COLUMNS)
      .single();
    if (error) {
      request.log.error({ err: error }, 'Failed to save AI settings');
      return reply.code(500).send(msg('Không lưu được cài đặt AI.', 'Could not save the AI settings.'));
    }
    app.tutorSettings?.invalidate();
    try {
      return reply.send(await snapshot(app.supabase));
    } catch (err) {
      request.log.error({ err }, 'Failed to read AI settings');
      return reply.code(500).send(msg('Đã lưu nhưng không đọc lại được cài đặt.', 'Saved, but could not read the settings back.'));
    }
  });

  // One short call with the settings in force; the provider's own error is shown to the admin.
  app.post('/api/admin/ai-settings/test', { preHandler: [requireAdmin] }, async (_request, reply) => {
    const settings = app.tutorSettings ? await app.tutorSettings.get() : resolveTutorSettings(null, process.env);
    const started = Date.now();
    const choice = { provider: settings.provider, model: settings.model };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      let text = '';
      const run = (async () => {
        for await (const chunk of app.aiProvider.chat([{ role: 'user', content: 'Reply with the single word OK.' }], 'You are a connection check. Reply with one word.', choice)) {
          text += chunk;
          if (text.length > 200) break;
        }
      })();
      await Promise.race([run, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`No answer within ${TEST_TIMEOUT_MS / 1000} s`)), TEST_TIMEOUT_MS); })]);
      return reply.send({ ok: true, reply: text.trim().slice(0, 200), ms: Date.now() - started, ...choice });
    } catch (err) {
      return reply.send({ ok: false, error: String((err as Error)?.message ?? err).slice(0, 300), ms: Date.now() - started, ...choice });
    } finally {
      clearTimeout(timer);
    }
  });
};
