import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

// Admins read every student's SciPal Professor conversations (/admin/ai, tab "Hội thoại") to check the
// tutor's quality. Read only: nothing here changes or deletes a conversation.

const PAGE = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const COLUMNS = 'id, user_id, title, lesson_id, created_at, updated_at, tutor_messages(count)';

const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ lưu trữ chưa sẵn sàng.', 'Storage is not available.');
const failed = msg('Không tải được hội thoại.', 'Could not load the conversations.');

type Row = { id: string; user_id: string; title: string; lesson_id: string | null; created_at: string; updated_at: string; tutor_messages?: Array<{ count: number }> };
type Lesson = { id: string; title_vi: string; title_en: string };

/** The instant a Vietnam calendar day starts, or null for a malformed day. */
function vietnamDay(value: string, plusDays = 0): string | null {
  const m = DAY.exec(value);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + plusDays) - VIETNAM_OFFSET_MS;
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** A name search as an ilike pattern, with the user's % and _ taken literally. */
const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export const adminTutorRoutes: FastifyPluginAsync = async (app) => {
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as FastifyRequest & { user?: { app_metadata?: { app_role?: string } } }).user?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send(msg('Chỉ admin mới xem được hội thoại của học sinh.', 'Only admins can read students’ conversations.'));
    }
  };

  app.get('/api/admin/tutor/conversations', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const query = (request.query ?? {}) as Record<string, string | undefined>;
    const q = query.q?.trim().slice(0, 100) ?? '';
    const from = query.from ? vietnamDay(query.from) : undefined;
    const to = query.to ? vietnamDay(query.to, 1) : undefined;
    const before = query.before && !Number.isNaN(Date.parse(query.before)) ? new Date(query.before).toISOString() : query.before ? null : undefined;
    if (from === null || to === null || before === null) {
      return reply.code(400).send(msg('Ngày lọc không hợp lệ (dạng YYYY-MM-DD).', 'Invalid date filter (use YYYY-MM-DD).'));
    }

    let students: string[] | null = null;
    if (q) {
      const { data, error } = await supabase.from('profiles').select('id').ilike('display_name', likePattern(q)).limit(200);
      if (error) {
        request.log.error({ err: error }, 'Failed to search students');
        return reply.code(500).send(failed);
      }
      students = ((data ?? []) as Array<{ id: string }>).map((p) => p.id);
      if (students.length === 0) return { conversations: [], next: null };
    }

    let list = supabase.from('tutor_conversations').select(COLUMNS);
    if (students) list = list.in('user_id', students);
    if (from) list = list.gte('updated_at', from);
    if (to) list = list.lt('updated_at', to);
    if (before) list = list.lt('updated_at', before);
    const { data, error } = await list.order('updated_at', { ascending: false }).limit(PAGE + 1);
    if (error) {
      request.log.error({ err: error }, 'Failed to list tutor conversations');
      return reply.code(500).send(failed);
    }
    const rows = (data ?? []) as Row[];
    const page = rows.slice(0, PAGE);
    if (page.length === 0) return { conversations: [], next: null };

    const userIds = [...new Set(page.map((r) => r.user_id))];
    const lessonIds = [...new Set(page.flatMap((r) => (r.lesson_id ? [r.lesson_id] : [])))];
    const [people, lessons] = await Promise.all([
      supabase.from('profiles').select('id, display_name').in('id', userIds),
      lessonIds.length ? supabase.from('lessons').select('id, title_vi, title_en').in('id', lessonIds) : Promise.resolve({ data: [] }),
    ]);
    const names = new Map(((people.data ?? []) as Array<{ id: string; display_name: string | null }>).map((p) => [p.id, p.display_name]));
    const titles = new Map(((lessons.data ?? []) as Lesson[]).map((l) => [l.id, l]));

    return {
      conversations: page.map((r) => ({
        id: r.id,
        title: r.title,
        student: { id: r.user_id, name: names.get(r.user_id) ?? null },
        lesson: r.lesson_id ? (titles.get(r.lesson_id) ?? null) : null,
        messages: r.tutor_messages?.[0]?.count ?? 0,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
      next: rows.length > PAGE ? page[page.length - 1].updated_at : null,
    };
  });

  app.get('/api/admin/tutor/conversations/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { id } = request.params as { id: string };
    const notFound = msg('Không tìm thấy hội thoại.', 'Conversation not found.');
    if (!UUID.test(id)) return reply.code(404).send(notFound);

    const { data, error } = await supabase.from('tutor_conversations').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) {
      request.log.error({ err: error }, 'Failed to read a tutor conversation');
      return reply.code(500).send(failed);
    }
    const row = data as Row | null;
    if (!row) return reply.code(404).send(notFound);

    const [messages, person, lesson] = await Promise.all([
      supabase.from('tutor_messages').select('id, role, content, created_at').eq('conversation_id', id).order('created_at', { ascending: true }),
      supabase.from('profiles').select('id, display_name').eq('id', row.user_id).maybeSingle(),
      row.lesson_id ? supabase.from('lessons').select('id, title_vi, title_en').eq('id', row.lesson_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (messages.error) {
      request.log.error({ err: messages.error }, 'Failed to read tutor messages');
      return reply.code(500).send(failed);
    }
    return {
      conversation: {
        id: row.id,
        title: row.title,
        student: { id: row.user_id, name: (person.data as { display_name?: string | null } | null)?.display_name ?? null },
        lesson: (lesson.data as Lesson | null) ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      messages: messages.data ?? [],
    };
  });
};
