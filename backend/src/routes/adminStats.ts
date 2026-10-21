import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

// Real usage numbers for the admin (accounts, activity, paid orders), read straight from the database
// so they can go into a report or a pitch. Read only.

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_ROWS = 20_000;
const unavailable = { error: 'Dịch vụ thống kê chưa sẵn sàng.', error_en: 'Statistics are not available.' };
const failed = { error: 'Không tải được số liệu.', error_en: 'Could not load the numbers.' };

type Activity = { user_id: string; created_at: string };

export const adminStatsRoutes: FastifyPluginAsync = async (app) => {
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as FastifyRequest & { user?: { app_metadata?: { app_role?: string } } }).user?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send({ error: 'Chỉ quản trị viên mới xem được số liệu.', error_en: 'Admins only.' });
    }
  };

  app.get('/api/admin/stats', { preHandler: [requireAdmin] }, async (_request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const now = Date.now();
    const since = (days: number) => new Date(now - days * DAY_MS).toISOString();
    const count = (table: string, filter?: (q: any) => any) => {
      const query = supabase.from(table).select('*', { count: 'exact', head: true });
      return filter ? filter(query) : query;
    };

    const [accounts, new7, new30, teachers, examsDone, exams7, conversations, subscribers, orders, examRows, practiceRows] = await Promise.all([
      count('profiles'),
      count('profiles', (q) => q.gte('created_at', since(7))),
      count('profiles', (q) => q.gte('created_at', since(30))),
      count('profiles', (q) => q.eq('role', 'teacher')),
      count('exam_attempts', (q) => q.eq('status', 'submitted')),
      count('exam_attempts', (q) => q.eq('status', 'submitted').gte('submitted_at', since(7))),
      count('tutor_conversations'),
      count('billing_subscriptions', (q) => q.gt('paid_through', new Date(now).toISOString())),
      supabase.from('billing_orders').select('amount_vnd').eq('status', 'paid').limit(50_000),
      supabase.from('exam_attempts').select('user_id, created_at').gte('created_at', since(30)).limit(ACTIVITY_ROWS),
      supabase.from('practice_attempts').select('user_id, created_at').gte('created_at', since(30)).limit(ACTIVITY_ROWS),
    ]);
    const errors = [accounts, new7, new30, teachers, examsDone, exams7, conversations, subscribers, orders, examRows, practiceRows].filter((r) => r.error);
    if (errors.length) {
      app.log.error({ err: errors[0]!.error }, 'Admin stats failed');
      return reply.code(500).send(failed);
    }

    // Days (Vietnam time) on which each person did an exam or a practice answer, over the last 30 days.
    const days = new Map<string, Set<string>>();
    for (const row of [...((examRows.data ?? []) as Activity[]), ...((practiceRows.data ?? []) as Activity[])]) {
      const day = new Date(Date.parse(row.created_at) + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
      (days.get(row.user_id) ?? days.set(row.user_id, new Set()).get(row.user_id)!).add(day);
    }
    const cutoff7 = now - 7 * DAY_MS;
    const active7 = new Set<string>();
    for (const row of [...((examRows.data ?? []) as Activity[]), ...((practiceRows.data ?? []) as Activity[])]) {
      if (Date.parse(row.created_at) >= cutoff7) active7.add(row.user_id);
    }
    const paid = ((orders.data ?? []) as Array<{ amount_vnd: number }>);

    return reply.send({
      generated_at: new Date(now).toISOString(),
      accounts: { total: accounts.count ?? 0, new_7d: new7.count ?? 0, new_30d: new30.count ?? 0, teachers: teachers.count ?? 0 },
      activity: {
        active_7d: active7.size,
        active_30d: days.size,
        returning_30d: [...days.values()].filter((set) => set.size >= 2).length,
        exams_submitted: examsDone.count ?? 0,
        exams_submitted_7d: exams7.count ?? 0,
        tutor_conversations: conversations.count ?? 0,
        // The 30-day activity reads are capped; true when the cap may have hidden rows.
        capped: (examRows.data?.length ?? 0) >= ACTIVITY_ROWS || (practiceRows.data?.length ?? 0) >= ACTIVITY_ROWS,
      },
      sales: { paid_orders: paid.length, revenue_vnd: paid.reduce((sum, o) => sum + o.amount_vnd, 0), active_subscriptions: subscribers.count ?? 0 },
    });
  });
};
