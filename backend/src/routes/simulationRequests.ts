import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { BlockSchema, simulationProblem } from '../schemas/blocks.js';
import { isLessonMediaUrl } from '../schemas/simulations.js';

// Simulation requests: a teacher asks for a simulation for one lesson, an admin handles it.
// Status: open → in_progress → done | declined (open may go straight to done or declined).
// Each transition updates only a row still in an allowed status, so two admins acting at once
// cannot both win: the second gets 409 and the first result stays.

interface RequestUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

const STATUSES = ['open', 'in_progress', 'done', 'declined'] as const;
type Status = (typeof STATUSES)[number];
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEXT_MAX = 1000;

const LIST_COLUMNS =
  'id, lesson_id, requested_by, description, reference_url, sketch_url, status, admin_note, result_block, handled_by, created_at, updated_at, lessons!inner(id, title_vi, title_en, subject_id, subjects(slug, name_vi, name_en))';

const notFound = { error: 'Không tìm thấy đề xuất.', error_en: 'Request not found.' };
const conflict = { error: 'Đề xuất vừa được xử lý hoặc đã đổi trạng thái. Tải lại danh sách.', error_en: 'The request was already handled. Reload the list.' };
const unavailable = { error: 'Dịch vụ chưa sẵn sàng.', error_en: 'The service is not available.' };

function getUser(request: FastifyRequest): RequestUser | undefined {
  return (request as FastifyRequest & { user?: RequestUser }).user;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function httpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && value.length <= TEXT_MAX;
  } catch {
    return false;
  }
}

/** A result block the teacher can insert: an interactive block that passes the simulation check. */
function validResultBlock(value: unknown) {
  const parsed = BlockSchema.safeParse(value);
  if (!parsed.success || parsed.data.type !== 'interactive') return null;
  return simulationProblem([parsed.data]) ? null : parsed.data;
}

const one = <T,>(value: T | T[] | null | undefined): T | undefined => (Array.isArray(value) ? value[0] : value ?? undefined);

/** A list row flattened for cards; a stored result that no longer validates is never sent. */
function present(row: Record<string, any>) {
  const lesson = one(row.lessons as Record<string, any> | null);
  const subject = one(lesson?.subjects as Record<string, any> | null);
  const { lessons: _lessons, ...rest } = row;
  return {
    ...rest,
    result_block: row.result_block ? validResultBlock(row.result_block) : null,
    lesson_title_vi: lesson?.title_vi ?? '',
    lesson_title_en: lesson?.title_en ?? '',
    subject_id: lesson?.subject_id ?? null,
    subject_slug: subject?.slug ?? '',
    subject_name_vi: subject?.name_vi ?? '',
    subject_name_en: subject?.name_en ?? '',
  };
}

export const simulationRequestRoutes: FastifyPluginAsync = async (app) => {
  const requireTeacher = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    const role = user?.app_metadata?.app_role;
    if (!user?.id || (role !== 'teacher' && role !== 'admin')) {
      return reply.code(403).send({ error: 'Chỉ giáo viên mới gửi được đề xuất mô phỏng.', error_en: 'Only teachers can request simulations.' });
    }
  };
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    if (!user?.id || user.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send({ error: 'Chỉ admin mới xử lý được đề xuất.', error_en: 'Only admins can handle requests.' });
    }
  };

  app.post('/api/authoring/lessons/:id/simulation-requests', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });

    const body = (request.body ?? {}) as Record<string, unknown>;
    const description = text(body.description);
    const referenceUrl = text(body.reference_url) || undefined;
    const sketchUrl = text(body.sketch_url) || undefined;
    if (!description || description.length > TEXT_MAX) {
      return reply.code(400).send({ error: 'Hãy mô tả mô phỏng cần làm (1–1000 ký tự).', error_en: 'Describe the simulation (1–1000 characters).' });
    }
    if (referenceUrl && !httpsUrl(referenceUrl)) {
      return reply.code(400).send({ error: 'Link tham khảo phải là địa chỉ https.', error_en: 'The reference link must be an https address.' });
    }
    if (sketchUrl && !isLessonMediaUrl(sketchUrl, process.env.MEDIA_PUBLIC_URL)) {
      return reply.code(400).send({ error: 'Ảnh phác thảo phải được tải lên SciPal.', error_en: 'Upload the sketch to SciPal.' });
    }

    const { data: lesson, error: lessonError } = await supabase.from('lessons').select('id, created_by').eq('id', id).maybeSingle();
    if (lessonError) {
      request.log.error({ err: lessonError, lessonId: id }, 'Lesson lookup failed for a simulation request');
      return reply.code(500).send({ error: 'Không kiểm tra được bài giảng.', error_en: 'Could not check the lesson.' });
    }
    const isAdmin = user.app_metadata?.app_role === 'admin';
    if (!lesson || (!isAdmin && lesson.created_by !== user.id)) {
      return reply.code(404).send({ error: 'Không tìm thấy bài giảng.', error_en: 'Lesson not found.' });
    }

    const { data, error } = await supabase
      .from('simulation_requests')
      .insert({
        lesson_id: id,
        requested_by: user.id,
        description,
        reference_url: referenceUrl ?? null,
        sketch_url: sketchUrl ?? null,
        status: 'open',
      })
      .select('*')
      .single();
    if (error) {
      request.log.error({ err: error, lessonId: id }, 'Simulation request insert failed');
      return reply.code(500).send({ error: 'Chưa gửi được đề xuất.', error_en: 'The request could not be sent.' });
    }
    return reply.code(201).send({ request: data });
  });

  app.get('/api/authoring/simulation-requests', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const query = (request.query ?? {}) as Record<string, string | undefined>;
    if (query.status && !(STATUSES as readonly string[]).includes(query.status)) {
      return reply.code(400).send({ error: 'Trạng thái không hợp lệ.', error_en: 'Unknown status.' });
    }
    if ((query.lesson_id && !ID.test(query.lesson_id)) || (query.subject_id && !ID.test(query.subject_id))) {
      return reply.code(400).send({ error: 'Bộ lọc không hợp lệ.', error_en: 'Invalid filter.' });
    }

    let list = supabase.from('simulation_requests').select(LIST_COLUMNS);
    if (user.app_metadata?.app_role !== 'admin') list = list.eq('requested_by', user.id!);
    if (query.lesson_id) list = list.eq('lesson_id', query.lesson_id);
    if (query.status) list = list.eq('status', query.status);
    if (query.subject_id) list = list.eq('lessons.subject_id', query.subject_id);
    const { data, error } = await list.order('created_at', { ascending: false }).limit(200);
    if (error) {
      request.log.error({ err: error }, 'Simulation request list failed');
      return reply.code(500).send({ error: 'Không tải được danh sách đề xuất.', error_en: 'Could not load the requests.' });
    }
    return reply.send({ requests: ((data ?? []) as Array<Record<string, any>>).map(present) });
  });

  app.delete('/api/authoring/simulation-requests/:id', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(404).send(notFound);

    const { data: current, error: readError } = await supabase.from('simulation_requests').select('id, requested_by, status').eq('id', id).maybeSingle();
    if (readError) return reply.code(500).send({ error: 'Không kiểm tra được đề xuất.', error_en: 'Could not check the request.' });
    if (!current || current.requested_by !== user.id) return reply.code(404).send(notFound);
    if (current.status !== 'open') {
      return reply.code(409).send({ error: 'Admin đã nhận xử lý nên không rút lại được.', error_en: 'An admin has taken the request; it cannot be withdrawn.' });
    }
    const { data, error } = await supabase.from('simulation_requests').delete().eq('id', id).eq('requested_by', user.id!).eq('status', 'open').select('id');
    if (error) return reply.code(500).send({ error: 'Chưa rút lại được đề xuất.', error_en: 'The request could not be withdrawn.' });
    if (!Array.isArray(data) || data.length === 0) return reply.code(409).send(conflict);
    return reply.code(204).send();
  });

  app.get('/api/admin/simulation-requests/count', { preHandler: [requireAdmin] }, async (_request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const result = (await supabase.from('simulation_requests').select('id', { count: 'exact', head: true }).eq('status', 'open')) as { count?: number | null; error: unknown };
    if (result.error) return reply.code(500).send({ error: 'Không đếm được đề xuất.', error_en: 'Could not count requests.' });
    return reply.send({ open: result.count ?? 0 });
  });

  /** Update a request only while it is in one of `from`; 409 when someone got there first. */
  async function transition(request: FastifyRequest, reply: FastifyReply, from: Status[], patch: Record<string, unknown>) {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(404).send(notFound);
    const now = new Date().toISOString();
    const guarded = supabase
      .from('simulation_requests')
      .update({ ...patch, handled_by: getUser(request)!.id, updated_at: now })
      .eq('id', id);
    const { data, error } = await (from.length === 1 ? guarded.eq('status', from[0]!) : guarded.in('status', from)).select('*').maybeSingle();
    if (error) {
      request.log.error({ err: error, requestId: id }, 'Simulation request transition failed');
      return reply.code(500).send({ error: 'Chưa lưu được thao tác.', error_en: 'The change could not be saved.' });
    }
    if (data) return reply.send({ request: data });
    const { data: existing } = await supabase.from('simulation_requests').select('id, status').eq('id', id).maybeSingle();
    return existing ? reply.code(409).send(conflict) : reply.code(404).send(notFound);
  }

  app.post('/api/admin/simulation-requests/:id/accept', { preHandler: [requireAdmin] }, async (request, reply) =>
    transition(request, reply, ['open'], { status: 'in_progress' }),
  );

  app.post('/api/admin/simulation-requests/:id/decline', { preHandler: [requireAdmin] }, async (request, reply) => {
    const note = text(((request.body ?? {}) as Record<string, unknown>).note);
    if (!note || note.length > TEXT_MAX) {
      return reply.code(400).send({ error: 'Hãy ghi lý do từ chối (1–1000 ký tự).', error_en: 'Give a reason (1–1000 characters).' });
    }
    return transition(request, reply, ['open', 'in_progress'], { status: 'declined', admin_note: note });
  });

  app.post('/api/admin/simulation-requests/:id/complete', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const block = validResultBlock(body.result_block);
    if (!block) {
      const detail = BlockSchema.safeParse(body.result_block);
      const problem = detail.success ? simulationProblem([detail.data]) : null;
      return reply.code(400).send(problem ?? { error: 'Kết quả phải là một khối mô phỏng hợp lệ.', error_en: 'The result must be a valid simulation block.' });
    }
    const note = text(body.note);
    if (note && note.length > TEXT_MAX) return reply.code(400).send({ error: 'Ghi chú tối đa 1000 ký tự.', error_en: 'The note is at most 1000 characters.' });
    return transition(request, reply, ['open', 'in_progress'], { status: 'done', result_block: block, admin_note: note || null });
  });
};
