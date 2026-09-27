import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import {
  QUESTION_STATUSES,
  QUESTION_TYPES,
  QUESTION_USAGES,
  questionIncomplete,
  toPublicPracticeQuestion,
  validateQuestionInput,
  type AuthorQuestionInput,
} from '../schemas/questions.js';

// Question bank for authors (Parts 3 and 4). Questions hold answer keys, so the browser never
// reads the table: this API filters by role and sends answers only to the question's author or
// an admin. Teachers see published questions and their own; they edit and delete only their own
// drafts. A practice question is attached to a lesson its author may edit, and moves through
// review with that lesson (database trigger); an exam question has no lesson.

interface QuestionUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

interface QuestionRow {
  id: string;
  usage: string;
  subject_id: string;
  lesson_id: string | null;
  grade: number | null;
  type: string;
  difficulty: number;
  status: string;
  created_by: string | null;
  created_at: string;
  data: unknown;
}

export const QUESTION_PAGE_SIZE = 20;
const MAX_PAGE = 500;
const MAX_SEARCH = 100;
const MAX_IDS = 100;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = 'id, usage, subject_id, lesson_id, grade, type, difficulty, status, created_by, created_at, data';

const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ ngân hàng câu hỏi chưa sẵn sàng.', 'The question bank is not available.');
const notFound = msg('Không tìm thấy câu hỏi.', 'Question not found.');
const conflict = msg('Câu hỏi vừa đổi trạng thái (bài học được gửi hoặc duyệt). Tải lại trước khi lưu.', 'The question changed status meanwhile. Reload before saving.');
const locked = msg('Câu hỏi đã gửi duyệt hoặc đã duyệt; chỉ admin mới sửa hoặc xóa được.', 'This question is under review or published; only an admin can change it.');

function getUser(request: FastifyRequest): QuestionUser | undefined {
  return (request as FastifyRequest & { user?: QuestionUser }).user;
}

const isAdmin = (user: QuestionUser) => user.app_metadata?.app_role === 'admin';
const isAuthor = (user: QuestionUser, row: Pick<QuestionRow, 'created_by'>) => !!user.id && row.created_by === user.id;
/** Teachers change only their own drafts; admins change anything. */
const mayEdit = (user: QuestionUser, row: Pick<QuestionRow, 'created_by' | 'status'>) => isAdmin(user) || (isAuthor(user, row) && row.status === 'draft');

/** A row for an author: answers only for its author or an admin. */
function present(row: QuestionRow, user: QuestionUser) {
  const withAnswers = isAdmin(user) || isAuthor(user, row);
  return {
    id: row.id,
    usage: row.usage,
    subject_id: row.subject_id,
    lesson_id: row.lesson_id,
    grade: row.grade,
    type: row.type,
    difficulty: row.difficulty,
    status: row.status,
    created_at: row.created_at,
    mine: isAuthor(user, row),
    editable: mayEdit(user, row),
    data: withAnswers ? row.data : toPublicPracticeQuestion(row).data,
  };
}

type Failure = { status: 400 | 403 | 404 | 409 | 500; body: { error: string; error_en: string } };
type LessonRef = { id: string; subject_id: string; created_by: string | null; status: string };

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

function one(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export const questionRoutes: FastifyPluginAsync = async (app) => {
  const requireAuthor = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    const role = user?.app_metadata?.app_role;
    if (!user?.id || (role !== 'teacher' && role !== 'admin')) {
      return reply.code(403).send(msg('Chỉ giáo viên và admin mới dùng được ngân hàng câu hỏi.', 'Only teachers and admins can use the question bank.'));
    }
  };

  /**
   * The lesson a practice question is attached to: same subject, and one the user may edit
   * (a teacher: their own draft or rejected lesson; an admin: any lesson not under review).
   */
  async function editableLesson(request: FastifyRequest, user: QuestionUser, input: AuthorQuestionInput): Promise<Failure | { lesson: LessonRef }> {
    const { data, error } = await app.supabase!.from('lessons').select('id, subject_id, created_by, status').eq('id', input.lesson_id!).maybeSingle();
    if (error) {
      request.log.error({ err: error, lessonId: input.lesson_id }, 'Failed to check the question lesson');
      return { status: 500, body: msg('Không kiểm tra được bài học của câu hỏi.', 'Could not check the lesson.') };
    }
    const lesson = data as LessonRef | null;
    if (!lesson || (!isAdmin(user) && lesson.created_by !== user.id)) {
      return { status: 404, body: msg('Không tìm thấy bài học của câu hỏi.', 'Lesson not found.') };
    }
    if (lesson.subject_id !== input.subject_id) {
      return { status: 400, body: msg('Câu hỏi phải cùng môn với bài học.', 'The question must match the lesson’s subject.') };
    }
    const editable = isAdmin(user) ? lesson.status !== 'pending_review' : lesson.status === 'draft' || lesson.status === 'rejected';
    if (!editable) {
      return { status: 409, body: msg('Bài học đang chờ duyệt hoặc đã duyệt nên không thêm câu hỏi được.', 'The lesson is under review or published, so questions cannot be added.') };
    }
    return { lesson };
  }

  app.get('/api/authoring/questions', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request)!;
      if (!supabase) return reply.code(503).send(unavailable);
      const q = (request.query ?? {}) as Record<string, unknown>;
      const bad = msg('Bộ lọc câu hỏi không hợp lệ.', 'Invalid question filter.');

      const usage = one(q.usage);
      if (!usage || !(QUESTION_USAGES as readonly string[]).includes(usage)) return reply.code(400).send(bad);
      for (const key of ['subject_id', 'lesson_id'] as const) {
        if (q[key] !== undefined && !ID.test(one(q[key]) ?? '')) return reply.code(400).send(bad);
      }
      if (q.type !== undefined && !(QUESTION_TYPES as readonly string[]).includes(one(q.type) ?? '')) return reply.code(400).send(bad);
      if (q.status !== undefined && !(QUESTION_STATUSES as readonly string[]).includes(one(q.status) ?? '')) return reply.code(400).send(bad);
      const difficulty = q.difficulty === undefined ? undefined : Number(q.difficulty);
      if (difficulty !== undefined && ![1, 2, 3].includes(difficulty)) return reply.code(400).send(bad);
      const grade = q.grade === undefined ? undefined : Number(q.grade);
      if (grade !== undefined && !(Number.isInteger(grade) && grade >= 1 && grade <= 12)) return reply.code(400).send(bad);
      const search = one(q.q)?.trim() ?? '';
      if (search.length > MAX_SEARCH) return reply.code(400).send(bad);
      const ids = q.ids === undefined ? undefined : (one(q.ids) ?? '').split(',').filter(Boolean);
      if (ids !== undefined && (ids.length === 0 || ids.length > MAX_IDS || !ids.every((id) => ID.test(id)))) return reply.code(400).send(bad);
      const page = q.page === undefined ? 1 : Number(q.page);
      if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) return reply.code(400).send(bad);

      let query = supabase.from('questions').select(COLUMNS, { count: 'exact' }).eq('usage', usage);
      if (!isAdmin(user)) query = query.or(`status.eq.published,created_by.eq.${user.id}`);
      if (q.subject_id !== undefined) query = query.eq('subject_id', q.subject_id as string);
      if (q.lesson_id !== undefined) query = query.eq('lesson_id', q.lesson_id as string);
      if (q.type !== undefined) query = query.eq('type', q.type as string);
      if (q.status !== undefined) query = query.eq('status', q.status as string);
      if (difficulty !== undefined) query = query.eq('difficulty', difficulty);
      if (grade !== undefined) query = query.eq('grade', grade);
      if (ids !== undefined) query = query.in('id', ids);
      if (search) query = query.ilike('data->stem->>vi', `%${escapeLike(search)}%`);
      // A lookup by ids (the lesson editor) gets all of them at once; a search is paged.
      const size = ids !== undefined ? ids.length : QUESTION_PAGE_SIZE;
      const from = ids !== undefined ? 0 : (page - 1) * QUESTION_PAGE_SIZE;
      const { data, error, count } = (await query.order('created_at', { ascending: false }).range(from, from + size - 1)) as {
        data: QuestionRow[] | null;
        error: unknown;
        count?: number | null;
      };
      if (error) {
        request.log.error({ err: error }, 'Failed to list questions');
        return reply.code(500).send(msg('Không tải được danh sách câu hỏi.', 'Could not load the questions.'));
      }
      const rows = data ?? [];
      return reply.send({ questions: rows.map((row) => present(row, user)), page, page_size: size, total: count ?? rows.length });
    },
  });

  app.post('/api/authoring/questions', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request)!;
      if (!supabase) return reply.code(503).send(unavailable);
      const checked = validateQuestionInput(request.body);
      if (!checked.ok) return reply.code(400).send(msg(checked.message.vi, checked.message.en));
      const input = checked.value;

      let status = 'draft';
      if (input.usage === 'practice') {
        if (!input.lesson_id) return reply.code(400).send(msg('Câu tự luyện cần thuộc một bài học.', 'A practice question needs a lesson.'));
        const found = await editableLesson(request, user, input);
        if ('status' in found) return reply.code(found.status).send(found.body);
        // An admin adding to a published lesson publishes the question with it, complete.
        if (found.lesson.status === 'published') {
          const missing = questionIncomplete(input);
          if (missing) return reply.code(400).send(msg(missing.vi, missing.en));
          status = 'published';
        }
      } else if (input.lesson_id) {
        return reply.code(400).send(msg('Câu hỏi đề thi không thuộc bài học nào.', 'Exam questions do not belong to a lesson.'));
      }

      const { data, error } = await supabase
        .from('questions')
        .insert({
          usage: input.usage,
          subject_id: input.subject_id,
          lesson_id: input.lesson_id ?? null,
          grade: input.grade ?? null,
          type: input.type,
          difficulty: input.difficulty,
          data: input.data,
          status,
          created_by: user.id,
        })
        .select(COLUMNS)
        .single();
      if (error) {
        request.log.error({ err: error }, 'Failed to create question');
        if ((error as { code?: string }).code === '23503') return reply.code(400).send(msg('Môn học hoặc bài học không tồn tại.', 'The subject or lesson does not exist.'));
        return reply.code(500).send(msg('Không lưu được câu hỏi.', 'Could not save the question.'));
      }
      return reply.code(201).send({ question: present(data as QuestionRow, user) });
    },
  });

  /** The question behind :id, if this user may change it. */
  async function loadForChange(request: FastifyRequest, user: QuestionUser): Promise<Failure | { row: QuestionRow }> {
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return { status: 404, body: notFound };
    const { data, error } = await app.supabase!.from('questions').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) {
      request.log.error({ err: error, questionId: id }, 'Failed to read question');
      return { status: 500, body: msg('Không đọc được câu hỏi.', 'Could not read the question.') };
    }
    const row = data as QuestionRow | null;
    // Another teacher's question is invisible to change: "not found", like lessons.
    if (!row || (!isAdmin(user) && !isAuthor(user, row))) return { status: 404, body: notFound };
    if (!mayEdit(user, row)) return { status: 403, body: locked };
    return { row };
  }

  app.patch('/api/authoring/questions/:id', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request)!;
      if (!supabase) return reply.code(503).send(unavailable);
      const found = await loadForChange(request, user);
      if ('status' in found) return reply.code(found.status).send(found.body);
      const { row } = found;

      const checked = validateQuestionInput(request.body);
      if (!checked.ok) return reply.code(400).send(msg(checked.message.vi, checked.message.en));
      const input = checked.value;
      if (input.usage !== row.usage || input.subject_id !== row.subject_id || (input.lesson_id ?? null) !== row.lesson_id) {
        return reply.code(400).send(msg('Không đổi được loại câu hỏi, môn học hay bài học của câu hỏi.', 'A question’s pool, subject and lesson cannot change.'));
      }
      if (row.status !== 'draft') {
        const missing = questionIncomplete(input);
        if (missing) return reply.code(400).send(msg(missing.vi, missing.en));
      }

      const { data, error } = await supabase
        .from('questions')
        .update({ type: input.type, difficulty: input.difficulty, grade: input.grade ?? null, data: input.data })
        .eq('id', row.id)
        .eq('status', row.status)
        .select(COLUMNS)
        .maybeSingle();
      if (error) {
        request.log.error({ err: error, questionId: row.id }, 'Failed to update question');
        return reply.code(500).send(msg('Không lưu được câu hỏi.', 'Could not save the question.'));
      }
      if (!data) return reply.code(409).send(conflict);
      return reply.send({ question: present(data as QuestionRow, user) });
    },
  });

  app.delete('/api/authoring/questions/:id', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request)!;
      if (!supabase) return reply.code(503).send(unavailable);
      const found = await loadForChange(request, user);
      if ('status' in found) return reply.code(found.status).send(found.body);
      const { row } = found;

      // A lesson or exam that still lists the question would break: remove it there first.
      const [lessons, exams] = await Promise.all([
        // blocks is jsonb: the filter must be JSON (a JS array becomes a Postgres array literal).
        supabase.from('lessons').select('id').contains('blocks', JSON.stringify([{ type: 'quiz', question_id: row.id }])).limit(1),
        supabase.from('exam_blueprints').select('id').contains('question_ids', [row.id]).limit(1),
      ]);
      const usedError = lessons.error ?? exams.error;
      if (usedError) {
        request.log.error({ err: usedError, questionId: row.id }, 'Failed to check question use');
        return reply.code(500).send(msg('Không kiểm tra được nơi dùng câu hỏi.', 'Could not check where the question is used.'));
      }
      if ((lessons.data ?? []).length > 0 || (exams.data ?? []).length > 0) {
        return reply.code(409).send(msg('Câu hỏi đang được dùng trong bài học hoặc đề thi. Gỡ nó ra trước khi xóa.', 'A lesson or exam still uses this question. Remove it there first.'));
      }

      const { data, error } = await supabase.from('questions').delete().eq('id', row.id).eq('status', row.status).select('id').maybeSingle();
      if (error) {
        request.log.error({ err: error, questionId: row.id }, 'Failed to delete question');
        return reply.code(500).send(msg('Không xóa được câu hỏi.', 'Could not delete the question.'));
      }
      if (!data) return reply.code(409).send(conflict);
      return reply.code(204).send();
    },
  });
};
