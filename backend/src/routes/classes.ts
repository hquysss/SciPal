import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

interface ClassUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVITE_CODE_PATTERN = /^[0-9A-Z]{4,12}$/;
const unavailable = { error: 'Dịch vụ lớp học chưa sẵn sàng.' };
const notFound = { error: 'Không tìm thấy lớp học.' };

function getUser(request: FastifyRequest): ClassUser | undefined {
  return (request as FastifyRequest & { user?: ClassUser }).user;
}

function isAdmin(user: ClassUser | undefined): boolean {
  return user?.app_metadata?.app_role === 'admin';
}

export function newInviteCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

const ROSTER_PAGE_SIZE = 1000;

/**
 * Page through a supabase query past PostgREST's 1000-row response cap.
 * `buildQuery` must build and return a fresh query (calling `supabase.from(table)...`)
 * for the given page range; paging stops once a page returns fewer than
 * PAGE_SIZE rows, or immediately on error.
 */
async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
): Promise<{ rows: T[]; error: { message?: string } | null }> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + ROSTER_PAGE_SIZE - 1);
    if (error) return { rows, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < ROSTER_PAGE_SIZE) break;
    from += ROSTER_PAGE_SIZE;
  }
  return { rows, error: null };
}

export const classRoutes: FastifyPluginAsync = async (app) => {
  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!getUser(request)?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });
  };

  const requireTeacher = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });
    const role = user.app_metadata?.app_role;
    if (role !== 'teacher' && role !== 'admin') {
      return reply.code(403).send({ error: 'Chỉ giáo viên mới có quyền quản lý lớp học.' });
    }
  };

  // List classes (teacher: own, admin: all)
  app.get('/api/classes', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;

    let query = supabase
      .from('class_rooms')
      .select('id, name, subject_id, invite_code, created_at, class_members(count)')
      .order('created_at', { ascending: false });
    if (!isAdmin(user)) query = query.eq('teacher_id', user.id!);

    const { data, error } = await query;
    if (error) {
      request.log.error({ err: error }, 'Failed to list classes');
      return reply.code(500).send({ error: 'Không tải được danh sách lớp học.' });
    }

    const classes = (data ?? []).map((row) => {
      const { class_members: counts, ...room } = row as Record<string, unknown> & {
        class_members?: Array<{ count: number }>;
      };
      return { ...room, student_count: counts?.[0]?.count ?? 0 };
    });
    return reply.send({ classes });
  });

  // Create class (teacher/admin)
  app.post('/api/classes', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;

    const body = (request.body ?? {}) as { name?: unknown; subject_slug?: unknown; subject_id?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const subjectKey = typeof body.subject_slug === 'string'
      ? body.subject_slug.trim()
      : typeof body.subject_id === 'string'
        ? body.subject_id.trim()
        : '';

    if (!name || name.length > 100) {
      return reply.code(400).send({ error: 'Tên lớp là bắt buộc (tối đa 100 ký tự).' });
    }
    if (!subjectKey) return reply.code(400).send({ error: 'Vui lòng chọn môn học.' });

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq(UUID_PATTERN.test(subjectKey) ? 'id' : 'slug', subjectKey)
      .maybeSingle();
    if (subjectError) {
      request.log.error({ err: subjectError }, 'Failed to resolve class subject');
      return reply.code(500).send({ error: 'Không xác minh được môn học.' });
    }
    if (!subject) return reply.code(400).send({ error: 'Môn học không tồn tại.' });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase
        .from('class_rooms')
        .insert({ teacher_id: user.id, subject_id: subject.id, name, invite_code: newInviteCode() })
        .select('id, name, subject_id, invite_code, created_at')
        .single();
      if (error?.code === '23505') continue; // invite code collision — retry
      if (error || !data) {
        request.log.error({ err: error }, 'Failed to create class');
        return reply.code(500).send({ error: 'Không tạo được lớp học.' });
      }
      return reply.code(201).send({ class_room: { ...data, student_count: 0 } });
    }
    return reply.code(500).send({ error: 'Không tạo được mã lớp. Vui lòng thử lại.' });
  });

  // Join class (any signed-in user)
  app.post('/api/classes/join', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;

    const { invite_code } = (request.body ?? {}) as { invite_code?: unknown };
    const code = typeof invite_code === 'string' ? invite_code.trim().toUpperCase() : '';
    if (!INVITE_CODE_PATTERN.test(code)) {
      return reply.code(400).send({ error: 'Mã lớp không hợp lệ.' });
    }

    const { data: classRoom, error: lookupError } = await supabase
      .from('class_rooms')
      .select('id, teacher_id')
      .eq('invite_code', code)
      .maybeSingle();
    if (lookupError) {
      request.log.error({ err: lookupError }, 'Failed to look up invite code');
      return reply.code(500).send({ error: 'Không kiểm tra được mã lớp.' });
    }
    if (!classRoom) return reply.code(404).send({ error: 'Mã lớp không hợp lệ hoặc không tồn tại.' });
    if (classRoom.teacher_id === user.id) {
      return reply.code(400).send({ error: 'Bạn là giáo viên của lớp này.' });
    }

    const { error } = await supabase
      .from('class_members')
      .insert({ class_id: classRoom.id, student_id: user.id });
    if (error && error.code !== '23505') {
      request.log.error({ err: error }, 'Failed to join class');
      return reply.code(500).send({ error: 'Không tham gia được lớp học.' });
    }

    return reply.send({ success: true, class_id: classRoom.id });
  });

  // Class roster (owning teacher or admin)
  app.get('/api/classes/:id/roster', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) return reply.code(404).send(notFound);

    const { data: room, error: roomError } = await supabase
      .from('class_rooms')
      .select('id, name, subject_id, invite_code, teacher_id')
      .eq('id', id)
      .maybeSingle();
    if (roomError) {
      request.log.error({ err: roomError }, 'Failed to read class');
      return reply.code(500).send({ error: 'Không tải được lớp học.' });
    }
    if (!room || (!isAdmin(user) && room.teacher_id !== user.id)) {
      return reply.code(404).send(notFound);
    }

    const { data: memberRows, error: membersError } = await supabase
      .from('class_members')
      .select('student_id, joined_at, profiles(display_name)')
      .eq('class_id', id);
    if (membersError) {
      request.log.error({ err: membersError }, 'Failed to read class members');
      return reply.code(500).send({ error: 'Không tải được danh sách học sinh.' });
    }

    const members = (memberRows ?? []) as Array<{
      student_id: string;
      joined_at: string;
      profiles: { display_name: string | null } | Array<{ display_name: string | null }> | null;
    }>;
    const memberIds = members.map((m) => m.student_id);
    const xpByStudent = new Map<string, number>();
    const lessonsByStudent = new Map<string, number>();

    if (memberIds.length > 0) {
      const [xpRes, progressRes] = await Promise.all([
        fetchAllRows<{ user_id: string; delta: number }>((from, to) =>
          supabase.from('xp_log').select('user_id, delta').in('user_id', memberIds).range(from, to),
        ),
        fetchAllRows<{ user_id: string }>((from, to) =>
          supabase.from('progress').select('user_id').in('user_id', memberIds).range(from, to),
        ),
      ]);
      if (xpRes.error || progressRes.error) {
        request.log.error({ err: xpRes.error ?? progressRes.error }, 'Failed to read roster stats');
        return reply.code(500).send({ error: 'Không tải được số liệu học sinh.' });
      }
      for (const row of xpRes.rows) {
        xpByStudent.set(row.user_id, (xpByStudent.get(row.user_id) ?? 0) + row.delta);
      }
      for (const row of progressRes.rows) {
        lessonsByStudent.set(row.user_id, (lessonsByStudent.get(row.user_id) ?? 0) + 1);
      }
    }

    const { teacher_id: _teacherId, ...classRoom } = room;
    return reply.send({
      class_room: classRoom,
      members: members.map((m) => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          student_id: m.student_id,
          display_name: profile?.display_name ?? '',
          joined_at: m.joined_at,
          total_xp: xpByStudent.get(m.student_id) ?? 0,
          completed_lessons: lessonsByStudent.get(m.student_id) ?? 0,
        };
      }),
    });
  });
};
