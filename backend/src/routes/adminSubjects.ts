import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { SupabaseClient } from '@supabase/supabase-js';

// Admins hide ("delete") a subject and bring it back (migration 20261005200000_subject_archive).
// Archiving only sets subjects.archived_at; lessons, questions, exams, XP and classes are untouched.
// Archive and restore are idempotent: repeating a call keeps the first timestamp / stays restored.

export interface AdminSubject {
  id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  icon: string;
  sort_order: number;
  archived_at: string | null;
  counts: { topics: number; lessons_published: number; lessons_draft: number; questions: number; classes: number };
}

type ErrorBody = { code: string; error: string; error_en: string };
const err = (code: string, error: string, error_en: string): ErrorBody => ({ code, error, error_en });
const FORBIDDEN = err('FORBIDDEN', 'Chỉ quản trị viên mới quản lý được môn học.', 'Only admins can manage subjects.');
const NOT_FOUND = err('SUBJECT_NOT_FOUND', 'Không tìm thấy môn học.', 'Subject not found.');
const INVALID_ID = err('INVALID_SUBJECT_ID', 'Mã môn học không hợp lệ.', 'Invalid subject id.');
const UNAVAILABLE = err('SUBJECTS_UNAVAILABLE', 'Chưa đọc hoặc lưu được môn học. Thử lại sau.', 'Subjects could not be read or saved. Try again later.');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 1000;
const SUBJECT_COLUMNS = 'id, slug, name_en, name_vi, icon, sort_order, archived_at';

type SubjectRow = { id: string; slug: string; name_en: string; name_vi: string; icon: string; sort_order: number; archived_at: string | null };
type CountRow = { subject_id: string; status?: string | null };
type Failure = { message?: string } | null;

const rank = (s: AdminSubject) => (s.archived_at ? 2 : s.counts.lessons_published > 0 ? 0 : 1);

/** Active subjects with a published lesson, then the other active ones, then archived ones; each by sort_order. */
export function sortAdminSubjects(list: AdminSubject[]): AdminSubject[] {
  return [...list].sort((a, b) => rank(a) - rank(b) || a.sort_order - b.sort_order);
}

/** Read every row of a table (PostgREST caps one response at 1000 rows), optionally for one subject. */
async function fetchRows(supabase: SupabaseClient, table: string, columns: string, subjectId?: string): Promise<{ rows: CountRow[]; error: Failure }> {
  const rows: CountRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(columns);
    if (subjectId) query = query.eq('subject_id', subjectId);
    const { data, error } = await query.order('id').range(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error };
    const page = (data ?? []) as unknown as CountRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows, error: null };
  }
}

/** Subject rows plus counts aggregated in memory; `subjectId` narrows every read to one subject. */
async function loadSubjects(supabase: SupabaseClient, subjectId?: string): Promise<{ subjects: AdminSubject[]; error: Failure }> {
  const subjectQuery = supabase.from('subjects').select(SUBJECT_COLUMNS);
  const [subjects, lessons, topics, questions, classes] = await Promise.all([
    subjectId ? subjectQuery.eq('id', subjectId).maybeSingle() : subjectQuery.order('sort_order'),
    fetchRows(supabase, 'lessons', 'subject_id, status', subjectId),
    fetchRows(supabase, 'topics', 'subject_id', subjectId),
    fetchRows(supabase, 'questions', 'subject_id', subjectId),
    fetchRows(supabase, 'class_rooms', 'subject_id', subjectId),
  ]);
  const error = subjects.error ?? lessons.error ?? topics.error ?? questions.error ?? classes.error;
  if (error) return { subjects: [], error };

  const published = new Map<string, number>();
  const draft = new Map<string, number>();
  for (const l of lessons.rows) {
    if (l.status === 'published') published.set(l.subject_id, (published.get(l.subject_id) ?? 0) + 1);
    else if (l.status === 'draft') draft.set(l.subject_id, (draft.get(l.subject_id) ?? 0) + 1);
  }
  const tally = (rows: CountRow[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.subject_id, (m.get(r.subject_id) ?? 0) + 1);
    return m;
  };
  const topicCount = tally(topics.rows);
  const questionCount = tally(questions.rows);
  const classCount = tally(classes.rows);

  const raw = subjectId ? (subjects.data ? [subjects.data] : []) : ((subjects.data ?? []) as unknown[]);
  return {
    error: null,
    subjects: (raw as SubjectRow[]).map((s) => ({
      id: s.id,
      slug: s.slug,
      name_en: s.name_en,
      name_vi: s.name_vi,
      icon: s.icon,
      sort_order: s.sort_order,
      archived_at: s.archived_at ? new Date(s.archived_at).toISOString() : null,
      counts: {
        topics: topicCount.get(s.id) ?? 0,
        lessons_published: published.get(s.id) ?? 0,
        lessons_draft: draft.get(s.id) ?? 0,
        questions: questionCount.get(s.id) ?? 0,
        classes: classCount.get(s.id) ?? 0,
      },
    })),
  };
}

export const adminSubjectRoutes: FastifyPluginAsync = async (app) => {
  const actor = (request: FastifyRequest) => (request as FastifyRequest & { user?: { id?: string; app_metadata?: { app_role?: string } } }).user;
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    if (actor(request)?.app_metadata?.app_role !== 'admin') return reply.code(403).send(FORBIDDEN);
  };

  /** One shared reader for the archive/restore responses. */
  const loadAdminSubject = (id: string) => loadSubjects(app.supabase!, id);

  app.get('/api/admin/subjects', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { subjects, error } = await loadSubjects(app.supabase!);
    if (error) {
      request.log.error({ err: error }, 'Subjects could not be read');
      return reply.code(500).send(UNAVAILABLE);
    }
    return { subjects: sortAdminSubjects(subjects) };
  });

  const change = (archive: boolean) => async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    if (!UUID.test(id)) return reply.code(400).send(INVALID_ID);
    const supabase = app.supabase!;

    const current = await supabase.from('subjects').select('id, archived_at').eq('id', id).maybeSingle();
    if (current.error) {
      request.log.error({ err: current.error }, 'Subject could not be read');
      return reply.code(500).send(UNAVAILABLE);
    }
    if (!current.data) return reply.code(404).send(NOT_FOUND);

    const archivedNow = Boolean((current.data as { archived_at: string | null }).archived_at);
    if (archive !== archivedNow) {
      const update = supabase.from('subjects').update({ archived_at: archive ? new Date().toISOString() : null }).eq('id', id);
      // Archiving only fills an empty timestamp, so a concurrent call cannot overwrite the first one.
      const { error } = await (archive ? update.is('archived_at', null) : update);
      if (error) {
        request.log.error({ err: error }, 'Subject could not be saved');
        return reply.code(500).send(UNAVAILABLE);
      }
    }

    const { subjects, error } = await loadAdminSubject(id);
    if (error) {
      request.log.error({ err: error }, 'Subject could not be read');
      return reply.code(500).send(UNAVAILABLE);
    }
    if (!subjects[0]) return reply.code(404).send(NOT_FOUND);
    return { subject: subjects[0] };
  };

  app.post('/api/admin/subjects/:id/archive', { preHandler: [requireAdmin] }, change(true));
  app.post('/api/admin/subjects/:id/restore', { preHandler: [requireAdmin] }, change(false));
};
