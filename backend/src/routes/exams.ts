import { randomInt } from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkExamQuestions } from '../authoring/examQuestions.js';
import { countBlueprintQuestions } from '../exam/blueprintSummary.js';
import { MAX_EXAM_ANSWERS } from './exam.js';
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

const MAX_DRAW_ROWS = 9;
/** Candidates read per draw row; the draw shuffles within them. */
const DRAW_CANDIDATES = 500;
const DrawSchema = z
  .object({
    subject_id: z.string().regex(ID),
    grade: z.number().int().min(1).max(12).optional(),
    exclude_ids: z.array(z.string().regex(ID)).max(MAX_EXAM_ANSWERS).optional().default([]),
    counts: z
      .array(z.object({ type: z.enum(['mc', 'truefalse', 'short']), difficulty: z.number().int().min(1).max(3), n: z.number().int().min(1).max(MAX_EXAM_ANSWERS) }))
      .min(1)
      .max(MAX_DRAW_ROWS),
  })
  .strict()
  .refine((body) => body.counts.reduce((sum, row) => sum + row.n, 0) + body.exclude_ids.length <= MAX_EXAM_ANSWERS);

/** Fisher–Yates with a cryptographic source, so a teacher cannot predict the draw. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
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
      // An older exam without a list draws from the subject pool: editing its details leaves that alone.
      const poolExam = patch.question_ids === undefined && (row.question_ids ?? []).length === 0;
      if (patch.question_ids !== undefined || (live && !poolExam)) {
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

  app.post('/api/authoring/exams/draw', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const supabase = app.supabase;
      const user = getUser(request)!;
      if (!supabase) return reply.code(503).send(unavailable);
      const parsed = DrawSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send(msg(`Tối đa ${MAX_DRAW_ROWS} dòng và ${MAX_EXAM_ANSWERS} câu mỗi lần bốc.`, `At most ${MAX_DRAW_ROWS} rows and ${MAX_EXAM_ANSWERS} questions per draw.`));
      }
      const body = parsed.data;
      const taken = new Set(body.exclude_ids);
      const drawn: string[] = [];
      const shortfalls: Array<{ type: string; difficulty: number; wanted: number; got: number }> = [];
      for (const row of body.counts) {
        let query = supabase
          .from('questions')
          .select('id')
          .eq('usage', 'exam')
          .eq('subject_id', body.subject_id)
          .eq('type', row.type)
          .eq('difficulty', row.difficulty)
          .or(`status.eq.published,created_by.eq.${user.id}`);
        if (body.grade !== undefined) query = query.or(`grade.is.null,grade.eq.${body.grade}`);
        const { data, error } = await query.limit(DRAW_CANDIDATES);
        if (error) {
          request.log.error({ err: error }, 'Failed to draw exam questions');
          return reply.code(500).send(msg('Không bốc được câu hỏi.', 'Could not draw questions.'));
        }
        const picked = shuffle(((data ?? []) as Array<{ id: string }>).map((q) => q.id).filter((id) => !taken.has(id))).slice(0, row.n);
        for (const id of picked) taken.add(id);
        drawn.push(...picked);
        if (picked.length < row.n) shortfalls.push({ type: row.type, difficulty: row.difficulty, wanted: row.n, got: picked.length });
      }
      return reply.send({ question_ids: drawn, shortfalls });
    },
  });

  /** Move an exam from one status to the next, only if it is still where the caller saw it. */
  const transition = async (
    request: FastifyRequest,
    reply: FastifyReply,
    check: (user: ExamUser, row: ExamRow) => Failure | null,
    from: string[],
    to: { status: string; review_note: string | null },
    review: boolean,
  ) => {
    const supabase = app.supabase;
    const user = getUser(request)!;
    if (!supabase) return reply.code(503).send(unavailable);
    const found = await loadExam(supabase, request, user);
    if ('status' in found) return reply.code(found.status).send(found.body);
    const { row } = found;
    if (row.import_id) {
      return reply.code(409).send(msg('Đề nhập từ Excel được duyệt ở mục "Lượt nhập đề".', 'Imported exams are reviewed with their import batch.'));
    }
    const refused = check(user, row);
    if (refused) return reply.code(refused.status).send(refused.body);
    if (!from.includes(row.status)) return reply.code(409).send(msg('Trạng thái đề không cho phép thao tác này.', 'The exam’s status does not allow this.'));
    if (review) {
      if (!row.name_en) return reply.code(400).send(needEnglish);
      const questions = await checkExamQuestions(supabase, row.question_ids ?? [], { subject_id: row.subject_id, created_by: row.created_by }, 'review');
      if (!questions.ok) return reply.code(questions.status).send(questions.body);
    }
    const { data, error } = await supabase
      .from('exam_blueprints')
      .update(to)
      .eq('id', row.id)
      .eq('status', row.status)
      .select(COLUMNS)
      .maybeSingle();
    if (error) {
      request.log.error({ err: error, examId: row.id }, 'Failed to change exam status');
      return reply.code(500).send(msg('Không đổi được trạng thái đề.', 'Could not change the exam’s status.'));
    }
    if (!data) return reply.code(409).send(msg('Đề vừa được người khác thay đổi. Tải lại trang.', 'The exam was just changed by someone else. Reload the page.'));
    return reply.send({ exam: present(data as ExamRow, user) });
  };
  const adminOnly = (user: ExamUser): Failure | null =>
    isAdmin(user) ? null : { status: 403, body: msg('Chỉ admin mới duyệt đề thi.', 'Only admins review exams.') };

  app.post('/api/authoring/exams/:id/submit', {
    preHandler: [requireAuthor],
    handler: (request, reply) =>
      transition(
        request,
        reply,
        (user, row) => (row.created_by === user.id ? null : { status: 403, body: msg('Chỉ tác giả mới gửi duyệt đề.', 'Only the author submits an exam.') }),
        ['draft'],
        { status: 'pending_review', review_note: null },
        true,
      ),
  });

  // Approve also publishes an admin's own draft ("Xuất bản").
  app.post('/api/authoring/exams/:id/approve', {
    preHandler: [requireAuthor],
    handler: (request, reply) => transition(request, reply, adminOnly, ['draft', 'pending_review'], { status: 'published', review_note: null }, true),
  });

  app.post('/api/authoring/exams/:id/reject', {
    preHandler: [requireAuthor],
    handler: async (request, reply) => {
      const note = (request.body as { note?: unknown } | undefined)?.note;
      if (typeof note !== 'string' || !note.trim() || note.trim().length > 1000) {
        return reply.code(400).send(msg('Cần ghi chú (tối đa 1000 ký tự) khi trả lại đề.', 'A note (up to 1000 characters) is needed to send an exam back.'));
      }
      return transition(request, reply, adminOnly, ['pending_review'], { status: 'draft', review_note: note.trim() }, false);
    },
  });
};
