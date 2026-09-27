import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkExamQuestions } from '../authoring/examQuestions.js';
import { countBlueprintQuestions } from '../exam/blueprintSummary.js';
import { examSections, validateExamInput } from '../schemas/exams.js';

// The exam builder (authoring Part 4). Exams are exam_blueprints rows with an ordered question
// list. Imported exams (import_id) are listed and editable here once published, but go through
// review in the import queue (routes/examImport.ts).

type ExamUser = { id: string; app_metadata?: { app_role?: string } };
type Failure = { status: number; body: { error: string; error_en: string } };

interface ExamRow {
  id: string;
  name: string;
  name_en: string | null;
  subject_id: string;
  grade: number | null;
  duration_minutes: number | null;
  status: string;
  question_ids: string[] | null;
  sections: unknown;
  review_note: string | null;
  updated_at: string;
  created_by: string | null;
  import_id: string | null;
  subjects: { name_vi: string } | Array<{ name_vi: string }> | null;
}

const COLUMNS =
  'id, name, name_en, subject_id, grade, duration_minutes, status, question_ids, sections, review_note, updated_at, created_by, import_id, subjects(name_vi)';
const STATUSES = ['draft', 'pending_review', 'published'];
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const msg = (error: string, error_en: string) => ({ error, error_en });
const unavailable = msg('Dịch vụ đề thi chưa sẵn sàng.', 'The exam service is not available.');
const notFound = msg('Không tìm thấy đề thi.', 'Exam not found.');
const duplicateName = msg('Đã có đề thi tên này.', 'An exam with this name already exists.');
const needEnglish = msg('Cần tên đề tiếng Anh trước khi gửi duyệt hoặc xuất bản.', 'The exam needs an English name before review or publishing.');

const getUser = (request: FastifyRequest) => (request as FastifyRequest & { user?: ExamUser }).user;
export const isAdmin = (user: ExamUser) => user.app_metadata?.app_role === 'admin';

/** A teacher edits their own draft; an admin edits anything not under review. */
export const mayEdit = (user: ExamUser, row: Pick<ExamRow, 'created_by' | 'status'>) =>
  isAdmin(user) ? row.status !== 'pending_review' : row.created_by === user.id && row.status === 'draft';

export function present(row: ExamRow, user: ExamUser) {
  const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
  const ids = Array.isArray(row.question_ids) ? row.question_ids : [];
  return {
    id: row.id,
    name: row.name,
    name_en: row.name_en,
    subject_id: row.subject_id,
    subject_name_vi: subject?.name_vi ?? null,
    grade: row.grade,
    duration_minutes: row.duration_minutes,
    status: row.status,
    question_count: ids.length > 0 ? ids.length : countBlueprintQuestions(row.sections),
    updated_at: row.updated_at,
    created_by: row.created_by,
    imported: row.import_id !== null,
    mine: row.created_by === user.id,
    question_ids: ids,
    review_note: row.review_note,
    editable: mayEdit(user, row),
  };
}

/** The exam behind :id, if this user may see it (a teacher: their own; an admin: any). */
export async function loadExam(supabase: SupabaseClient, request: FastifyRequest, user: ExamUser): Promise<Failure | { row: ExamRow }> {
  const { id } = request.params as { id: string };
  if (!ID.test(id)) return { status: 404, body: notFound };
  const { data, error } = await supabase.from('exam_blueprints').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) {
    request.log.error({ err: error, examId: id }, 'Failed to read exam');
    return { status: 500, body: msg('Không đọc được đề thi.', 'Could not read the exam.') };
  }
  const row = data as ExamRow | null;
  if (!row || (!isAdmin(user) && row.created_by !== user.id)) return { status: 404, body: notFound };
  return { row };
}

export const EXAM_COLUMNS = COLUMNS;
export type { ExamRow, ExamUser };

export const examRoutesAuthoring: FastifyPluginAsync = async (app) => {
  const requireAuthor = async (request: FastifyRequest, reply: FastifyReply) => {
    const role = getUser(request)?.app_metadata?.app_role;
    if (!getUser(request)?.id || (role !== 'teacher' && role !== 'admin')) {
      return reply.code(403).send(msg('Chỉ giáo viên và admin mới soạn được đề thi.', 'Only teachers and admins can build exams.'));
    }
  };
  const writeError = (request: FastifyRequest, reply: FastifyReply, error: { code?: string }, what: string) => {
    if (error.code === '23505') return reply.code(409).send(duplicateName);
    if (error.code === '23503') return reply.code(400).send(msg('Môn học không tồn tại.', 'The subject does not exist.'));
    request.log.error({ err: error }, what);
    return reply.code(500).send(msg('Không lưu được đề thi.', 'Could not save the exam.'));
  };

  app.get('/api/authoring/exams', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request)!;
      if (!supabase) return reply.code(503).send(unavailable);
      const status = (request.query as { status?: unknown } | undefined)?.status;
      if (status !== undefined && (typeof status !== 'string' || !STATUSES.includes(status))) {
        return reply.code(400).send(msg('Bộ lọc trạng thái không hợp lệ.', 'Invalid status filter.'));
      }
      let query = supabase.from('exam_blueprints').select(COLUMNS);
      if (!isAdmin(user)) query = query.eq('created_by', user.id);
      if (status) query = query.eq('status', status);
      const { data, error } = await query.order('updated_at', { ascending: false }).limit(200);
      if (error) {
        request.log.error({ err: error }, 'Failed to list exams');
        return reply.code(500).send(msg('Không tải được danh sách đề thi.', 'Could not load the exams.'));
      }
      return reply.send({ exams: ((data ?? []) as ExamRow[]).map((row) => present(row, user)) });
    },
  });

  app.get('/api/authoring/exams/:id', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      if (!app.supabase) return reply.code(503).send(unavailable);
      const user = getUser(request)!;
      const found = await loadExam(app.supabase, request, user);
      if ('status' in found) return reply.code(found.status).send(found.body);
      return reply.send({ exam: present(found.row, user) });
    },
  });

  app.post('/api/authoring/exams', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request)!;
      if (!supabase) return reply.code(503).send(unavailable);
      const { publish, ...body } = (request.body ?? {}) as Record<string, unknown>;
      const checked = validateExamInput(body, 'create');
      if (!checked.ok) return reply.code(400).send(msg(checked.message.vi, checked.message.en));
      const input = checked.value;
      // An admin may publish on creation ("Xuất bản ngay"); a teacher's exam starts as a draft.
      const publishNow = isAdmin(user) && publish === true;
      if (publishNow && !input.name_en) return reply.code(400).send(needEnglish);
      const questions = await checkExamQuestions(supabase, input.question_ids, { subject_id: input.subject_id, created_by: user.id }, publishNow ? 'review' : 'draft');
      if (!questions.ok) return reply.code(questions.status).send(questions.body);

      const { data, error } = await supabase
        .from('exam_blueprints')
        .insert({
          name: input.name,
          name_en: input.name_en || null,
          subject_id: input.subject_id,
          grade: input.grade,
          duration_minutes: input.duration_minutes,
          question_ids: input.question_ids,
          sections: examSections(questions.rows),
          status: publishNow ? 'published' : 'draft',
          created_by: user.id,
        })
        .select(COLUMNS)
        .single();
      if (error) return writeError(request, reply, error, 'Failed to create exam');
      return reply.code(201).send({ exam: present(data as ExamRow, user) });
    },
  });

  app.patch('/api/authoring/exams/:id', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request)!;
      if (!supabase) return reply.code(503).send(unavailable);
      const found = await loadExam(supabase, request, user);
      if ('status' in found) return reply.code(found.status).send(found.body);
      const { row } = found;
      if (!mayEdit(user, row)) {
        return reply.code(409).send(msg('Đề đang chờ duyệt hoặc đã xuất bản nên không sửa được.', 'The exam is under review or published, so it cannot be edited.'));
      }
      const checked = validateExamInput(request.body ?? {}, 'update');
      if (!checked.ok) return reply.code(400).send(msg(checked.message.vi, checked.message.en));
      const { expected_updated_at: expected, ...patch } = checked.value;
      if (patch.subject_id !== undefined && patch.subject_id !== row.subject_id) {
        return reply.code(400).send(msg('Không đổi được môn của đề đã tạo.', 'An exam’s subject cannot be changed.'));
      }

      const update: Record<string, unknown> = { ...patch };
      delete update.subject_id;
      if (patch.name_en !== undefined) update.name_en = patch.name_en || null;
      // A published exam stays complete: English name, and every question published and complete.
      const live = row.status === 'published';
      if (live && !(patch.name_en ?? row.name_en)) return reply.code(400).send(needEnglish);
      if (patch.question_ids !== undefined || live) {
        const ids = patch.question_ids ?? row.question_ids ?? [];
        const questions = await checkExamQuestions(supabase, ids, { subject_id: row.subject_id, created_by: row.created_by }, live ? 'review' : 'draft');
        if (!questions.ok) return reply.code(questions.status).send(questions.body);
        if (live && questions.rows.some((q) => q.status !== 'published')) {
          return reply.code(400).send(msg('Đề đã xuất bản chỉ dùng câu hỏi đã duyệt.', 'A published exam may only use published questions.'));
        }
        if (patch.question_ids !== undefined) update.sections = examSections(questions.rows);
      }

      const { data, error } = await supabase
        .from('exam_blueprints')
        .update(update)
        .eq('id', row.id)
        .eq('updated_at', expected)
        .select(COLUMNS)
        .maybeSingle();
      if (error) return writeError(request, reply, error, 'Failed to update exam');
      if (!data) {
        return reply.code(409).send(msg('Đề đã được sửa ở nơi khác. Tải lại để xem bản mới.', 'The exam was changed elsewhere. Reload to see the latest version.'));
      }
      return reply.send({ exam: present(data as ExamRow, user) });
    },
  });

  app.delete('/api/authoring/exams/:id', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request)!;
      if (!supabase) return reply.code(503).send(unavailable);
      const found = await loadExam(supabase, request, user);
      if ('status' in found) return reply.code(found.status).send(found.body);
      if (!isAdmin(user) && found.row.status !== 'draft') {
        return reply.code(409).send(msg('Chỉ xóa được đề còn là bản nháp.', 'Only a draft exam can be deleted.'));
      }
      // The exam's questions stay in the bank.
      const { error } = await supabase.from('exam_blueprints').delete().eq('id', found.row.id);
      if (error) {
        request.log.error({ err: error, examId: found.row.id }, 'Failed to delete exam');
        return reply.code(500).send(msg('Không xóa được đề thi.', 'Could not delete the exam.'));
      }
      return reply.code(204).send();
    },
  });
};
