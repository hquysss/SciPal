import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

// Glossary terms written by staff. An admin's term is published at once; a teacher's is 'pending'
// until an admin approves it or turns it down with a reason. A review only changes a term that is
// still pending, so two admins acting at once cannot both win: the second gets 409.

interface RequestUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

const STATUSES = ['pending', 'published', 'rejected'] as const;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TERM_MAX = 120;
const TEXT_MAX = 1000;

const COLUMNS =
  'id, subject_id, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi, status, created_by, review_note, reviewed_at, created_at, subjects(slug, name_en, name_vi)';

const notFound = { error: 'Không tìm thấy thuật ngữ.', error_en: 'Term not found.' };
const conflict = { error: 'Thuật ngữ vừa được xử lý. Tải lại danh sách.', error_en: 'The term was already handled. Reload the list.' };
const unavailable = { error: 'Dịch vụ chưa sẵn sàng.', error_en: 'The service is not available.' };

function getUser(request: FastifyRequest): RequestUser | undefined {
  return (request as FastifyRequest & { user?: RequestUser }).user;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const one = <T,>(value: T | T[] | null | undefined): T | undefined => (Array.isArray(value) ? value[0] : value ?? undefined);

function present(row: Record<string, any>) {
  const subject = one(row.subjects as Record<string, any> | null);
  const { subjects: _subjects, ...rest } = row;
  return { ...rest, subject_slug: subject?.slug ?? '', subject_name_en: subject?.name_en ?? '', subject_name_vi: subject?.name_vi ?? '' };
}

type TermInput = {
  subject_id: string;
  term_en: string;
  term_vi: string;
  part_of_speech: string | null;
  definition_en: string;
  definition_vi: string;
  example_en: string | null;
  example_vi: string | null;
};

/** The term from a request body, or the bilingual reason it is refused. */
function readTerm(body: Record<string, unknown>): { term: TermInput } | { error: string; error_en: string } {
  const subjectId = text(body.subject_id);
  if (!ID.test(subjectId)) return { error: 'Hãy chọn môn học.', error_en: 'Choose a subject.' };
  const termEn = text(body.term_en);
  const termVi = text(body.term_vi);
  if (!termEn || !termVi || termEn.length > TERM_MAX || termVi.length > TERM_MAX) {
    return { error: 'Hãy nhập thuật ngữ bằng cả tiếng Anh và tiếng Việt (tối đa 120 ký tự).', error_en: 'Enter the term in both English and Vietnamese (up to 120 characters).' };
  }
  const defEn = text(body.definition_en);
  const defVi = text(body.definition_vi);
  if (!defEn || !defVi || defEn.length > TEXT_MAX || defVi.length > TEXT_MAX) {
    return { error: 'Hãy nhập định nghĩa bằng cả hai thứ tiếng (tối đa 1000 ký tự).', error_en: 'Enter the definition in both languages (up to 1000 characters).' };
  }
  const exEn = text(body.example_en);
  const exVi = text(body.example_vi);
  const pos = text(body.part_of_speech);
  if (exEn.length > TEXT_MAX || exVi.length > TEXT_MAX || pos.length > 40) {
    return { error: 'Ví dụ tối đa 1000 ký tự, từ loại tối đa 40 ký tự.', error_en: 'Examples are up to 1000 characters, part of speech up to 40.' };
  }
  return {
    term: {
      subject_id: subjectId,
      term_en: termEn,
      term_vi: termVi,
      part_of_speech: pos || null,
      definition_en: defEn,
      definition_vi: defVi,
      example_en: exEn || null,
      example_vi: exVi || null,
    },
  };
}

export const termRoutes: FastifyPluginAsync = async (app) => {
  const requireStaff = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    const role = user?.app_metadata?.app_role;
    if (!user?.id || (role !== 'teacher' && role !== 'admin')) {
      return reply.code(403).send({ error: 'Chỉ giáo viên và admin mới thêm được thuật ngữ.', error_en: 'Only teachers and admins can add terms.' });
    }
  };
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    if (!user?.id || user.app_metadata?.app_role !== 'admin') {
      return reply.code(403).send({ error: 'Chỉ admin mới duyệt được thuật ngữ.', error_en: 'Only admins can review terms.' });
    }
  };

  app.post('/api/authoring/terms', { preHandler: [requireStaff] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const read = readTerm((request.body ?? {}) as Record<string, unknown>);
    if ('error' in read) return reply.code(400).send(read);

    const isAdmin = user.app_metadata?.app_role === 'admin';
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('terms')
      .insert({
        ...read.term,
        created_by: user.id,
        status: isAdmin ? 'published' : 'pending',
        ...(isAdmin ? { reviewed_by: user.id, reviewed_at: now } : {}),
      })
      .select(COLUMNS)
      .single();
    if (error) {
      if (error.code === '23505') {
        return reply.code(409).send({ error: 'Môn này đã có thuật ngữ đó (hoặc đang chờ duyệt).', error_en: 'This subject already has that term (or it is waiting for review).' });
      }
      if (error.code === '23503') return reply.code(400).send({ error: 'Môn học không tồn tại.', error_en: 'Unknown subject.' });
      request.log.error({ err: error }, 'Term insert failed');
      return reply.code(500).send({ error: 'Chưa lưu được thuật ngữ.', error_en: 'The term could not be saved.' });
    }
    return reply.code(201).send({ term: present(data as Record<string, any>) });
  });

  app.get('/api/authoring/terms', { preHandler: [requireStaff] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const { status } = (request.query ?? {}) as { status?: string };
    if (status && !(STATUSES as readonly string[]).includes(status)) {
      return reply.code(400).send({ error: 'Trạng thái không hợp lệ.', error_en: 'Unknown status.' });
    }
    let list = supabase.from('terms').select(COLUMNS);
    // Teachers see their own terms; admins review everyone's.
    if (user.app_metadata?.app_role !== 'admin') list = list.eq('created_by', user.id!);
    if (status) list = list.eq('status', status);
    const { data, error } = await list.order('created_at', { ascending: false }).limit(200);
    if (error) {
      request.log.error({ err: error }, 'Term list failed');
      return reply.code(500).send({ error: 'Không tải được danh sách thuật ngữ.', error_en: 'Could not load the terms.' });
    }
    return reply.send({ terms: ((data ?? []) as Array<Record<string, any>>).map(present) });
  });

  app.delete('/api/authoring/terms/:id', { preHandler: [requireStaff] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(404).send(notFound);
    let del = supabase.from('terms').delete().eq('id', id);
    // A teacher withdraws only their own term, and only before it is published.
    if (user.app_metadata?.app_role !== 'admin') del = del.eq('created_by', user.id!).in('status', ['pending', 'rejected']);
    const { data, error } = await del.select('id');
    if (error) return reply.code(500).send({ error: 'Chưa xoá được thuật ngữ.', error_en: 'The term could not be deleted.' });
    if (!Array.isArray(data) || data.length === 0) return reply.code(404).send(notFound);
    return reply.code(204).send();
  });

  app.get('/api/admin/terms/count', { preHandler: [requireAdmin] }, async (_request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const result = (await supabase.from('terms').select('id', { count: 'exact', head: true }).eq('status', 'pending')) as { count?: number | null; error: unknown };
    if (result.error) return reply.code(500).send({ error: 'Không đếm được thuật ngữ chờ duyệt.', error_en: 'Could not count pending terms.' });
    return reply.send({ pending: result.count ?? 0 });
  });

  /** Review a term only while it is pending; 409 when someone got there first. */
  async function review(request: FastifyRequest, reply: FastifyReply, patch: { status: 'published' | 'rejected'; review_note: string | null }) {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { id } = request.params as { id: string };
    if (!ID.test(id)) return reply.code(404).send(notFound);
    const { data, error } = await supabase
      .from('terms')
      .update({ ...patch, reviewed_by: getUser(request)!.id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select(COLUMNS)
      .maybeSingle();
    if (error) {
      request.log.error({ err: error, termId: id }, 'Term review failed');
      return reply.code(500).send({ error: 'Chưa lưu được thao tác.', error_en: 'The change could not be saved.' });
    }
    if (data) return reply.send({ term: present(data as Record<string, any>) });
    const { data: existing } = await supabase.from('terms').select('id, status').eq('id', id).maybeSingle();
    return existing ? reply.code(409).send(conflict) : reply.code(404).send(notFound);
  }

  app.post('/api/admin/terms/:id/approve', { preHandler: [requireAdmin] }, async (request, reply) =>
    review(request, reply, { status: 'published', review_note: null }),
  );

  app.post('/api/admin/terms/:id/reject', { preHandler: [requireAdmin] }, async (request, reply) => {
    const note = text(((request.body ?? {}) as Record<string, unknown>).note);
    if (!note || note.length > TEXT_MAX) {
      return reply.code(400).send({ error: 'Hãy ghi lý do từ chối (1–1000 ký tự).', error_en: 'Give a reason (1–1000 characters).' });
    }
    return review(request, reply, { status: 'rejected', review_note: note });
  });
};
