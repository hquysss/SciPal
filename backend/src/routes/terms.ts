import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { isSubjectArchived, readSubjectArchived, SUBJECT_ARCHIVED } from '../subjects/archived.js';
import { touchStreak } from '../streaks/touchStreak.js';
import { nextReview, REVIEW_GRADES, type ReviewGrade, type ReviewState } from '../terms/review.js';

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
const BATCH_MAX = 200;
const IPA_MAX = 80;
const SAVE_MAX = 200;
/** XP for a due card graded Hard or Good, and the most a learner earns from reviews in a (UTC) day. */
const REVIEW_XP = 2;
const REVIEW_XP_DAILY = 40;

const COLUMNS =
  'id, subject_id, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi, ipa, kind, image_url, image_alt_en, image_alt_vi, image_credit, status, created_by, review_note, reviewed_at, created_at, subjects(slug, name_en, name_vi)';
const KINDS = ['word', 'place'] as const;
const CREDIT_MAX = 200;

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
  kind: (typeof KINDS)[number];
  image_url: string | null;
  image_alt_en: string | null;
  image_alt_vi: string | null;
  image_credit: string | null;
  ipa: string | null;
};

/**
 * The term from a request body, or the bilingual reason it is refused. `imageBase` is the media
 * store's public prefix; a photo must live there (null: no store, so no photo is accepted).
 */
function readTerm(body: Record<string, unknown>, imageBase: string | null): { term: TermInput } | { error: string; error_en: string } {
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
  const kind = text(body.kind) || 'word';
  if (!(KINDS as readonly string[]).includes(kind)) return { error: 'Loại thuật ngữ không hợp lệ.', error_en: 'Unknown term kind.' };
  const imageUrl = text(body.image_url);
  const altEn = text(body.image_alt_en);
  const altVi = text(body.image_alt_vi);
  const credit = text(body.image_credit);
  if (imageUrl) {
    if (!imageBase || !imageUrl.startsWith(imageBase)) {
      return { error: 'Ảnh phải được tải lên SciPal.', error_en: 'Upload the image to SciPal.' };
    }
    if (!altEn || !altVi || altEn.length > TEXT_MAX || altVi.length > TEXT_MAX) {
      return { error: 'Hãy mô tả ảnh bằng cả hai thứ tiếng.', error_en: 'Describe the image in both languages.' };
    }
  }
  if (credit.length > CREDIT_MAX) return { error: 'Nguồn ảnh tối đa 200 ký tự.', error_en: 'The image credit is up to 200 characters.' };
  // Written with or without the slashes; stored without them.
  const ipa = text(body.ipa).replace(/^\/+|\/+$/g, '').trim();
  if (ipa.length > IPA_MAX) return { error: 'IPA tối đa 80 ký tự.', error_en: 'IPA is up to 80 characters.' };
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
      kind: kind as TermInput['kind'],
      image_url: imageUrl || null,
      image_alt_en: imageUrl ? altEn : null,
      image_alt_vi: imageUrl ? altVi : null,
      image_credit: imageUrl && credit ? credit : null,
      ipa: ipa || null,
    },
  };
}

export const termRoutes: FastifyPluginAsync = async (app) => {
  const imageBase = () => app.mediaStore?.publicUrl('') ?? null;
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

  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!getUser(request)?.id) return reply.code(401).send({ error: 'Hãy đăng nhập để lưu sổ từ.', error_en: 'Sign in to keep your word list.' });
  };

  // The learner's word list. Ids that are not published terms of a live subject are skipped without
  // an error (a list kept in a browser may name terms removed since); saving one twice is a no-op.
  app.post('/api/me/terms', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const ids = ((request.body ?? {}) as { term_ids?: unknown }).term_ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > SAVE_MAX || !ids.every((id) => typeof id === 'string' && ID.test(id))) {
      return reply.code(400).send({ error: `Gửi từ 1 đến ${SAVE_MAX} thuật ngữ mỗi lượt.`, error_en: `Send 1 to ${SAVE_MAX} terms at a time.` });
    }
    const failed = { error: 'Chưa lưu được sổ từ.', error_en: 'The word list could not be saved.' };
    const { data, error } = await supabase.from('terms').select('id, subjects!inner(archived_at)').in('id', [...new Set(ids as string[])]).eq('status', 'published');
    if (error) {
      request.log.error({ err: error }, 'Word list term check failed');
      return reply.code(500).send(failed);
    }
    const saved = ((data ?? []) as Array<{ id: string; subjects: unknown }>)
      .filter((row) => !isSubjectArchived(one(row.subjects as { archived_at?: string | null } | null)))
      .map((row) => row.id);
    if (saved.length > 0) {
      const userId = getUser(request)!.id!;
      const { error: saveError } = await supabase
        .from('user_terms')
        .upsert(saved.map((term_id) => ({ user_id: userId, term_id })), { onConflict: 'user_id,term_id', ignoreDuplicates: true });
      if (saveError) {
        request.log.error({ err: saveError }, 'Word list save failed');
        return reply.code(500).send(failed);
      }
    }
    return reply.send({ saved });
  });

  app.delete('/api/me/terms/:termId', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { termId } = request.params as { termId: string };
    if (!ID.test(termId)) return reply.code(204).send();
    const { error } = await supabase.from('user_terms').delete().eq('user_id', getUser(request)!.id!).eq('term_id', termId);
    if (error) {
      request.log.error({ err: error }, 'Word list delete failed');
      return reply.code(500).send({ error: 'Chưa bỏ được thuật ngữ khỏi sổ từ.', error_en: 'The term could not be removed from your word list.' });
    }
    return reply.code(204).send();
  });

  // The learner grades a due card of their word list. The server sets when it is due again and
  // awards XP: only for a due card, never for "again", up to a daily cap. The update is conditioned
  // on the card still being due, so a double submit is graded (and paid) once.
  app.post('/api/me/terms/:termId/review', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { termId } = request.params as { termId: string };
    const grade = ((request.body ?? {}) as { grade?: unknown }).grade;
    if (!(REVIEW_GRADES as readonly unknown[]).includes(grade)) {
      return reply.code(400).send({ error: 'Hãy chọn Quên, Khó hoặc Nhớ.', error_en: 'Choose Again, Hard or Good.' });
    }
    const missing = { error: 'Thuật ngữ này không có trong sổ từ.', error_en: 'This term is not in your word list.' };
    if (!ID.test(termId)) return reply.code(404).send(missing);
    const userId = getUser(request)!.id!;
    const failed = { error: 'Chưa lưu được lượt ôn.', error_en: 'The review could not be saved.' };
    const { data, error } = await supabase
      .from('user_terms')
      .select('interval_days, ease, reps, lapses, due_at, terms(subject_id)')
      .eq('user_id', userId)
      .eq('term_id', termId)
      .maybeSingle();
    if (error) {
      request.log.error({ err: error }, 'Review read failed');
      return reply.code(500).send(failed);
    }
    if (!data) return reply.code(404).send(missing);
    const row = data as ReviewState & { terms: unknown };
    const now = new Date();
    const next = nextReview({ interval_days: row.interval_days, ease: row.ease, reps: row.reps, lapses: row.lapses }, grade as ReviewGrade, now);
    const { data: graded, error: saveError } = await supabase
      .from('user_terms')
      .update(next)
      .eq('user_id', userId)
      .eq('term_id', termId)
      .lte('due_at', now.toISOString())
      .select('term_id');
    if (saveError) {
      request.log.error({ err: saveError }, 'Review save failed');
      return reply.code(500).send(failed);
    }
    if (!Array.isArray(graded) || graded.length === 0) {
      return reply.code(409).send({ error: 'Thẻ này chưa đến hạn ôn.', error_en: 'This card is not due yet.' });
    }

    let xpEarned = 0;
    const subjectId = one(row.terms as { subject_id?: string } | null)?.subject_id;
    if (grade !== 'again' && subjectId) {
      const dayStart = `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
      const { count, error: countError } = await supabase
        .from('xp_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('reason', 'word_review')
        .gte('created_at', dayStart);
      // ponytail: count-then-insert, two parallel reviews at the cap can pass it by one card (2 XP).
      if (!countError && (count ?? 0) * REVIEW_XP < REVIEW_XP_DAILY) {
        const { error: xpError } = await supabase.from('xp_log').insert({ user_id: userId, subject_id: subjectId, delta: REVIEW_XP, reason: 'word_review' });
        if (xpError) request.log.warn({ err: xpError }, 'Review XP insert failed');
        else xpEarned = REVIEW_XP;
      }
    }
    // Any graded due card, "again" included, makes today an active day in that subject.
    const newStreak = subjectId ? await touchStreak(supabase, userId, subjectId, now, request.log) : 0;
    return reply.send({ due_at: next.due_at, xp_earned: xpEarned, new_streak: newStreak });
  });

  app.post('/api/authoring/terms', { preHandler: [requireStaff] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const read = readTerm((request.body ?? {}) as Record<string, unknown>, imageBase());
    if ('error' in read) return reply.code(400).send(read);
    const subject = await readSubjectArchived(supabase, read.term.subject_id);
    if (subject.error) {
      request.log.error({ err: subject.error }, 'Term subject check failed');
      return reply.code(500).send({ error: 'Chưa lưu được thuật ngữ.', error_en: 'The term could not be saved.' });
    }
    if (subject.archived) return reply.code(400).send(SUBJECT_ARCHIVED);

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

  // Many terms at once (pasted from Excel or typed row by row). Each row is checked and saved on its
  // own: a bad or duplicate row is reported and the others still go in.
  app.post('/api/authoring/terms/batch', { preHandler: [requireStaff] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const rows = ((request.body ?? {}) as { terms?: unknown }).terms;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > BATCH_MAX) {
      return reply.code(400).send({ error: `Gửi từ 1 đến ${BATCH_MAX} thuật ngữ mỗi lượt.`, error_en: `Send 1 to ${BATCH_MAX} terms at a time.` });
    }
    const isAdmin = user.app_metadata?.app_role === 'admin';
    const now = new Date().toISOString();
    const base = imageBase();
    const reads = rows.map((row) => readTerm((row ?? {}) as Record<string, unknown>, base));
    // Rows of an archived subject are refused one by one, like any other bad row.
    const subjectIds = [...new Set(reads.flatMap((read) => ('term' in read ? [read.term.subject_id] : [])))];
    const archived = new Set<string>();
    if (subjectIds.length > 0) {
      const { data, error } = await supabase.from('subjects').select('id, archived_at').in('id', subjectIds);
      if (error) {
        request.log.error({ err: error }, 'Term batch subject check failed');
        return reply.code(500).send({ error: 'Chưa lưu được thuật ngữ.', error_en: 'The term could not be saved.' });
      }
      for (const s of (data ?? []) as Array<{ id: string; archived_at?: string | null }>) if (isSubjectArchived(s)) archived.add(s.id);
    }
    const seen = new Set<string>();
    const results: Array<{ index: number; ok: true; id: string } | { index: number; ok: false; error: string; error_en: string }> = [];
    for (const [index, read] of reads.entries()) {
      if ('error' in read) {
        results.push({ index, ok: false, ...read });
        continue;
      }
      if (archived.has(read.term.subject_id)) {
        results.push({ index, ok: false, ...SUBJECT_ARCHIVED });
        continue;
      }
      const key = `${read.term.subject_id}:${read.term.term_en.toLowerCase()}`;
      if (seen.has(key)) {
        results.push({ index, ok: false, error: 'Trùng với một dòng phía trên.', error_en: 'Same term as a row above.' });
        continue;
      }
      seen.add(key);
      const { data, error } = await supabase
        .from('terms')
        .insert({
          ...read.term,
          created_by: user.id,
          status: isAdmin ? 'published' : 'pending',
          ...(isAdmin ? { reviewed_by: user.id, reviewed_at: now } : {}),
        })
        .select('id')
        .single();
      if (!error) results.push({ index, ok: true, id: (data as { id: string }).id });
      else if (error.code === '23505') results.push({ index, ok: false, error: 'Môn này đã có thuật ngữ đó (hoặc đang chờ duyệt).', error_en: 'This subject already has that term (or it is waiting for review).' });
      else if (error.code === '23503') results.push({ index, ok: false, error: 'Môn học không tồn tại.', error_en: 'Unknown subject.' });
      else {
        request.log.error({ err: error, index }, 'Term batch insert failed');
        results.push({ index, ok: false, error: 'Chưa lưu được dòng này.', error_en: 'This row could not be saved.' });
      }
    }
    return reply.send({ results, saved: results.filter((r) => r.ok).length });
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
