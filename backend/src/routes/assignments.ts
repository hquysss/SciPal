import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

// Work a teacher gives a class (spec docs/superpowers/specs/2026-09-29-class-assignments-design.md).
// A class gets published lessons and exams; "done" comes from progress.completed_at (lesson
// quiz) and exam_attempts.status = 'submitted', whenever it happened. Only titles, links and
// dates leave the server — never questions or answers.

type User = { id?: string; app_metadata?: { app_role?: string } };
type Bilingual = { vi: string; en: string };
type ErrorBody = { code: string; error: string; error_en: string };
const err = (code: string, error: string, error_en: string): ErrorBody => ({ code, error, error_en });
const UNAUTHORIZED = err('UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ.', 'Your session is not valid.');
const FORBIDDEN = err('FORBIDDEN', 'Chỉ giáo viên mới giao bài được.', 'Only teachers can give work to a class.');
const NOT_FOUND = err('NOT_FOUND', 'Không tìm thấy lớp học hoặc bài đã giao.', 'Class or assignment not found.');
const INVALID = err('INVALID_ASSIGNMENT', 'Chọn đúng một bài học hoặc một đề thi; hạn nộp (nếu có) phải ở tương lai.', 'Choose exactly one lesson or one exam; a due date, if any, must be in the future.');
const NOT_PUBLISHED = err('CONTENT_NOT_PUBLISHED', 'Chỉ giao được bài học hoặc đề đã xuất bản.', 'Only published lessons and exams can be given.');
const DUPLICATE = err('ALREADY_ASSIGNED', 'Bài này đã được giao cho lớp.', 'This is already given to the class.');
const UNAVAILABLE = err('CLASSES_UNAVAILABLE', 'Chưa tải được dữ liệu lớp học. Thử lại sau.', 'Class data is not available. Try again later.');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = z.string().regex(UUID);
const NewAssignment = z.object({
  lessonId: uuid.optional(),
  blueprintId: uuid.optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict().refine((b) => (b.lessonId ? 1 : 0) + (b.blueprintId ? 1 : 0) === 1)
  .refine((b) => !b.dueAt || new Date(b.dueAt).getTime() > Date.now());

type AssignmentRow = { id: string; class_id?: string; lesson_id: string | null; blueprint_id: string | null; due_at: string | null; created_at: string };
type LessonRow = { id: string; slug: string; title_en: string; title_vi: string; status: string; subjects: { slug?: string } | Array<{ slug?: string }> | null };
type ExamRow = { id: string; name: string; name_en: string | null; status: string };
type Content = { title: Bilingual; href: string; published: boolean };

const iso = (value: string | null) => (value ? new Date(value).toISOString() : null);
const one = <T>(value: T | T[] | null | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;
const lessonTitle = (l: LessonRow): Bilingual => ({ vi: l.title_vi, en: l.title_en || l.title_vi });
const examTitle = (e: ExamRow): Bilingual => ({ vi: e.name, en: e.name_en || e.name });
/** Search text for a PostgREST `or` filter: characters that shape the filter are dropped. */
const searchText = (q: unknown) => (typeof q === 'string' ? q.replace(/[,()%*\\:."]/g, ' ').trim().slice(0, 80) : '');

export const assignmentRoutes: FastifyPluginAsync = async (app) => {
  const userOf = (request: FastifyRequest) => (request as FastifyRequest & { user?: User }).user;
  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!userOf(request)?.id) return reply.code(401).send(UNAUTHORIZED);
  };
  const requireTeacher = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = userOf(request);
    if (!user?.id) return reply.code(401).send(UNAUTHORIZED);
    const role = user.app_metadata?.app_role;
    if (role !== 'teacher' && role !== 'admin') return reply.code(403).send(FORBIDDEN);
  };
  const fail = (request: FastifyRequest, reply: FastifyReply, error: unknown) => {
    request.log.error({ err: error }, 'Assignment request failed');
    return reply.code(503).send(UNAVAILABLE);
  };

  /** The class when it belongs to this teacher (or the user is an admin); null otherwise. */
  const ownedClass = async (id: string, user: User) => {
    if (!UUID.test(id)) return null;
    const { data, error } = await app.supabase!.from('class_rooms').select('id, teacher_id, subject_id').eq('id', id).maybeSingle();
    if (error) throw error;
    const room = data as { id: string; teacher_id: string; subject_id: string | null } | null;
    if (!room || (user.app_metadata?.app_role !== 'admin' && room.teacher_id !== user.id)) return null;
    return room;
  };

  /** Title, link and published state of each lesson and exam. */
  const contents = async (lessonIds: string[], examIds: string[]) => {
    const supabase = app.supabase!;
    const [lessons, exams] = await Promise.all([
      lessonIds.length ? supabase.from('lessons').select('id, slug, title_en, title_vi, status, subjects(slug)').in('id', lessonIds) : null,
      examIds.length ? supabase.from('exam_blueprints').select('id, name, name_en, status').in('id', examIds) : null,
    ]);
    if (lessons?.error || exams?.error) throw lessons?.error ?? exams?.error;
    const map = new Map<string, Content>();
    for (const l of (lessons?.data ?? []) as LessonRow[]) {
      const subject = one(l.subjects)?.slug;
      map.set(l.id, { title: lessonTitle(l), href: subject ? `/${subject}/${l.slug}` : '', published: l.status === 'published' && Boolean(subject) });
    }
    for (const e of (exams?.data ?? []) as ExamRow[]) {
      map.set(e.id, { title: examTitle(e), href: `/exam/${e.id}`, published: e.status === 'published' });
    }
    return map;
  };

  const idsOf = (rows: AssignmentRow[]) => ({
    lessonIds: [...new Set(rows.map((r) => r.lesson_id).filter((v): v is string => Boolean(v)))],
    examIds: [...new Set(rows.map((r) => r.blueprint_id).filter((v): v is string => Boolean(v)))],
  });

  app.get('/api/classes/:id/assignments', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(UNAVAILABLE);
    try {
      const room = await ownedClass((request.params as { id: string }).id, userOf(request)!);
      if (!room) return reply.code(404).send(NOT_FOUND);
      const [given, members] = await Promise.all([
        supabase.from('assignments').select('id, lesson_id, blueprint_id, due_at, created_at').eq('class_id', room.id).order('created_at', { ascending: false }),
        supabase.from('class_members').select('student_id').eq('class_id', room.id),
      ]);
      if (given.error || members.error) throw given.error ?? members.error;
      const rows = (given.data ?? []) as AssignmentRow[];
      const memberIds = ((members.data ?? []) as Array<{ student_id: string }>).map((m) => m.student_id);
      const { lessonIds, examIds } = idsOf(rows);
      const done = new Map<string, Set<string>>();
      const mark = (content: string, userId: string) => done.set(content, (done.get(content) ?? new Set()).add(userId));
      const [info, progress, attempts] = await Promise.all([
        contents(lessonIds, examIds),
        memberIds.length && lessonIds.length
          ? supabase.from('progress').select('user_id, lesson_id').in('lesson_id', lessonIds).in('user_id', memberIds).not('completed_at', 'is', null)
          : null,
        memberIds.length && examIds.length
          ? supabase.from('exam_attempts').select('user_id, blueprint_id').in('blueprint_id', examIds).in('user_id', memberIds).eq('status', 'submitted')
          : null,
      ]);
      if (progress?.error || attempts?.error) throw progress?.error ?? attempts?.error;
      for (const p of (progress?.data ?? []) as Array<{ user_id: string; lesson_id: string }>) mark(p.lesson_id, p.user_id);
      for (const a of (attempts?.data ?? []) as Array<{ user_id: string; blueprint_id: string }>) mark(a.blueprint_id, a.user_id);

      return {
        assignments: rows.map((row) => {
          const contentId = (row.lesson_id ?? row.blueprint_id)!;
          const content = info.get(contentId);
          return {
            id: row.id,
            kind: row.lesson_id ? 'lesson' : 'exam',
            contentId,
            title: content?.title ?? { vi: 'Nội dung đã bị xóa', en: 'Deleted content' },
            href: content?.published ? content.href : null,
            published: content?.published ?? false,
            dueAt: iso(row.due_at),
            createdAt: iso(row.created_at),
            doneCount: done.get(contentId)?.size ?? 0,
            memberCount: memberIds.length,
          };
        }),
      };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.post('/api/classes/:id/assignments', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(UNAVAILABLE);
    const user = userOf(request)!;
    try {
      const room = await ownedClass((request.params as { id: string }).id, user);
      if (!room) return reply.code(404).send(NOT_FOUND);
      const parsed = NewAssignment.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send(INVALID);
      const { lessonId, blueprintId, dueAt } = parsed.data;
      const info = await contents(lessonId ? [lessonId] : [], blueprintId ? [blueprintId] : []);
      if (!info.get((lessonId ?? blueprintId)!)?.published) return reply.code(400).send(NOT_PUBLISHED);

      const { data, error } = await supabase
        .from('assignments')
        .insert({ class_id: room.id, lesson_id: lessonId ?? null, blueprint_id: blueprintId ?? null, due_at: dueAt ? new Date(dueAt).toISOString() : null, created_by: user.id })
        .select('id')
        .single();
      if (error?.code === '23505') return reply.code(409).send(DUPLICATE);
      if (error || !data) throw error;
      return reply.code(201).send({ id: (data as { id: string }).id });
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  app.delete('/api/classes/:id/assignments/:assignmentId', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(UNAVAILABLE);
    const { id, assignmentId } = request.params as { id: string; assignmentId: string };
    try {
      const room = await ownedClass(id, userOf(request)!);
      if (!room || !UUID.test(assignmentId)) return reply.code(404).send(NOT_FOUND);
      const { data, error } = await supabase.from('assignments').delete().eq('id', assignmentId).eq('class_id', room.id).select('id');
      if (error) throw error;
      if (!data || (data as unknown[]).length === 0) return reply.code(404).send(NOT_FOUND);
      return reply.code(204).send();
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  // Published lessons (of the class subject, when it has one) or exams to pick from.
  app.get('/api/classes/:id/assignable', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(UNAVAILABLE);
    const { kind, q } = request.query as { kind?: string; q?: string };
    try {
      const room = await ownedClass((request.params as { id: string }).id, userOf(request)!);
      if (!room) return reply.code(404).send(NOT_FOUND);
      const text = searchText(q);
      if (kind === 'exam') {
        let query = supabase.from('exam_blueprints').select('id, name, name_en, status').eq('status', 'published');
        if (text) query = query.or(`name.ilike.%${text}%,name_en.ilike.%${text}%`);
        const { data, error } = await query.order('updated_at', { ascending: false }).limit(20);
        if (error) throw error;
        return { items: ((data ?? []) as ExamRow[]).map((e) => ({ id: e.id, title: examTitle(e) })) };
      }
      let query = supabase.from('lessons').select('id, slug, title_en, title_vi, status, subjects(slug)').eq('status', 'published');
      if (room.subject_id) query = query.eq('subject_id', room.subject_id);
      if (text) query = query.or(`title_vi.ilike.%${text}%,title_en.ilike.%${text}%`);
      const { data, error } = await query.order('title_vi', { ascending: true }).limit(20);
      if (error) throw error;
      return { items: ((data ?? []) as LessonRow[]).map((l) => ({ id: l.id, title: lessonTitle(l) })) };
    } catch (error) {
      return fail(request, reply, error);
    }
  });

  // A student's classes and the published work given to each.
  app.get('/api/classes/mine', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(UNAVAILABLE);
    const me = userOf(request)!.id!;
    try {
      const memberships = await supabase.from('class_members').select('class_id').eq('student_id', me);
      if (memberships.error) throw memberships.error;
      const classIds = ((memberships.data ?? []) as Array<{ class_id: string }>).map((m) => m.class_id);
      if (classIds.length === 0) return { classes: [] };

      const [rooms, given] = await Promise.all([
        supabase.from('class_rooms').select('id, name, teacher_id, subjects(name_en, name_vi)').in('id', classIds),
        supabase.from('assignments').select('id, class_id, lesson_id, blueprint_id, due_at, created_at').in('class_id', classIds).order('created_at', { ascending: false }),
      ]);
      if (rooms.error || given.error) throw rooms.error ?? given.error;
      const roomRows = (rooms.data ?? []) as Array<{ id: string; name: string; teacher_id: string; subjects: { name_en?: string; name_vi?: string } | Array<{ name_en?: string; name_vi?: string }> | null }>;
      const rows = (given.data ?? []) as AssignmentRow[];
      const { lessonIds, examIds } = idsOf(rows);
      const teacherIds = [...new Set(roomRows.map((r) => r.teacher_id))];

      const [teachers, info, progress, attempts] = await Promise.all([
        teacherIds.length ? supabase.from('profiles').select('id, display_name').in('id', teacherIds) : null,
        contents(lessonIds, examIds),
        lessonIds.length ? supabase.from('progress').select('lesson_id').eq('user_id', me).in('lesson_id', lessonIds).not('completed_at', 'is', null) : null,
        examIds.length ? supabase.from('exam_attempts').select('blueprint_id').eq('user_id', me).in('blueprint_id', examIds).eq('status', 'submitted') : null,
      ]);
      if (teachers?.error || progress?.error || attempts?.error) throw teachers?.error ?? progress?.error ?? attempts?.error;
      const teacherName = new Map(((teachers?.data ?? []) as Array<{ id: string; display_name: string | null }>).map((t) => [t.id, t.display_name]));
      const done = new Set<string>([
        ...((progress?.data ?? []) as Array<{ lesson_id: string }>).map((p) => p.lesson_id),
        ...((attempts?.data ?? []) as Array<{ blueprint_id: string }>).map((a) => a.blueprint_id),
      ]);

      return {
        classes: roomRows.map((r) => {
          const subject = one(r.subjects);
          return {
            id: r.id,
            name: r.name,
            teacherName: teacherName.get(r.teacher_id) ?? null,
            subject: subject?.name_vi ? { vi: subject.name_vi, en: subject.name_en || subject.name_vi } : null,
            assignments: rows
              .filter((a) => a.class_id === r.id)
              .flatMap((a) => {
                const contentId = (a.lesson_id ?? a.blueprint_id)!;
                const content = info.get(contentId);
                // Unpublished (or deleted) since it was given: students no longer see it.
                if (!content?.published) return [];
                return [{
                  id: a.id,
                  kind: a.lesson_id ? 'lesson' : 'exam',
                  title: content.title,
                  href: content.href,
                  dueAt: iso(a.due_at),
                  createdAt: iso(a.created_at),
                  done: done.has(contentId),
                }];
              }),
          };
        }),
      };
    } catch (error) {
      return fail(request, reply, error);
    }
  });
};
