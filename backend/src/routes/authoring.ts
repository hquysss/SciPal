import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { BlockSchema } from '../schemas/blocks.js';
import { blockFailure, imageIssues, schemaIssues, simulationIssues } from '../schemas/blockIssues.js';
import { validateQuizReferences } from '../authoring/quizReferences.js';
import { makeSlug, planNewTopic, toSubjectOptions, type ExistingTopic, type SubjectCatalogRow } from '../authoring/topicPlanning.js';

interface AuthoringUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

// `*` includes the delete-request columns once their migration has run, and still works before.
const LESSON_LIST_COLUMNS = '*, subjects(slug, name_en, name_vi), topics(name_en, name_vi)';

const DELETE_REQUEST_NOTE_MAX = 1000;
const lessonNotFound = { error: 'Không tìm thấy bài giảng.' };

interface LessonDeleteState {
  id: string;
  created_by: string | null;
  status: string;
  published_at: string | null;
  delete_requested_at?: string | null;
}

/** A teacher may delete their own lesson only while students have never seen it. */
export function teacherCanDeleteDirectly(lesson: Pick<LessonDeleteState, 'status' | 'published_at'>): boolean {
  return (lesson.status === 'draft' || lesson.status === 'rejected') && !lesson.published_at;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// lessons.id is a uuid: any other path id is "not found", not a database error.
const LESSON_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      return reply.code(403).send({ error: 'Chỉ giáo viên mới có quyền quản lý bài học.', error_en: 'Only teachers can manage lessons.' });
    }
  };

  // Admins publish their own lessons directly, so only teachers submit for review.
  const verifyTeacherOnly = async (request: FastifyRequest, reply: FastifyReply) => {
    if (getUser(request)?.app_metadata?.app_role !== 'teacher') {
      return reply.code(403).send({ error: 'Chỉ giáo viên mới gửi bài vào hàng chờ duyệt.', error_en: 'Only teachers can send lessons for review.' });
    }
  };

  const verifyAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (getUser(request)?.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send({ error: 'Chỉ admin mới có quyền duyệt bài.', error_en: 'Only admins can review lessons.' });
    }
  };

  app.get('/api/authoring/options', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }

      const [
        { data: subjects, error: subjectsError },
        { data: topics, error: topicsError },
        { data: tracks, error: tracksError },
      ] = await Promise.all([
        supabase
          .from('subjects')
          .select('id, slug, name_en, name_vi, sort_order, subject_grade_catalog(grade, active)')
          .order('sort_order'),
        supabase
          .from('topics')
          .select('id, subject_id, grade, name_en, name_vi, sort_order')
          .order('sort_order'),
        supabase
          .from('subject_tracks')
          .select('id, subject_id, slug, name_en, name_vi, grades')
          .order('sort_order'),
      ]);

      const loadError = subjectsError ?? topicsError ?? tracksError;
      if (loadError) {
        request.log.error({ err: loadError }, 'Failed to load authoring options');
        return reply.code(500).send({ error: 'Không tải được danh sách môn học và chủ đề.', error_en: 'Could not load subjects and topics.' });
      }

      return reply.send({
        subjects: toSubjectOptions((subjects ?? []) as SubjectCatalogRow[]),
        topics: topics ?? [],
        tracks: tracks ?? [],
      });
    },
  });

  app.post('/api/authoring/topics', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      const body = (request.body ?? {}) as Record<string, unknown>;
      const subjectId = asText(body.subject_id, 64);
      const grade = Number(body.grade);
      const nameEn = asText(body.name_en, 200);
      const nameVi = asText(body.name_vi, 200);
      const sortOrder = body.sort_order === undefined ? undefined : Number(body.sort_order);

      if (!subjectId || !UUID_PATTERN.test(subjectId)) {
        return reply.code(400).send({ error: 'Vui lòng chọn môn học hợp lệ.', error_en: 'Choose a valid subject.' });
      }
      if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
        return reply.code(400).send({ error: 'Vui lòng chọn lớp (1–12).', error_en: 'Choose a grade (1–12).' });
      }
      if (!nameEn || !nameVi) {
        return reply.code(400).send({ error: 'Vui lòng nhập tên chủ đề tiếng Việt và tiếng Anh (tối đa 200 ký tự).', error_en: 'Enter the topic name in Vietnamese and English (up to 200 characters).' });
      }
      if (sortOrder !== undefined && (!Number.isInteger(sortOrder) || sortOrder < 0)) {
        return reply.code(400).send({ error: 'Thứ tự chủ đề không hợp lệ.', error_en: 'The topic order is not valid.' });
      }

      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', subjectId)
        .maybeSingle();
      if (subjectError) {
        request.log.error({ err: subjectError, subjectId }, 'Failed to verify topic subject');
        return reply.code(500).send({ error: 'Không xác minh được môn học đã chọn.', error_en: 'Could not check the chosen subject.' });
      }
      if (!subject) return reply.code(400).send({ error: 'Môn học đã chọn không tồn tại.', error_en: 'The chosen subject does not exist.' });

      const { data: catalogRow, error: catalogError } = await supabase
        .from('subject_grade_catalog')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('grade', grade)
        .eq('active', true)
        .limit(1)
        .maybeSingle();
      if (catalogError) {
        request.log.error({ err: catalogError, subjectId, grade }, 'Failed to check subject catalog');
        return reply.code(500).send({ error: 'Không xác minh được lớp của môn học.', error_en: 'Could not check the subject grades.' });
      }
      if (!catalogRow) {
        return reply.code(400).send({ error: 'Lớp này không thuộc chương trình của môn đã chọn.', error_en: 'This grade is not part of the chosen subject curriculum.' });
      }

      const { data: existing, error: existingError } = await supabase
        .from('topics')
        .select('id, slug, grade, name_en, name_vi, sort_order')
        .eq('subject_id', subjectId);
      if (existingError) {
        request.log.error({ err: existingError, subjectId }, 'Failed to list subject topics');
        return reply.code(500).send({ error: 'Không kiểm tra được chủ đề hiện có.', error_en: 'Could not check the existing topics.' });
      }

      const plan = planNewTopic((existing ?? []) as ExistingTopic[], { grade, name_en: nameEn, name_vi: nameVi });
      if (plan.kind === 'duplicate') {
        return reply.code(409).send({ error: 'Chủ đề này đã có.', error_en: 'This topic already exists.', topic: plan.topic });
      }

      const { data: topic, error: insertError } = await supabase
        .from('topics')
        .insert({
          subject_id: subjectId,
          grade,
          kind: 'core',
          slug: plan.slug,
          name_en: nameEn,
          name_vi: nameVi,
          sort_order: sortOrder ?? plan.sort_order,
        })
        .select('id, subject_id, grade, name_en, name_vi, sort_order')
        .single();
      if (insertError) {
        request.log.error({ err: insertError, subjectId }, 'Failed to create topic');
        if (insertError.code === '23505') return reply.code(409).send({ error: 'Chủ đề này đã có.', error_en: 'This topic already exists.' });
        return reply.code(500).send({ error: 'Không tạo được chủ đề.', error_en: 'Could not create the topic.' });
      }

      return reply.code(201).send({ topic });
    },
  });

  app.get('/api/authoring/lessons', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      let query = supabase
        .from('lessons')
        .select(LESSON_LIST_COLUMNS)
        .order('updated_at', { ascending: false });
      if (user.app_metadata?.app_role !== 'admin') query = query.eq('created_by', user.id);

      const { data, error } = await query;
      if (error) {
        request.log.error({ err: error }, 'Failed to list authoring lessons');
        return reply.code(500).send({ error: 'Không tải được danh sách bài giảng.', error_en: 'Could not load the lessons.' });
      }

      return reply.send({ lessons: (data ?? []).map((row) => withRelations(row as Record<string, any>)) });
    },
  });

  app.get('/api/authoring/reviews', {
    preHandler: [verifyAdmin],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }

      const { data, error } = await supabase
        .from('lessons')
        .select(LESSON_LIST_COLUMNS)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true });

      if (error) {
        request.log.error({ err: error }, 'Failed to list lessons for review');
        return reply.code(500).send({ error: 'Không tải được hàng chờ duyệt.', error_en: 'Could not load the review queue.' });
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
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      const { id } = request.params as { id: string };
      if (!LESSON_ID_PATTERN.test(id)) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      const { data, error } = await supabase
        .from('lessons')
        .select('*, subjects(slug, name_en, name_vi), topics(name_en, name_vi)')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        request.log.error({ err: error, lessonId: id }, 'Failed to read authoring lesson');
        return reply.code(500).send({ error: 'Không tải được bài giảng.', error_en: 'Could not load the lesson.' });
      }
      if (!data) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      if (user.app_metadata?.app_role !== 'admin' && data.created_by !== user.id) {
        return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      }

      return reply.send({ lesson: withRelations(data as Record<string, any>) });
    },
  });

  app.post('/api/authoring/lessons', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      const body = (request.body ?? {}) as Record<string, unknown>;
      const titleEn = asText(body.title_en, 200);
      const titleVi = asText(body.title_vi, 200);
      const topicId = asText(body.topic_id, 64);
      const grade = body.grade === undefined || body.grade === null ? NaN : Number(body.grade);
      const trackId = body.track_id === undefined || body.track_id === null ? undefined : asText(body.track_id, 64);

      if (!titleEn || !titleVi) {
        return reply.code(400).send({ error: 'Vui lòng nhập tiêu đề tiếng Việt và tiếng Anh (tối đa 200 ký tự).', error_en: 'Enter a Vietnamese and an English title (up to 200 characters).' });
      }
      if (!topicId || !UUID_PATTERN.test(topicId)) {
        return reply.code(400).send({ error: 'Vui lòng chọn chủ đề hợp lệ cho bài học.', error_en: 'Choose a valid topic for the lesson.' });
      }
      if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
        return reply.code(400).send({ error: 'Vui lòng chọn lớp (1–12).', error_en: 'Choose a grade (1–12).' });
      }
      if (body.track_id !== undefined && body.track_id !== null && (!trackId || !UUID_PATTERN.test(trackId))) {
        return reply.code(400).send({ error: 'Định hướng không hợp lệ.', error_en: 'The track is not valid.' });
      }

      const { data: topic, error: topicError } = await supabase
        .from('topics')
        .select('id, subject_id, grade')
        .eq('id', topicId)
        .maybeSingle();

      if (topicError) {
        request.log.error({ err: topicError, topicId }, 'Failed to find lesson topic');
        return reply.code(500).send({ error: 'Không xác minh được chủ đề đã chọn.', error_en: 'Could not check the chosen topic.' });
      }
      if (!topic) return reply.code(400).send({ error: 'Chủ đề đã chọn không tồn tại.', error_en: 'The chosen topic does not exist.' });
      if (topic.grade !== null && topic.grade !== undefined && topic.grade !== grade) {
        return reply.code(400).send({ error: 'Lớp của bài phải trùng lớp của chủ đề.', error_en: 'The lesson grade must match the topic grade.' });
      }

      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', topic.subject_id)
        .maybeSingle();

      if (subjectError) {
        request.log.error({ err: subjectError, subjectId: topic.subject_id }, 'Failed to verify lesson subject');
        return reply.code(500).send({ error: 'Không xác minh được môn học đã chọn.', error_en: 'Could not check the chosen subject.' });
      }
      if (!subject) return reply.code(400).send({ error: 'Môn học đã chọn không tồn tại.', error_en: 'The chosen subject does not exist.' });

      const { data: catalogRow, error: catalogError } = await supabase
        .from('subject_grade_catalog')
        .select('id')
        .eq('subject_id', subject.id)
        .eq('grade', grade)
        .eq('active', true)
        .limit(1)
        .maybeSingle();
      if (catalogError) {
        request.log.error({ err: catalogError, subjectId: subject.id, grade }, 'Failed to check subject catalog');
        return reply.code(500).send({ error: 'Không xác minh được lớp của môn học.', error_en: 'Could not check the subject grades.' });
      }
      if (!catalogRow) {
        return reply.code(400).send({ error: 'Lớp này không thuộc chương trình của môn đã chọn.', error_en: 'This grade is not part of the chosen subject curriculum.' });
      }

      if (trackId) {
        const { data: track, error: trackError } = await supabase
          .from('subject_tracks')
          .select('id, subject_id, grades')
          .eq('id', trackId)
          .maybeSingle();
        if (trackError) {
          request.log.error({ err: trackError, trackId }, 'Failed to verify lesson track');
          return reply.code(500).send({ error: 'Không xác minh được định hướng đã chọn.', error_en: 'Could not check the chosen track.' });
        }
        const grades = Array.isArray(track?.grades) ? (track.grades as number[]) : [];
        if (!track || track.subject_id !== subject.id || !grades.includes(grade)) {
          return reply.code(400).send({ error: 'Định hướng không thuộc môn và lớp đã chọn.', error_en: 'The track does not belong to the chosen subject and grade.' });
        }
      }

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
          return reply.code(500).send({ error: 'Không tạo được đường dẫn cho bài học.', error_en: 'Could not create a link for the lesson.' });
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
          track_id: trackId ?? null,
          blocks: [],
          status: 'draft',
          created_by: user.id,
        })
        .select('*')
        .single();

      if (insertError) {
        request.log.error({ err: insertError, topicId }, 'Failed to create lesson');
        if (insertError.code === '23505') {
          return reply.code(409).send({ error: 'Tên bài học này vừa được sử dụng. Hãy thử đổi tiêu đề tiếng Anh.', error_en: 'This lesson name was just taken. Try changing the English title.' });
        }
        return reply.code(500).send({ error: 'Không tạo được bài học.', error_en: 'Could not create the lesson.' });
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
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      const { id } = request.params as { id: string };
      if (!LESSON_ID_PATTERN.test(id)) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      const body = (request.body ?? {}) as Record<string, unknown>;
      const titleEn = asText(body.title_en, 200);
      const titleVi = asText(body.title_vi, 200);
      const expectedUpdatedAt = asText(body.expected_updated_at, 64);
      const parsedBlocks = BlockSchema.array().safeParse(body.blocks);

      if (!titleEn || !titleVi) {
        return reply.code(400).send({ error: 'Vui lòng nhập tiêu đề tiếng Việt và tiếng Anh hợp lệ.', error_en: 'Enter a valid Vietnamese and English title.' });
      }
      if (!expectedUpdatedAt) return reply.code(400).send({ error: 'Thiếu phiên bản bài học cần gửi.', error_en: 'The lesson version to send is missing.' });
      if (!Array.isArray(body.blocks) || body.blocks.length === 0) {
        return reply.code(400).send({ error: 'Bài gửi duyệt cần có ít nhất một khối nội dung.', error_en: 'A lesson sent for review needs at least one block.' });
      }
      if (!parsedBlocks.success) return reply.code(400).send(blockFailure(schemaIssues(body.blocks, parsedBlocks.error)));
      const submitIssues = [...imageIssues(parsedBlocks.data, { requireAlt: true }), ...simulationIssues(parsedBlocks.data)];
      if (submitIssues.length) return reply.code(400).send(blockFailure(submitIssues));

      const { data: current, error: readError } = await supabase
        .from('lessons')
        .select('id, subject_id, created_by, status, updated_at')
        .eq('id', id)
        .maybeSingle();

      if (readError) {
        request.log.error({ err: readError, lessonId: id }, 'Failed to check lesson submission');
        return reply.code(500).send({ error: 'Không xác minh được quyền gửi bài.', error_en: 'Could not check your permission to send this lesson.' });
      }
      if (!current) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });

      if (current.created_by !== user.id) {
        return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      }
      if (current.status === 'published') {
        return reply.code(403).send({ error: 'Bài đã được admin duyệt.', error_en: 'An admin has already approved this lesson.' });
      }
      if (current.status !== 'draft' && current.status !== 'rejected') {
        return reply.code(409).send({ error: 'Bài học không ở trạng thái có thể gửi duyệt.', error_en: 'This lesson cannot be sent for review in its current state.' });
      }
      if (current.updated_at !== expectedUpdatedAt) {
        return reply.code(409).send({ error: 'Bài học đã thay đổi. Tải lại trước khi gửi duyệt.', error_en: 'The lesson has changed. Reload before sending it for review.' });
      }
      const quizProblem = await validateQuizReferences(supabase, parsedBlocks.data, current, 'review');
      if (quizProblem) return reply.code(quizProblem.status).send(quizProblem.body);

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
        return reply.code(500).send({ error: 'Không gửi được bài vào hàng chờ duyệt.', error_en: 'Could not send the lesson for review.' });
      }
      if (!lesson) return reply.code(409).send({ error: 'Bài học vừa được cập nhật. Tải lại trước khi gửi.', error_en: 'The lesson was just updated. Reload before sending it.' });

      return reply.send({ lesson });
    },
  });

  app.patch('/api/authoring/lessons/:id/review', {
    preHandler: [verifyAdmin],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      const { id } = request.params as { id: string };
      if (!LESSON_ID_PATTERN.test(id)) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      const body = (request.body ?? {}) as Record<string, unknown>;
      if (body.decision !== 'approve' && body.decision !== 'reject') {
        return reply.code(400).send({ error: 'Lựa chọn duyệt bài không hợp lệ.', error_en: 'The review decision is not valid.' });
      }
      const note = body.note === undefined ? undefined : asText(body.note, 1000);
      if (body.note !== undefined && body.note !== '' && !note) {
        return reply.code(400).send({ error: 'Ghi chú duyệt bài tối đa 1000 ký tự.', error_en: 'The review note can be at most 1000 characters.' });
      }
      const expectedUpdatedAt = asText(body.expected_updated_at, 64);
      if (!expectedUpdatedAt) {
        return reply.code(400).send({ error: 'Thiếu phiên bản bài học cần duyệt.', error_en: 'The lesson version to review is missing.' });
      }

      const { data: current, error: readError } = await supabase
        .from('lessons')
        .select('id, subject_id, status, updated_at, blocks')
        .eq('id', id)
        .maybeSingle();
      if (readError) {
        request.log.error({ err: readError, lessonId: id }, 'Failed to check lesson review status');
        return reply.code(500).send({ error: 'Không xác minh được trạng thái bài học.', error_en: 'Could not check the lesson status.' });
      }
      if (!current) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      if (current.status !== 'pending_review') {
        return reply.code(409).send({ error: 'Bài giảng không còn ở trạng thái chờ duyệt.', error_en: 'This lesson is no longer waiting for review.' });
      }
      if (current.updated_at !== expectedUpdatedAt) {
        return reply.code(409).send({ error: 'Bài học đã thay đổi sau khi bạn mở. Tải lại trước khi duyệt.', error_en: 'The lesson changed after you opened it. Reload before reviewing.' });
      }

      const approved = body.decision === 'approve';
      // Approving publishes the lesson's attached draft questions: they must still be usable.
      if (approved) {
        const quizProblem = await validateQuizReferences(supabase, current.blocks, current, 'review');
        if (quizProblem) return reply.code(quizProblem.status).send(quizProblem.body);
      }
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
        return reply.code(500).send({ error: 'Không lưu được kết quả duyệt bài.', error_en: 'Could not save the review.' });
      }
      if (!lesson) return reply.code(409).send({ error: 'Bài giảng vừa được người khác duyệt.', error_en: 'Someone else has just reviewed this lesson.' });

      return reply.send({ lesson });
    },
  });

  app.patch('/api/authoring/lessons/:id', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      const { id } = request.params as { id: string };
      if (!LESSON_ID_PATTERN.test(id)) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      const body = (request.body ?? {}) as Record<string, unknown>;
      const isAdmin = user.app_metadata?.app_role === 'admin';
      const expectedUpdatedAt = asText(body.expected_updated_at, 64);
      if (!expectedUpdatedAt) {
        return reply.code(400).send({ error: 'Thiếu phiên bản bài học cần lưu.', error_en: 'The lesson version to save is missing.' });
      }
      const { data: current, error: readError } = await supabase
        .from('lessons')
        .select('id, subject_id, created_by, status, updated_at, blocks')
        .eq('id', id)
        .maybeSingle();

      if (readError) {
        request.log.error({ err: readError, lessonId: id }, 'Failed to check lesson edit permission');
        return reply.code(500).send({ error: 'Không xác minh được quyền chỉnh sửa bài học.', error_en: 'Could not check your permission to edit this lesson.' });
      }
      if (!current) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      if (current.updated_at !== expectedUpdatedAt) {
        return reply.code(409).send({ error: 'Bài học đã thay đổi. Tải lại trước khi lưu tiếp.', error_en: 'The lesson has changed. Reload before saving again.' });
      }
      if (current.status === 'pending_review') {
        return reply.code(409).send({ error: 'Bài đang chờ admin duyệt nên tạm khóa chỉnh sửa.', error_en: 'The lesson is waiting for admin review, so editing is locked for now.' });
      }
      if (!isAdmin && current.created_by !== user.id) {
        return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
      }
      if (!isAdmin && current.status === 'published') {
        return reply.code(403).send({ error: 'Bài đã được duyệt; chỉ admin mới có thể chỉnh sửa.', error_en: 'This lesson is approved; only admins can edit it.' });
      }
      if (body.published !== undefined) {
        return reply.code(400).send({ error: 'Trường published đã ngừng dùng; hãy gửi status.', error_en: 'The published field is retired; send status instead.' });
      }
      if (!isAdmin && body.status !== undefined) {
        return reply.code(403).send({ error: 'Giáo viên không có quyền xuất bản bài học.', error_en: 'Teachers cannot publish lessons.' });
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.title_en !== undefined) {
        const titleEn = asText(body.title_en, 200);
        if (!titleEn) return reply.code(400).send({ error: 'Tiêu đề tiếng Anh không hợp lệ.', error_en: 'The English title is not valid.' });
        updateData.title_en = titleEn;
      }
      if (body.title_vi !== undefined) {
        const titleVi = asText(body.title_vi, 200);
        if (!titleVi) return reply.code(400).send({ error: 'Tiêu đề tiếng Việt không hợp lệ.', error_en: 'The Vietnamese title is not valid.' });
        updateData.title_vi = titleVi;
      }
      if (body.blocks !== undefined) {
        const parsedBlocks = BlockSchema.array().safeParse(body.blocks);
        if (!parsedBlocks.success) return reply.code(400).send(blockFailure(schemaIssues(body.blocks, parsedBlocks.error)));
        // An image may wait for its description in a draft; publishing needs it.
        const found = [
          ...imageIssues(parsedBlocks.data, { requireAlt: isAdmin && body.status === 'published' }),
          ...simulationIssues(parsedBlocks.data),
        ];
        if (found.length) return reply.code(400).send(blockFailure(found));
        updateData.blocks = parsedBlocks.data;
      }
      if (isAdmin && body.status !== undefined) {
        if (body.status !== 'draft' && body.status !== 'published') {
          return reply.code(400).send({ error: 'Admin chỉ có thể đặt trạng thái draft hoặc published.', error_en: 'Admins can only set the status to draft or published.' });
        }
        updateData.status = body.status;
        // Stamp publish metadata only on a transition, so edits keep the original approver.
        if (body.status !== current.status) {
          if (body.status === 'published') {
            updateData.published_at = updateData.updated_at;
            updateData.reviewed_by = user.id;
            updateData.reviewed_at = updateData.updated_at;
            updateData.review_note = null;
          } else {
            updateData.published_at = null;
          }
        }
      }
      if (Object.keys(updateData).length === 1) {
        return reply.code(400).send({ error: 'Không có thay đổi để lưu.', error_en: 'There are no changes to save.' });
      }
      // Practice questions: a published lesson (staying or becoming published) needs complete
      // ones, and one that stays published only published ones.
      const nextStatus = (updateData.status as string | undefined) ?? current.status;
      if (updateData.blocks !== undefined || (nextStatus === 'published' && current.status !== 'published')) {
        const mode = nextStatus !== 'published' ? 'draft' : current.status === 'published' ? 'live' : 'review';
        const quizProblem = await validateQuizReferences(supabase, updateData.blocks ?? current.blocks, current, mode);
        if (quizProblem) return reply.code(quizProblem.status).send(quizProblem.body);
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
        return reply.code(500).send({ error: 'Không lưu được bài giảng.', error_en: 'Could not save the lesson.' });
      }
      if (!lesson) return reply.code(409).send({ error: 'Bài học vừa được cập nhật. Tải lại trước khi lưu tiếp.', error_en: 'The lesson was just updated. Reload before saving again.' });

      return reply.send({ lesson });
    },
  });

  /**
   * Delete a lesson. Admins delete any lesson; a teacher deletes their own lesson only while it
   * was never published (draft or rejected) and asks an admin for the rest. Questions keep
   * living in the pool (their lesson link is cleared); student progress on the lesson goes with it.
   */
  app.delete('/api/authoring/lessons/:id', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      const { id } = request.params as { id: string };
      if (!LESSON_ID_PATTERN.test(id)) return reply.code(404).send(lessonNotFound);
      const isAdmin = user.app_metadata?.app_role === 'admin';

      const { data: current, error: readError } = await supabase
        .from('lessons')
        .select('id, created_by, status, published_at')
        .eq('id', id)
        .maybeSingle();
      if (readError) {
        request.log.error({ err: readError, lessonId: id }, 'Failed to read lesson before delete');
        return reply.code(500).send({ error: 'Không xác minh được bài giảng cần xóa.', error_en: 'Could not check the lesson to delete.' });
      }
      const lesson = current as LessonDeleteState | null;
      if (!lesson || (!isAdmin && lesson.created_by !== user.id)) return reply.code(404).send(lessonNotFound);
      if (!isAdmin && !teacherCanDeleteDirectly(lesson)) {
        return reply.code(403).send({
          error: 'Bài đã xuất bản hoặc đang chờ duyệt nên không tự xóa được. Hãy gửi yêu cầu xóa cho admin.',
        });
      }

      const { error: detachError } = await supabase.from('questions').update({ lesson_id: null }).eq('lesson_id', id);
      if (detachError) {
        request.log.error({ err: detachError, lessonId: id }, 'Failed to detach lesson questions');
        return reply.code(500).send({ error: 'Không xóa được bài giảng.', error_en: 'Could not delete the lesson.' });
      }

      const { error: deleteError } = await supabase.from('lessons').delete().eq('id', id);
      if (deleteError) {
        if (deleteError.code === '23503') {
          return reply.code(409).send({ error: 'Bài đang được giao cho lớp học. Gỡ bài tập khỏi lớp trước khi xóa.', error_en: 'This lesson is assigned to a class. Remove the assignment before deleting it.' });
        }
        request.log.error({ err: deleteError, lessonId: id }, 'Failed to delete lesson');
        return reply.code(500).send({ error: 'Không xóa được bài giảng.', error_en: 'Could not delete the lesson.' });
      }

      return reply.code(204).send();
    },
  });

  // A teacher asks an admin to delete one of their lessons that they cannot delete themselves.
  app.post('/api/authoring/lessons/:id/delete-request', {
    preHandler: [verifyTeacherOnly],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      const { id } = request.params as { id: string };
      if (!LESSON_ID_PATTERN.test(id)) return reply.code(404).send(lessonNotFound);
      const body = (request.body ?? {}) as Record<string, unknown>;
      if (body.note !== undefined && body.note !== null && typeof body.note !== 'string') {
        return reply.code(400).send({ error: 'Lý do xóa không hợp lệ.', error_en: 'The reason for deleting is not valid.' });
      }
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (note.length > DELETE_REQUEST_NOTE_MAX) {
        return reply.code(400).send({ error: `Lý do xóa tối đa ${DELETE_REQUEST_NOTE_MAX} ký tự.`, error_en: `The reason can be at most ${DELETE_REQUEST_NOTE_MAX} characters.` });
      }

      const { data: current, error: readError } = await supabase
        .from('lessons')
        .select('id, created_by, status, published_at, delete_requested_at')
        .eq('id', id)
        .maybeSingle();
      if (readError) {
        request.log.error({ err: readError, lessonId: id }, 'Failed to read lesson for delete request');
        return reply.code(500).send({ error: 'Không gửi được yêu cầu xóa.', error_en: 'Could not send the delete request.' });
      }
      const lesson = current as LessonDeleteState | null;
      if (!lesson || lesson.created_by !== user.id) return reply.code(404).send(lessonNotFound);
      if (teacherCanDeleteDirectly(lesson)) {
        return reply.code(400).send({ error: 'Bài chưa từng xuất bản: bạn có thể tự xóa, không cần gửi yêu cầu.', error_en: 'This lesson was never published: you can delete it yourself without a request.' });
      }
      if (lesson.delete_requested_at) return reply.code(409).send({ error: 'Bạn đã gửi yêu cầu xóa bài này.', error_en: 'You have already asked to delete this lesson.' });

      const requestedAt = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from('lessons')
        .update({ delete_requested_at: requestedAt, delete_requested_by: user.id, delete_request_note: note || null })
        .eq('id', id)
        .is('delete_requested_at', null)
        .select('id, delete_requested_at, delete_request_note')
        .maybeSingle();
      if (updateError) {
        request.log.error({ err: updateError, lessonId: id }, 'Failed to save delete request');
        return reply.code(500).send({ error: 'Không gửi được yêu cầu xóa.', error_en: 'Could not send the delete request.' });
      }
      if (!updated) return reply.code(409).send({ error: 'Bạn đã gửi yêu cầu xóa bài này.', error_en: 'You have already asked to delete this lesson.' });

      return reply.code(201).send({ lesson: updated });
    },
  });

  // Clear a delete request: the teacher withdraws it, or an admin declines it.
  app.delete('/api/authoring/lessons/:id/delete-request', {
    preHandler: [verifyTeacher],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request);
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }
      if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.', error_en: 'Your session is not valid. Sign in again.' });

      const { id } = request.params as { id: string };
      if (!LESSON_ID_PATTERN.test(id)) return reply.code(404).send(lessonNotFound);
      const isAdmin = user.app_metadata?.app_role === 'admin';

      const { data: current, error: readError } = await supabase
        .from('lessons')
        .select('id, created_by, status, published_at, delete_requested_at')
        .eq('id', id)
        .maybeSingle();
      if (readError) {
        request.log.error({ err: readError, lessonId: id }, 'Failed to read lesson delete request');
        return reply.code(500).send({ error: 'Không cập nhật được yêu cầu xóa.', error_en: 'Could not update the delete request.' });
      }
      const lesson = current as LessonDeleteState | null;
      if (!lesson || (!isAdmin && lesson.created_by !== user.id)) return reply.code(404).send(lessonNotFound);
      if (!lesson.delete_requested_at) return reply.code(404).send({ error: 'Bài này không có yêu cầu xóa.', error_en: 'This lesson has no delete request.' });

      const { error: updateError } = await supabase
        .from('lessons')
        .update({ delete_requested_at: null, delete_requested_by: null, delete_request_note: null })
        .eq('id', id);
      if (updateError) {
        request.log.error({ err: updateError, lessonId: id }, 'Failed to clear delete request');
        return reply.code(500).send({ error: 'Không cập nhật được yêu cầu xóa.', error_en: 'Could not update the delete request.' });
      }

      return reply.code(204).send();
    },
  });

  // Admin queue of lessons teachers asked to delete, oldest request first.
  app.get('/api/authoring/delete-requests', {
    preHandler: [verifyAdmin],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      if (!supabase) {
        return reply.code(503).send({ error: 'Dịch vụ lưu trữ bài học chưa sẵn sàng.', error_en: 'Lesson storage is not available yet.' });
      }

      const { data, error } = await supabase
        .from('lessons')
        .select(LESSON_LIST_COLUMNS)
        .not('delete_requested_at', 'is', null)
        .order('delete_requested_at', { ascending: true });
      if (error) {
        request.log.error({ err: error }, 'Failed to list lesson delete requests');
        return reply.code(500).send({ error: 'Không tải được danh sách yêu cầu xóa.', error_en: 'Could not load the delete requests.' });
      }

      return reply.send({ lessons: (data ?? []).map((row) => withRelations(row as Record<string, any>)) });
    },
  });
};
