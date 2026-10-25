import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { currentStreak, longestStreak, type StudyDay } from '../streaks/habit.js';
import { addDays, vnDay } from '../streaks/vnDay.js';

export const DAILY_GOALS = [20, 50, 100] as const;
const CALENDAR_DAYS = 35;

const userId = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string } }).user?.id;
const unavailable = { error: 'Dịch vụ chưa sẵn sàng.', error_en: 'The service is not available.' };
const failed = { error: 'Chưa tải được chuỗi ngày học.', error_en: 'Could not load your study streak.' };

/** The learner's streak across subjects, today's XP against the daily goal, freezes and the last 35 days. */
export const habitRoutes: FastifyPluginAsync = async (app) => {
  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!userId(request)) return reply.code(401).send({ error: 'Hãy đăng nhập.', error_en: 'Sign in first.' });
  };

  app.get('/api/me/habit', { preHandler: [requireUser] }, async (request, reply) => {
    if (!app.supabase) return reply.code(503).send(unavailable);
    const id = userId(request)!;
    const today = vnDay(new Date());
    // ponytail: 400 days covers any streak worth showing; the longest is "of the last 400 days".
    const [daysRes, profileRes] = await Promise.all([
      app.supabase.from('study_days').select('day, xp, freeze').eq('user_id', id).gte('day', addDays(today, -400)),
      app.supabase.from('profiles').select('daily_goal_xp, streak_freezes').eq('id', id).maybeSingle(),
    ]);
    if (daysRes.error || profileRes.error) return reply.code(500).send(failed);
    const days = (daysRes.data ?? []) as StudyDay[];
    const profile = profileRes.data as { daily_goal_xp: number; streak_freezes: number } | null;
    const since = addDays(today, -(CALENDAR_DAYS - 1));
    return reply.send({
      today,
      streak: currentStreak(days, today),
      longest: longestStreak(days),
      today_xp: days.find((d) => d.day === today && !d.freeze)?.xp ?? 0,
      goal_xp: profile?.daily_goal_xp ?? DAILY_GOALS[0],
      freezes: profile?.streak_freezes ?? 0,
      days: days.filter((d) => d.day >= since).sort((a, b) => a.day.localeCompare(b.day)),
    });
  });

  app.patch('/api/me/habit', { preHandler: [requireUser] }, async (request, reply) => {
    const goal = (request.body as { goal_xp?: unknown } | null)?.goal_xp;
    if (!DAILY_GOALS.includes(goal as (typeof DAILY_GOALS)[number])) {
      return reply.code(400).send({ error: 'Mục tiêu ngày phải là 20, 50 hoặc 100 XP.', error_en: 'The daily goal must be 20, 50 or 100 XP.' });
    }
    if (!app.supabase) return reply.code(503).send(unavailable);
    const { error } = await app.supabase.from('profiles').update({ daily_goal_xp: goal }).eq('id', userId(request)!);
    if (error) return reply.code(500).send({ error: 'Chưa lưu được mục tiêu.', error_en: 'Could not save the goal.' });
    return reply.send({ goal_xp: goal });
  });
};
