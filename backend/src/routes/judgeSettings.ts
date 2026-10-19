import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_JUDGE_LIMITS, JUDGE_COLUMNS, JUDGE_LIMIT_MAX, JUDGE_LIMIT_MIN, resolveJudgeLimits, type JudgeSettingsRow } from '../judge/limits.js';
import { vietnamDayStart } from '../tutor/limits.js';

// Admin settings of the code judge (/admin/judge): how many runs the whole site may start a day. The judge is a
// paid service; this cap keeps its bill in check. What one person may run is a quota of their plan (/admin/plans).

const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ lưu trữ chưa sẵn sàng.', 'Storage is not available.');
const FIELDS = ['global_submits_per_day', 'global_runs_per_day'] as const;

/** A field the page sent: an integer in range, or null/missing to go back to the default. */
function parsePatch(body: unknown): Record<(typeof FIELDS)[number], number | null> | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const out = {} as Record<(typeof FIELDS)[number], number | null>;
  for (const field of FIELDS) {
    const value = b[field] ?? null;
    if (value !== null && !(Number.isInteger(value) && (value as number) >= JUDGE_LIMIT_MIN && (value as number) <= JUDGE_LIMIT_MAX)) return null;
    out[field] = value as number | null;
  }
  return out;
}

export const judgeSettingsRoutes: FastifyPluginAsync = async (app) => {
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as FastifyRequest & { user?: { app_metadata?: { app_role?: string } } }).user?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send(msg('Chỉ admin mới chỉnh cài đặt chấm code.', 'Only admins change the judge settings.'));
    }
  };

  /** The saved row, the limits in force, the defaults, and how many runs there were today. */
  const snapshot = async (supabase: SupabaseClient) => {
    const { data, error } = await supabase.from('judge_settings').select(JUDGE_COLUMNS).eq('id', 1).maybeSingle();
    if (error) throw error;
    const saved = (data as JudgeSettingsRow | null) ?? null;
    const dayStart = vietnamDayStart(new Date()).toISOString();
    const today = (kind: 'submit' | 'run') => supabase.from('code_runs').select('id', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', dayStart);
    const [submits, runs] = await Promise.all([today('submit'), today('run')]);
    return { saved, effective: resolveJudgeLimits(saved), defaults: DEFAULT_JUDGE_LIMITS, usage: { submits: submits.count ?? 0, runs: runs.count ?? 0 } };
  };

  app.get('/api/admin/judge-settings', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    try {
      return reply.send(await snapshot(app.supabase));
    } catch (err) {
      request.log.error({ err }, 'Failed to read the judge settings');
      return reply.code(500).send(msg('Không đọc được cài đặt chấm code.', 'Could not read the judge settings.'));
    }
  });

  app.patch('/api/admin/judge-settings', { preHandler: [requireAdmin] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const patch = parsePatch(request.body);
    if (!patch) {
      return reply.code(400).send(msg(`Giới hạn phải là số nguyên từ ${JUDGE_LIMIT_MIN} đến ${JUDGE_LIMIT_MAX}.`, `Each limit must be a whole number from ${JUDGE_LIMIT_MIN} to ${JUDGE_LIMIT_MAX}.`));
    }
    const userId = (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
    const { error } = await app.supabase.from('judge_settings').upsert({ id: 1, ...patch, updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: 'id' });
    if (error) {
      request.log.error({ err: error }, 'Failed to save the judge settings');
      return reply.code(500).send(msg('Không lưu được cài đặt chấm code.', 'Could not save the judge settings.'));
    }
    try {
      return reply.send(await snapshot(app.supabase));
    } catch (err) {
      request.log.error({ err }, 'Failed to read the judge settings');
      return reply.code(500).send(msg('Đã lưu nhưng không đọc lại được cài đặt.', 'Saved, but could not read the settings back.'));
    }
  });
};
