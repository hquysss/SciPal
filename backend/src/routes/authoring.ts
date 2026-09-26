import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { BlockSchema } from '../schemas/blocks.js';

interface AuthoringUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

const LESSON_LIST_COLUMNS =
  'id, topic_id, subject_id, slug, title_en, title_vi, grade, blocks, sort_order, status, review_note, published_at, created_by, reviewed_by, reviewed_at, created_at, updated_at, subjects(slug, name_en, name_vi), topics(name_en, name_vi)';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getUser(request: FastifyRequest): AuthoringUser | undefined {
  return (request as FastifyRequest & { user?: AuthoringUser }).user;
}

function relation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function asText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : undefined;
}

function makeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function withRelations(row: Record<string, any>) {
  const subject = relation(row.subjects as { slug: string; name_en: string; name_vi: string } | null);
  const topic = relation(row.topics as { name_en: string; name_vi: string } | null);
  const { subjects: _subjects, topics: _topics, ...lesson } = row;
  return {
    ...lesson,
    subject_slug: subject?.slug ?? '',
    subject_name_en: subject?.name_en ?? '',
    subject_name_vi: subject?.name_vi ?? '',
    topic_name_en: topic?.name_en ?? '',
    topic_name_vi: topic?.name_vi ?? '',
    block_count: Array.isArray(row.blocks) ? row.blocks.length : 0,
  };
}

export const authoringRoutes: FastifyPluginAsync = async (app) => {
  const verifyTeacher = async (request: FastifyRequest, reply: FastifyReply) => {
    const role = getUser(request)?.app_metadata?.app_role;
    if (role !== 'teacher' && role !== 'admin') {
      return reply.code(403).send({ error: 'Chỉ giáo viên mới có quyền quản lý bài học.' });
    }
  };

  const verifyTeacherOnly = async (request: FastifyRequest, reply: FastifyReply) => {
    if (getUser(request)?.app_metadata?.app_role !== 'teacher') {
      return reply.code(403).send({ error: 'Chỉ giáo viên mới có thể tạo và gửi bài học.' });
    }
  };

  const verifyAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (getUser(request)?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send({ error: 'Chỉ admin mới có quyền duyệt bài.' });
    }
  };

  app.get('/api/authoring/options', {
    preHandler: [verifyTeacherOnly],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.' });
      }

      const [{ data: subjects, error: subjectsError }, { data: topics, error: topicsError }] =
        await Promise.all([
          supabase
            .from('subjects')
            .select('id, slug, name_en, name_vi')
            .order('sort_order'),
          supabase
            .from('topics')
            .select('id, subject_id, name_en, name_vi, sort_order')
            .order('sort_order'),
        ]);

      if (subjectsError || topicsError) {
        request.log.error({ err: subjectsError ?? topicsError }, 'Failed to load authoring options');
        return reply.code(500).send({ error: 'Không tải được danh sách môn học và chủ đề.' });
      }

      return reply.send({ subjects: subjects ?? [], topics: topics ?? [] });
    },
  });

  app.get('/api/authoring/lessons', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });

      let query = supabase
        .from('lessons')
        .select(LESSON_LIST_COLUMNS)
        .order('updated_at', { ascending: false });
      if (user.app_metadata?.app_role !== 'admin') query = query.eq('created_by', user.id);

      const { data, error } = await query;
      if (error) {
        request.log.error({ err: error }, 'Failed to list authoring lessons');
        return reply.code(500).send({ error: 'Không tải được danh sách bài giảng.' });
      }

      return reply.send({ lessons: (data ?? []).map((row) => withRelations(row as Record<string, any>)) });
    },
  });

  app.get('/api/authoring/reviews', {
    preHandler: [verifyAdmin],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.' });
      }

      const { data, error } = await supabase
        .from('lessons')
        .select(LESSON_LIST_COLUMNS)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true });

      if (error) {
        request.log.error({ err: error }, 'Failed to list lessons for review');
        return reply.code(500).send({ error: 'Không tải được hàng chờ duyệt.' });
      }

      return reply.send({ lessons: (data ?? []).map((row) => withRelations(row as Record<string, any>)) });
    },
  });

  app.get('/api/authoring/lessons/:id', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });

      const { id } = request.params as { id: string };
      const { data, error } = await supabase
        .from('lessons')
        .select('*, subjects(slug, name_en, name_vi), topics(name_en, name_vi)')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        request.log.error({ err: error, lessonId: id }, 'Failed to read authoring lesson');
        return reply.code(500).send({ error: 'Không tải được bài giảng.' });
      }
      if (!data) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.' });
      if (user.app_metadata?.app_role !== 'admin' && data.created_by !== user.id) {
        return reply.code(404).send({ error: 'Không tìm thấy bài giảng.' });
      }

      return reply.send({ lesson: withRelations(data as Record<string, any>) });
    },
  });

  app.post('/api/authoring/lessons', {
    preHandler: [verifyTeacherOnly],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });

      const body = (request.body ?? {}) as Record<string, unknown>;
      const titleEn = asText(body.title_en, 200);
      const titleVi = asText(body.title_vi, 200);
      const topicId = asText(body.topic_id, 64);
      const grade = body.grade === undefined ? 10 : Number(body.grade);

      if (!titleEn || !titleVi) {
        return reply.code(400).send({ error: 'Vui lòng nhập tiêu đề tiếng Việt và tiếng Anh (tối đa 200 ký tự).' });
      }
      if (!topicId || !UUID_PATTERN.test(topicId)) {
        return reply.code(400).send({ error: 'Vui lòng chọn chủ đề hợp lệ cho bài học.' });
      }
      if (!Number.isInteger(grade) || ![10, 11, 12].includes(grade)) {
        return reply.code(400).send({ error: 'Khối lớp phải là 10, 11 hoặc 12.' });
      }

      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('id, subject_id')
        .eq('id', topicId)
        .maybeSingle();

      if (topicError) {
        request.log.error({ err: topicError, topicId }, 'Failed to find lesson topic');
        return reply.code(500).send({ error: 'Không xác minh được chủ đề đã chọn.' });
      }
      if (!topic) return reply.code(400).send({ error: 'Chủ đề đã chọn không tồn tại.' });

      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', topic.subject_id)
        .maybeSingle();

      if (subjectError) {
        request.log.error({ err: subjectError, subjectId: topic.subject_id }, 'Failed to verify lesson subject');
        return reply.code(500).send({ error: 'Không xác minh được môn học đã chọn.' });
      }
      if (!subject) return reply.code(400).send({ error: 'Môn học đã chọn không tồn tại.' });

      const baseSlug = makeSlug(titleEn) || 'bai-hoc';
      let slug = baseSlug;
      let foundSlug = false;
      for (let suffix = 1; suffix <= 100; suffix += 1) {
        const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
        const { data: existing, error: slugError } = await supabase
          .from('lessons')
          .select('id')
          .eq('subject_id', subject.id)
          .eq('slug', candidate)
          .maybeSingle();

        if (slugError) {
          request.log.error({ err: slugError, subjectId: subject.id }, 'Failed to check lesson slug');
          return reply.code(500).send({ error: 'Không tạo được đường dẫn cho bài học.' });
        }
        if (!existing) {
          slug = candidate;
          foundSlug = true;
          break;
        }
      }
      if (!foundSlug) slug = `${baseSlug}-${randomUUID()}`;

      const { data: lesson, error: insertError } = await supabase
        .from('lessons')
        .insert({
          topic_id: topic.id,
          subject_id: subject.id,
          slug,
          title_en: titleEn,
          title_vi: titleVi,
          grade,
          blocks: [],
          status: 'draft',
          created_by: user.id,
        })
        .select('*')
        .single();

      if (insertError) {
        request.log.error({ err: insertError, topicId }, 'Failed to create lesson');
        if (insertError.code === '23505') {
          return reply.code(409).send({ error: 'Tên bài học này vừa được sử dụng. Hãy thử đổi tiêu đề tiếng Anh.' });
        }
        return reply.code(500).send({ error: 'Không tạo được bài học.' });
      }

      return reply.code(201).send({ lesson });
    },
  });

  app.post('/api/authoring/lessons/:id/submit', {
    preHandler: [verifyTeacherOnly],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });

      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const titleEn = asText(body.title_en, 200);
      const titleVi = asText(body.title_vi, 200);
      const expectedUpdatedAt = asText(body.expected_updated_at, 64);
      const parsedBlocks = BlockSchema.array().min(1).safeParse(body.blocks);

      if (!titleEn || !titleVi) {
        return reply.code(400).send({ error: 'Vui lòng nhập tiêu đề tiếng Việt và tiếng Anh hợp lệ.' });
      }
      if (!expectedUpdatedAt) return reply.code(400).send({ error: 'Thiếu phiên bản bài học cần gửi.' });
      if (!parsedBlocks.success) {
        return reply.code(400).send({ error: 'Bài gửi duyệt cần có ít nhất một khối nội dung hợp lệ.' });
      }

      const { data: current, error: readError } = await supabase
        .from('lessons')
        .select('id, created_by, status, updated_at')
        .eq('id', id)
        .maybeSingle();

      if (readError) {
        request.log.error({ err: readError, lessonId: id }, 'Failed to check lesson submission');
        return reply.code(500).send({ error: 'Không xác minh được quyền gửi bài.' });
      }
      if (!current) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.' });

      if (current.created_by !== user.id) {
        return reply.code(404).send({ error: 'Không tìm thấy bài giảng.' });
      }
      if (current.status === 'published') {
        return reply.code(403).send({ error: 'Bài đã được admin duyệt.' });
      }
      if (current.status !== 'draft' && current.status !== 'rejected') {
        return reply.code(409).send({ error: 'Bài học không ở trạng thái có thể gửi duyệt.' });
      }
      if (current.updated_at !== expectedUpdatedAt) {
        return reply.code(409).send({ error: 'Bài học đã thay đổi. Tải lại trước khi gửi duyệt.' });
      }

      const { data: lesson, error: submitError } = await supabase
        .from('lessons')
        .update({
          title_en: titleEn,
          title_vi: titleVi,
          blocks: parsedBlocks.data,
          status: 'pending_review',
          review_note: null,
          reviewed_by: null,
          reviewed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('updated_at', current.updated_at)
        .select('*')
        .maybeSingle();

      if (submitError) {
        request.log.error({ err: submitError, lessonId: id }, 'Failed to submit lesson for review');
        return reply.code(500).send({ error: 'Không gửi được bài vào hàng chờ duyệt.' });
      }
      if (!lesson) return reply.code(409).send({ error: 'Bài học vừa được cập nhật. Tải lại trước khi gửi.' });

      return reply.send({ lesson });
    },
  });

  app.patch('/api/authoring/lessons/:id/review', {
    preHandler: [verifyAdmin],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });

      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      if (body.decision !== 'approve' && body.decision !== 'reject') {
        return reply.code(400).send({ error: 'Lựa chọn duyệt bài không hợp lệ.' });
      }
      const note = body.note === undefined ? undefined : asText(body.note, 1000);
      if (body.note !== undefined && body.note !== '' && !note) {
        return reply.code(400).send({ error: 'Ghi chú duyệt bài tối đa 1000 ký tự.' });
      }
      const expectedUpdatedAt = asText(body.expected_updated_at, 64);
      if (!expectedUpdatedAt) {
        return reply.code(400).send({ error: 'Thiếu phiên bản bài học cần duyệt.' });
      }

      const { data: current, error: readError } = await supabase
        .from('lessons')
        .select('id, status, updated_at')
        .eq('id', id)
        .maybeSingle();
      if (readError) {
        request.log.error({ err: readError, lessonId: id }, 'Failed to check lesson review status');
        return reply.code(500).send({ error: 'Không xác minh được trạng thái bài học.' });
      }
      if (!current) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.' });
      if (current.status !== 'pending_review') {
        return reply.code(409).send({ error: 'Bài giảng không còn ở trạng thái chờ duyệt.' });
      }
      if (current.updated_at !== expectedUpdatedAt) {
        return reply.code(409).send({ error: 'Bài học đã thay đổi sau khi bạn mở. Tải lại trước khi duyệt.' });
      }

      const approved = body.decision === 'approve';
      const now = new Date().toISOString();
      const { data: lesson, error: updateError } = await supabase
        .from('lessons')
        .update({
          status: approved ? 'published' : 'rejected',
          review_note: approved ? null : note ?? null,
          published_at: approved ? now : null,
          reviewed_by: user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', id)
        .eq('status', 'pending_review')
        .eq('updated_at', current.updated_at)
        .select('*')
        .maybeSingle();

      if (updateError) {
        request.log.error({ err: updateError, lessonId: id }, 'Failed to review lesson');
        return reply.code(500).send({ error: 'Không lưu được kết quả duyệt bài.' });
      }
      if (!lesson) return reply.code(409).send({ error: 'Bài giảng vừa được người khác duyệt.' });

      return reply.send({ lesson });
    },
  });

  app.patch('/api/authoring/lessons/:id', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });

      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;
      const isAdmin = user.app_metadata?.app_role === 'admin';
      const expectedUpdatedAt = asText(body.expected_updated_at, 64);
      if (!expectedUpdatedAt) {
        return reply.code(400).send({ error: 'Thiếu phiên bản bài học cần lưu.' });
      }
      const { data: current, error: readError } = await supabase
        .from('lessons')
        .select('id, created_by, status, updated_at')
        .eq('id', id)
        .maybeSingle();

      if (readError) {
        request.log.error({ err: readError, lessonId: id }, 'Failed to check lesson edit permission');
        return reply.code(500).send({ error: 'Không xác minh được quyền chỉnh sửa bài học.' });
      }
      if (!current) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.' });
      if (current.updated_at !== expectedUpdatedAt) {
        return reply.code(409).send({ error: 'Bài học đã thay đổi. Tải lại trước khi lưu tiếp.' });
      }
      if (current.status === 'pending_review') {
        return reply.code(409).send({ error: 'Bài đang chờ admin duyệt nên tạm khóa chỉnh sửa.' });
      }
      if (!isAdmin && current.created_by !== user.id) {
        return reply.code(404).send({ error: 'Không tìm thấy bài giảng.' });
      }
      if (!isAdmin && current.status === 'published') {
        return reply.code(403).send({ error: 'Bài đã được duyệt; chỉ admin mới có thể chỉnh sửa.' });
      }
      if (body.published !== undefined) {
        return reply.code(400).send({ error: 'Trường published đã ngừng dùng; hãy gửi status.' });
      }
      if (!isAdmin && body.status !== undefined) {
        return reply.code(403).send({ error: 'Giáo viên không có quyền xuất bản bài học.' });
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.title_en !== undefined) {
        const titleEn = asText(body.title_en, 200);
        if (!titleEn) return reply.code(400).send({ error: 'Tiêu đề tiếng Anh không hợp lệ.' });
        updateData.title_en = titleEn;
      }
      if (body.title_vi !== undefined) {
        const titleVi = asText(body.title_vi, 200);
        if (!titleVi) return reply.code(400).send({ error: 'Tiêu đề tiếng Việt không hợp lệ.' });
        updateData.title_vi = titleVi;
      }
      if (body.blocks !== undefined) {
        const parsedBlocks = BlockSchema.array().safeParse(body.blocks);
        if (!parsedBlocks.success) {
          return reply.code(400).send({ error: 'Nội dung có khối không đúng định dạng.' });
        }
        updateData.blocks = parsedBlocks.data;
      }
      if (isAdmin && body.status !== undefined) {
        if (body.status !== 'draft' && body.status !== 'published') {
          return reply.code(400).send({ error: 'Admin chỉ có thể đặt trạng thái draft hoặc published.' });
        }
        updateData.status = body.status;
        if (body.status === 'published') {
          updateData.published_at = updateData.updated_at;
          updateData.reviewed_by = user.id;
          updateData.reviewed_at = updateData.updated_at;
          updateData.review_note = null;
        } else {
          updateData.published_at = null;
        }
      }
      if (Object.keys(updateData).length === 1) {
        return reply.code(400).send({ error: 'Không có thay đổi để lưu.' });
      }
      const { data: lesson, error } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('id', id)
        .eq('updated_at', current.updated_at)
        .select('*')
        .maybeSingle();

      if (error) {
        request.log.error({ err: error, lessonId: id }, 'Failed to update lesson');
        return reply.code(500).send({ error: 'Không lưu được bài giảng.' });
      }
      if (!lesson) return reply.code(409).send({ error: 'Bài học vừa được cập nhật. Tải lại trước khi lưu tiếp.' });

      return reply.send({ lesson });
    },
  });
};
