import type { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';

export const classRoutes: FastifyPluginAsync = async (app) => {
  // Create class (Teacher)
  app.post('/api/classes', async (request, reply) => {
    const user = (request as any).user as { id?: string; sub?: string } | undefined;
    const teacherId = user?.id ?? user?.sub ?? 'demo-teacher-id';

    const { name, subject_id } = (request.body ?? {}) as {
      name?: string;
      subject_id?: string;
    };

    if (!name || !subject_id) {
      return reply.status(400).send({ error: 'Tên lớp và môn học là bắt buộc.' });
    }

    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    if (app.supabase) {
      const { data, error } = await app.supabase
        .from('class_rooms')
        .insert({
          teacher_id: teacherId,
          subject_id,
          name,
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (error) return reply.status(500).send({ error: error.message });
      return reply.status(201).send({ class_room: data });
    }

    // Mock response for test/standalone demo
    return reply.status(201).send({
      class_room: {
        id: `class-${Date.now()}`,
        teacher_id: teacherId,
        subject_id,
        name,
        invite_code: inviteCode,
        created_at: new Date().toISOString(),
      },
    });
  });

  // Join class (Student)
  app.post('/api/classes/join', async (request, reply) => {
    const user = (request as any).user as { id?: string; sub?: string } | undefined;
    const studentId = user?.id ?? user?.sub ?? 'demo-student-id';

    const { invite_code } = (request.body ?? {}) as { invite_code?: string };

    if (!invite_code?.trim()) {
      return reply.status(400).send({ error: 'Mã lớp không được để trống.' });
    }

    const normalizedCode = invite_code.toUpperCase().trim();

    if (app.supabase) {
      const { data: classRoom } = await app.supabase
        .from('class_rooms')
        .select('id')
        .eq('invite_code', normalizedCode)
        .single();

      if (!classRoom) {
        return reply.status(404).send({ error: 'Mã lớp không hợp lệ hoặc không tồn tại.' });
      }

      const { error } = await app.supabase
        .from('class_members')
        .insert({ class_id: classRoom.id, student_id: studentId });

      if (error && error.code !== '23505') {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, class_id: classRoom.id });
    }

    // Mock response
    return reply.send({ success: true, class_id: `class-demo-${normalizedCode}` });
  });

  // Fetch class details and roster
  app.get('/api/classes/:id/roster', async (request, reply) => {
    const { id } = request.params as { id: string };

    if (app.supabase) {
      const [{ data: classRoom }, { data: members }] = await Promise.all([
        app.supabase.from('class_rooms').select('*').eq('id', id).single(),
        app.supabase.from('class_members').select('student_id, joined_at, profiles(*)').eq('class_id', id),
      ]);

      return reply.send({ class_room: classRoom, members: members ?? [] });
    }

    return reply.send({
      class_room: {
        id,
        name: 'Lớp 10A1 Tin học chuyên',
        subject_id: 'informatics',
        invite_code: 'A1B2C3',
      },
      members: [
        { student_id: 's-1', joined_at: '2026-09-20T10:00:00Z', display_name: 'Nguyễn Văn An', total_xp: 450 },
        { student_id: 's-2', joined_at: '2026-09-21T11:30:00Z', display_name: 'Trần Thị Bình', total_xp: 380 },
        { student_id: 's-3', joined_at: '2026-09-22T08:15:00Z', display_name: 'Lê Hoàng Cường', total_xp: 520 },
      ],
    });
  });
};
