import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { longestStreak } from '../streaks/habit.js';
import { earnedBadgeIds, type BadgeStats } from '../badges/evaluate.js';

// Community badges. Rules live in badges.condition; a student's own list is re-evaluated whenever they
// open it, and the server is the only place that awards. Honor badges are given by an admin.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REASON_MAX = 300;
const unauthorized = { error: 'Hãy đăng nhập lại.', error_en: 'Sign in again.' };
const unavailable = { error: 'Dịch vụ chưa sẵn sàng.', error_en: 'The service is not available.' };
const failed = { error: 'Chưa xử lý được. Thử lại sau nhé.', error_en: 'That did not work. Try again later.' };
const notFound = { error: 'Không tìm thấy.', error_en: 'Not found.' };
const invalid = { error: 'Yêu cầu không hợp lệ.', error_en: 'That request is not valid.' };

const COLUMNS = 'id, slug, name_vi, name_en, description_vi, description_en, icon, category, tier, is_system, sort_order, condition';
type BadgeRow = {
  id: string; slug: string | null; name_vi: string; name_en: string; description_vi: string; description_en: string;
  icon: string; category: string; tier: string; is_system: boolean; sort_order: number; condition: unknown;
};
type Owned = { badge_id: string; earned_at: string; reason: string | null };

function userId(request: FastifyRequest): string | null {
  return (request as FastifyRequest & { user?: { id?: string } }).user?.id ?? null;
}

export const badgeRoutes: FastifyPluginAsync = async (app) => {
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as FastifyRequest & { user?: { id?: string; app_metadata?: { app_role?: string } } }).user;
    if (!user?.id) return reply.code(401).send(unauthorized);
    if (user.app_metadata?.app_role !== 'admin') return reply.code(403).send({ error: 'Chỉ quản trị viên mới có quyền này.', error_en: 'Admins only.' });
  };

  /** The numbers the rules are checked against; null when any lookup fails, so nothing is awarded on a guess. */
  async function statsFor(id: string): Promise<BadgeStats | null> {
    const supabase = app.supabase!;
    const [studyDays, exams, friends] = await Promise.all([
      supabase.from('study_days').select('day').eq('user_id', id),
      supabase.from('exam_attempts').select('score').eq('user_id', id).eq('status', 'submitted'),
      supabase.from('friendships').select('id', { count: 'exact', head: true }).or(`user_a.eq.${id},user_b.eq.${id}`).eq('status', 'accepted'),
    ]);
    if (studyDays.error || exams.error || friends.error) return null;
    const scores = ((exams.data ?? []) as Array<{ score: number | string | null }>).map((e) => Number(e.score ?? 0));
    return {
      bestStreak: longestStreak((studyDays.data ?? []) as Array<{ day: string }>),
      examCount: scores.length,
      bestExamScore: Math.max(0, ...scores),
      friends: friends.count ?? 0,
    };
  }

  app.get('/api/badges/:user_id', async (request, reply) => {
    const me = userId(request);
    if (!me) return reply.code(401).send(unauthorized);
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const param = (request.params as { user_id: string }).user_id;
    const target = param === 'me' ? me : param;
    if (!UUID_PATTERN.test(target)) return reply.code(404).send(notFound);

    const [profile, badges, owned] = await Promise.all([
      supabase.from('profiles').select('id').eq('id', target).maybeSingle(),
      supabase.from('badges').select(COLUMNS).not('slug', 'is', null).order('sort_order'),
      supabase.from('user_badges').select('badge_id, earned_at, reason').eq('user_id', target),
    ]);
    if (profile.error || badges.error || owned.error) return reply.code(500).send(failed);
    if (!profile.data) return reply.code(404).send(notFound);

    const all = (badges.data ?? []) as BadgeRow[];
    const have = new Map(((owned.data ?? []) as Owned[]).map((o) => [o.badge_id, o]));

    if (target === me) {
      const stats = await statsFor(me);
      const fresh = stats ? earnedBadgeIds(all, stats).filter((id) => !have.has(id)) : [];
      if (fresh.length > 0) {
        const inserted = await supabase.from('user_badges').upsert(fresh.map((badge_id) => ({ user_id: me, badge_id })), { onConflict: 'user_id,badge_id', ignoreDuplicates: true });
        if (inserted.error) request.log.warn({ err: inserted.error }, 'New badges were not saved');
        else for (const id of fresh) have.set(id, { badge_id: id, earned_at: new Date().toISOString(), reason: null });
      }
    }

    const list = all.map((b) => ({
      id: b.id, slug: b.slug, name_vi: b.name_vi, name_en: b.name_en, description_vi: b.description_vi, description_en: b.description_en,
      icon: b.icon, category: b.category, tier: b.tier, is_system: b.is_system,
      unlocked: have.has(b.id), earned_at: have.get(b.id)?.earned_at ?? null, reason: have.get(b.id)?.reason ?? null,
    }));
    // Earned first, then the catalogue order.
    return reply.send({ badges: [...list.filter((b) => b.unlocked), ...list.filter((b) => !b.unlocked)] });
  });

  /** Checks a manual badge and an existing student; sends the refusal itself and returns null. */
  async function manualTarget(request: FastifyRequest, reply: FastifyReply) {
    const refuse = (code: number, payload: object): null => {
      void reply.code(code).send(payload);
      return null;
    };
    const supabase = app.supabase;
    if (!supabase) return refuse(503, unavailable);
    const input = (request.body ?? {}) as { user_id?: unknown; badge_id?: unknown; reason?: unknown };
    if (typeof input.user_id !== 'string' || !UUID_PATTERN.test(input.user_id) || typeof input.badge_id !== 'string' || !UUID_PATTERN.test(input.badge_id)) {
      return refuse(400, invalid);
    }
    const [profile, badge] = await Promise.all([
      supabase.from('profiles').select('id').eq('id', input.user_id).maybeSingle(),
      supabase.from('badges').select('id, is_system').eq('id', input.badge_id).maybeSingle(),
    ]);
    if (profile.error || badge.error) return refuse(500, failed);
    if (!profile.data || !badge.data) return refuse(404, notFound);
    if ((badge.data as { is_system: boolean }).is_system) {
      return refuse(400, { error: 'Danh hiệu này tự động trao, không cấp tay được.', error_en: 'This badge is awarded automatically.' });
    }
    return { supabase, userId: input.user_id, badgeId: input.badge_id, reason: input.reason };
  }

  app.post('/api/admin/badges/award', { preHandler: [requireAdmin] }, async (request, reply) => {
    const target = await manualTarget(request, reply);
    if (!target) return reply;
    const reason = typeof target.reason === 'string' ? target.reason.trim() : '';
    if (reason.length < 1 || reason.length > REASON_MAX) return reply.code(400).send(invalid);
    const { error } = await target.supabase.from('user_badges').upsert(
      { user_id: target.userId, badge_id: target.badgeId, awarded_by: userId(request), reason },
      { onConflict: 'user_id,badge_id' },
    );
    if (error) return reply.code(500).send(failed);
    return reply.code(201).send({});
  });

  app.post('/api/admin/badges/revoke', { preHandler: [requireAdmin] }, async (request, reply) => {
    const target = await manualTarget(request, reply);
    if (!target) return reply;
    const { error } = await target.supabase.from('user_badges').delete().eq('user_id', target.userId).eq('badge_id', target.badgeId);
    if (error) return reply.code(500).send(failed);
    return reply.send({});
  });
};
